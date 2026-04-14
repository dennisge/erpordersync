const DEFAULT_SETTINGS = {
  apiUrl: "",
  apiToken: "",
  debugEnabled: false,
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
const LOG_STORAGE_KEY = "debugLogs";
const MAX_DEBUG_LOGS = 200;

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get("settings");
  if (!current.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_SETTINGS") {
    getSettings()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SYNC_ORDERS") {
    syncOrders(message.payload, sender)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "LOG_EVENT") {
    getSettings()
      .then((settings) => appendDebugLog(settings, message.payload))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "GET_DEBUG_LOGS") {
    getDebugLogs()
      .then((logs) => sendResponse({ ok: true, logs }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "CLEAR_DEBUG_LOGS") {
    clearDebugLogs()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function getSettings() {
  const stored = await chrome.storage.sync.get("settings");
  return {
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
}

async function syncOrders(payload, sender) {
  const settings = await getSettings();
  debugLog(settings, "Received sync request", {
    sourceUrl: payload?.sourceUrl || sender?.tab?.url || "",
    orderCount: Array.isArray(payload?.orders) ? payload.orders.length : 0,
    syncMode: settings.syncMode
  });
  validateSettings(settings);

  const sourceUrl = payload?.sourceUrl || sender?.tab?.url || "";
  ensureUrlAllowed(settings.erpUrlPatterns, sourceUrl);

  const orders = Array.isArray(payload?.orders) ? payload.orders : [];
  if (!orders.length) {
    throw new Error("No orders found on the current page.");
  }

  const requestHeaders = {
    "Content-Type": "application/json",
    ...settings.extraHeaders
  };

  if (settings.apiToken) {
    requestHeaders.Authorization = `Bearer ${settings.apiToken}`;
  }

  debugLog(settings, "Prepared sync request", {
    apiUrl: settings.apiUrl,
    sourceUrl,
    requestHeaders: maskHeaders(requestHeaders)
  });

  const body =
    settings.syncMode === "single"
      ? null
      : JSON.stringify({
          source: "chrome-extension",
          sourceUrl,
          orderCount: orders.length,
          orders
        });

  if (settings.syncMode === "single") {
    const results = [];
    for (const order of orders) {
      debugLog(settings, "Syncing single order", {
        orderNo: order.orderNo || null
      });
      const response = await fetch(settings.apiUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({
          source: "chrome-extension",
          sourceUrl,
          order
        })
      });
      const responseText = await response.text();
      if (!response.ok) {
        debugLog(settings, "Single order sync failed", {
          orderNo: order.orderNo || null,
          status: response.status,
          responseText
        });
        throw new Error(`Order ${order.orderNo || ""} sync failed: ${response.status} ${responseText}`);
      }
      results.push({
        orderNo: order.orderNo || null,
        status: response.status,
        body: safeParseJson(responseText)
      });
    }
    debugLog(settings, "Single sync completed", {
      synced: orders.length
    });
    return { synced: orders.length, mode: "single", results };
  }

  const response = await fetch(settings.apiUrl, {
    method: "POST",
    headers: requestHeaders,
    body
  });
  const responseText = await response.text();
  if (!response.ok) {
    debugLog(settings, "Batch sync failed", {
      status: response.status,
      responseText
    });
    throw new Error(`Batch sync failed: ${response.status} ${responseText}`);
  }

  debugLog(settings, "Batch sync completed", {
    synced: orders.length,
    responseStatus: response.status,
    responseBody: safeParseJson(responseText)
  });

  return {
    synced: orders.length,
    mode: "batch",
    response: safeParseJson(responseText)
  };
}

function validateSettings(settings) {
  if (!settings.apiUrl) {
    throw new Error("API URL is not configured. Open options and complete the sync settings.");
  }
}

function ensureUrlAllowed(patterns, url) {
  if (!Array.isArray(patterns) || !patterns.length || !url) {
    return;
  }

  const matched = patterns.some((pattern) => {
    try {
      const regex = new RegExp(pattern, "i");
      return regex.test(url);
    } catch (error) {
      return url.includes(pattern);
    }
  });

  if (!matched) {
    throw new Error("Current page does not match the configured ERP URL patterns.");
  }
}

function safeParseJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

function debugLog(settings, message, data) {
  if (!settings?.debugEnabled) {
    return;
  }
  console.log(`[ERP Sync][background] ${message}`, data || {});
  appendDebugLog(settings, {
    level: "debug",
    source: "background",
    message,
    data
  }).catch(() => {});
}

function maskHeaders(headers) {
  const cloned = { ...headers };
  if (cloned.Authorization) {
    cloned.Authorization = "***";
  }
  return cloned;
}

async function appendDebugLog(settings, payload) {
  if (!settings?.debugEnabled) {
    return;
  }

  const current = await chrome.storage.local.get(LOG_STORAGE_KEY);
  const logs = Array.isArray(current[LOG_STORAGE_KEY]) ? current[LOG_STORAGE_KEY] : [];
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    level: payload?.level || "debug",
    source: payload?.source || "unknown",
    message: payload?.message || "",
    data: sanitizeLogData(payload?.data)
  };

  logs.unshift(entry);
  if (logs.length > MAX_DEBUG_LOGS) {
    logs.length = MAX_DEBUG_LOGS;
  }

  await chrome.storage.local.set({
    [LOG_STORAGE_KEY]: logs
  });
}

async function getDebugLogs() {
  const current = await chrome.storage.local.get(LOG_STORAGE_KEY);
  return Array.isArray(current[LOG_STORAGE_KEY]) ? current[LOG_STORAGE_KEY] : [];
}

async function clearDebugLogs() {
  await chrome.storage.local.set({
    [LOG_STORAGE_KEY]: []
  });
}

function sanitizeLogData(data) {
  if (data === null || data === undefined) {
    return null;
  }

  try {
    const cloned = JSON.parse(JSON.stringify(data));
    if (cloned && typeof cloned === "object" && cloned.requestHeaders?.Authorization) {
      cloned.requestHeaders.Authorization = "***";
    }
    return cloned;
  } catch (error) {
    return String(data);
  }
}
