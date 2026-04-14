const scrapeBtn = document.getElementById("scrapeBtn");
const syncBtn = document.getElementById("syncBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

scrapeBtn.addEventListener("click", () => handleAction(false));
syncBtn.addEventListener("click", () => handleAction(true));

bootstrap();

async function bootstrap() {
  await initializeI18n();
}

async function handleAction(shouldSync) {
  setStatus(t("popupStatusWorking"));
  resultEl.textContent = "";

  try {
    const settings = await getSettings();
    await debugLog(settings, "Popup action started", {
      shouldSync
    });
    const tab = await getActiveTab();
    const scrapeResponse = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_ORDERS" });
    if (!scrapeResponse?.ok) {
      throw new Error(scrapeResponse?.error || "Failed to scrape the current page.");
    }

    const scrapeResult = scrapeResponse.result;
    await debugLog(settings, "Popup received scrape result", {
      count: scrapeResult.count,
      sampleOrder: scrapeResult.orders[0] || null
    });
    if (!shouldSync) {
      setStatus(t("popupStatusScrapeDone", [String(scrapeResult.count)]));
      resultEl.textContent = JSON.stringify(scrapeResult.orders, null, 2);
      return;
    }

    const syncResponse = await chrome.runtime.sendMessage({
      type: "SYNC_ORDERS",
      payload: {
        sourceUrl: scrapeResult.sourceUrl,
        orders: scrapeResult.orders
      }
    });

    if (!syncResponse?.ok) {
      throw new Error(syncResponse?.error || "Sync failed.");
    }

    await debugLog(settings, "Popup received sync result", syncResponse.result);
    setStatus(t("popupStatusSyncDone", [String(syncResponse.result.synced)]));
    resultEl.textContent = JSON.stringify(syncResponse.result, null, 2);
  } catch (error) {
    setStatus(t("popupStatusFailed"));
    resultEl.textContent = normalizeError(error);
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) {
    throw new Error(t("popupErrorNoActiveTab"));
  }
  return tabs[0];
}

function setStatus(text) {
  statusEl.textContent = text;
}

function normalizeError(error) {
  const message = error?.message || String(error);
  if (message.includes("Receiving end does not exist")) {
    return t("popupErrorContentScriptMissing");
  }
  return message;
}

async function getSettings() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response?.ok) {
    return { debugEnabled: false };
  }
  return response.settings;
}

async function debugLog(settings, message, data) {
  if (!settings?.debugEnabled) {
    return;
  }
  console.log(`[ERP Sync][popup] ${message}`, data || {});
  try {
    await chrome.runtime.sendMessage({
      type: "LOG_EVENT",
      payload: {
        level: "debug",
        source: "popup",
        message,
        data
      }
    });
  } catch (error) {
    // Ignore logging failures to avoid affecting user actions.
  }
}
