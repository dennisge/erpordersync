const DEFAULT_SETTINGS = {
  apiUrl: "",
  apiToken: "",
  debugEnabled: false,
  uiLanguage: "auto",
  erpUrlPatterns: [],
  tableSelector: "table",
  syncMode: "batch",
  fieldMappings: {
    orderNo: ["order no", "order_no", "订单号", "单号"],
    customerName: ["customer", "customer name", "客户", "客户名称"],
    amount: ["amount", "total", "total amount", "金额", "总金额"],
    status: ["status", "订单状态", "状态"],
    createdAt: ["created at", "date", "下单时间", "创建时间"]
  },
  extraHeaders: {}
};

const form = document.getElementById("settingsForm");
const saveStatus = document.getElementById("saveStatus");

bootstrap();

async function bootstrap() {
  await initializeI18n();
  await init();
  form.addEventListener("submit", saveSettings);
}

async function init() {
  const stored = await chrome.storage.sync.get("settings");
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {}),
    fieldMappings: {
      ...DEFAULT_SETTINGS.fieldMappings,
      ...((stored.settings || {}).fieldMappings || {})
    },
    extraHeaders: {
      ...DEFAULT_SETTINGS.extraHeaders,
      ...((stored.settings || {}).extraHeaders || {})
    }
  };

  document.getElementById("apiUrl").value = settings.apiUrl;
  document.getElementById("apiToken").value = settings.apiToken;
  document.getElementById("erpUrlPatterns").value = (settings.erpUrlPatterns || []).join("\n");
  document.getElementById("tableSelector").value = settings.tableSelector;
  document.getElementById("syncMode").value = settings.syncMode;
  document.getElementById("debugEnabled").value = String(Boolean(settings.debugEnabled));
  document.getElementById("uiLanguage").value = settings.uiLanguage || "auto";
  document.getElementById("extraHeaders").value = JSON.stringify(settings.extraHeaders || {}, null, 2);
  document.getElementById("fieldMappings").value = JSON.stringify(settings.fieldMappings || {}, null, 2);
}

async function saveSettings(event) {
  event.preventDefault();

  try {
    const previousSettings = await readSettings();
    const settings = {
      apiUrl: document.getElementById("apiUrl").value.trim(),
      apiToken: document.getElementById("apiToken").value.trim(),
      erpUrlPatterns: parseLineList(document.getElementById("erpUrlPatterns").value),
      tableSelector: document.getElementById("tableSelector").value.trim() || "table",
      syncMode: document.getElementById("syncMode").value,
      debugEnabled: document.getElementById("debugEnabled").value === "true",
      uiLanguage: document.getElementById("uiLanguage").value,
      extraHeaders: parseJsonField("extraHeaders"),
      fieldMappings: {
        ...DEFAULT_SETTINGS.fieldMappings,
        ...parseJsonField("fieldMappings")
      }
    };

    await chrome.storage.sync.set({ settings });
    await initializeI18n();
    saveStatus.textContent =
      previousSettings.uiLanguage !== settings.uiLanguage ? t("optionsLanguageChanged") : t("optionsSaveSuccess");
    await logEvent(settings, "配置已保存", {
      apiUrl: settings.apiUrl,
      tableSelector: settings.tableSelector,
      syncMode: settings.syncMode,
      uiLanguage: settings.uiLanguage
    });
  } catch (error) {
    saveStatus.textContent = t("optionsSaveFailed", [error.message]);
  }
}

function parseLineList(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonField(id) {
  const value = document.getElementById(id).value.trim();
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(t("optionsErrorInvalidJson", [id]));
  }
}

async function logEvent(settings, message, data) {
  if (!settings?.debugEnabled) {
    return;
  }

  await chrome.runtime.sendMessage({
    type: "LOG_EVENT",
    payload: {
      level: "debug",
      source: "options",
      message,
      data
    }
  });
}

async function readSettings() {
  const stored = await chrome.storage.sync.get("settings");
  return {
    ...DEFAULT_SETTINGS,
    ...(stored.settings || {})
  };
}
