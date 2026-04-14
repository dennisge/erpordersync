const debugLogsEl = document.getElementById("debugLogs");
const refreshLogsBtn = document.getElementById("refreshLogsBtn");
const copyLogsBtn = document.getElementById("copyLogsBtn");
const clearLogsBtn = document.getElementById("clearLogsBtn");
const pageStatus = document.getElementById("pageStatus");

refreshLogsBtn.addEventListener("click", loadLogs);
copyLogsBtn.addEventListener("click", copyLogs);
clearLogsBtn.addEventListener("click", clearLogs);

bootstrap();

async function bootstrap() {
  await initializeI18n();
  await loadLogs();
}

async function loadLogs() {
  pageStatus.textContent = t("logStatusLoading");
  const response = await chrome.runtime.sendMessage({ type: "GET_DEBUG_LOGS" });
  if (!response?.ok) {
    pageStatus.textContent = t("logStatusLoadFailed");
    debugLogsEl.textContent = "";
    return;
  }

  const logs = Array.isArray(response.logs) ? response.logs : [];
  pageStatus.textContent = t("logStatusCount", [String(logs.length)]);

  if (!logs.length) {
    debugLogsEl.textContent = t("logEmpty");
    return;
  }

  debugLogsEl.textContent = logs
    .map((log) =>
      [
        `[${log.createdAt}] [${log.level}] [${log.source}] ${log.message}`,
        log.data ? JSON.stringify(log.data, null, 2) : ""
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

async function copyLogs() {
  const text = debugLogsEl.textContent || "";
  if (!text || text === t("logEmpty")) {
    pageStatus.textContent = t("logStatusNoCopy");
    return;
  }

  await navigator.clipboard.writeText(text);
  pageStatus.textContent = t("logStatusCopied");
}

async function clearLogs() {
  const response = await chrome.runtime.sendMessage({ type: "CLEAR_DEBUG_LOGS" });
  if (!response?.ok) {
    pageStatus.textContent = t("logStatusClearFailed");
    return;
  }

  debugLogsEl.textContent = t("logEmpty");
  pageStatus.textContent = t("logStatusCleared");
}
