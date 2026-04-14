let cachedOrders = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SCRAPE_ORDERS") {
    scrapeOrders()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "GET_CACHED_ORDERS") {
    sendResponse({ ok: true, result: cachedOrders });
    return false;
  }

  return false;
});

async function scrapeOrders() {
  const settings = await getSettings();
  await debugLog(settings, "Scrape started", {
    url: window.location.href,
    tableSelector: settings.tableSelector
  });
  const table = findTargetTable(settings.tableSelector);
  if (!table) {
    await debugLog(settings, "Target table not found", {
      tableSelector: settings.tableSelector
    });
    throw new Error(`Cannot find order table with selector "${settings.tableSelector}".`);
  }

  const headers = extractHeaders(table);
  const rows = extractRows(table, headers, settings.fieldMappings);
  cachedOrders = rows.filter((row) => Object.keys(row).length > 0);

  await debugLog(settings, "Scrape completed", {
    title: document.title,
    count: cachedOrders.length,
    sampleOrder: cachedOrders[0] || null
  });

  return {
    sourceUrl: window.location.href,
    title: document.title,
    count: cachedOrders.length,
    orders: cachedOrders
  };
}

async function getSettings() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response?.ok) {
    throw new Error(response?.error || "Failed to load plugin settings.");
  }
  return response.settings;
}

function findTargetTable(selector) {
  const explicit = document.querySelector(selector);
  if (explicit) {
    return explicit;
  }

  const tables = Array.from(document.querySelectorAll("table"));
  return tables
    .map((table) => ({
      table,
      score: table.rows.length * Math.max(table.rows[0]?.cells.length || 0, 1)
    }))
    .sort((a, b) => b.score - a.score)[0]?.table || null;
}

function extractHeaders(table) {
  const headRow = table.querySelector("thead tr") || table.querySelector("tr");
  if (!headRow) {
    return [];
  }

  return Array.from(headRow.cells).map((cell, index) => ({
    index,
    raw: normalizeLabel(cell.innerText),
    original: cell.innerText.trim()
  }));
}

function extractRows(table, headers, fieldMappings) {
  const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
  const rows = bodyRows.length ? bodyRows : Array.from(table.querySelectorAll("tr")).slice(1);

  return rows.map((row) => {
    const cells = Array.from(row.cells);
    const record = {};

    for (const header of headers) {
      const cellText = cells[header.index]?.innerText?.trim() || "";
      if (!cellText) {
        continue;
      }

      const fieldName = matchFieldName(header.raw, fieldMappings);
      if (fieldName) {
        record[fieldName] = cellText;
      } else {
        record[header.original || `column_${header.index + 1}`] = cellText;
      }
    }

    if (!record.orderNo) {
      record.orderNo = inferOrderNo(cells);
    }

    return sanitizeRecord(record);
  });
}

function matchFieldName(header, fieldMappings) {
  const entries = Object.entries(fieldMappings || {});
  for (const [field, aliases] of entries) {
    const matched = (aliases || []).some((alias) => header === normalizeLabel(alias));
    if (matched) {
      return field;
    }
  }
  return null;
}

function inferOrderNo(cells) {
  const firstMeaningfulCell = cells
    .map((cell) => cell.innerText.trim())
    .find((text) => /[a-z0-9-]{5,}/i.test(text));

  return firstMeaningfulCell || "";
}

function sanitizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== "")
  );
}

function normalizeLabel(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function debugLog(settings, message, data) {
  if (!settings?.debugEnabled) {
    return;
  }
  console.log(`[ERP Sync][content] ${message}`, data || {});
  try {
    await chrome.runtime.sendMessage({
      type: "LOG_EVENT",
      payload: {
        level: "debug",
        source: "content",
        message,
        data
      }
    });
  } catch (error) {
    // Ignore logging failures to avoid affecting scrape flow.
  }
}
