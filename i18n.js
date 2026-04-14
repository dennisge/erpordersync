const APP_SUPPORTED_LOCALES = ["en", "zh_CN"];
const APP_DEFAULT_LOCALE = "en";
const APP_AUTO_LOCALE = "auto";

let currentLocale = APP_DEFAULT_LOCALE;
let currentMessages = {};

async function initializeI18n() {
  currentLocale = await resolveLocale();
  currentMessages = await loadMessages(currentLocale);
  applyI18n();
  return currentLocale;
}

function t(key, substitutions) {
  const entry = currentMessages[key];
  const template = entry?.message || chrome.i18n.getMessage(key, substitutions) || key;
  return formatMessage(template, substitutions);
}

function applyI18n(root = document) {
  document.documentElement.lang = currentLocale === "zh_CN" ? "zh-CN" : "en";

  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }

  for (const node of root.querySelectorAll("[data-i18n-html]")) {
    node.innerHTML = t(node.dataset.i18nHtml);
  }

  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  }

  for (const node of root.querySelectorAll("[data-i18n-title]")) {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  }

  const titleKey = document.body?.dataset?.i18nTitle;
  if (titleKey) {
    document.title = t(titleKey);
  }
}

async function resolveLocale() {
  try {
    const stored = await chrome.storage.sync.get("settings");
    const uiLanguage = stored.settings?.uiLanguage || APP_AUTO_LOCALE;
    return normalizeLocale(uiLanguage);
  } catch (error) {
    return normalizeLocale(APP_AUTO_LOCALE);
  }
}

function normalizeLocale(value) {
  if (!value || value === APP_AUTO_LOCALE) {
    const browserLang = chrome.i18n.getUILanguage().toLowerCase();
    return browserLang.startsWith("zh") ? "zh_CN" : APP_DEFAULT_LOCALE;
  }
  return APP_SUPPORTED_LOCALES.includes(value) ? value : APP_DEFAULT_LOCALE;
}

async function loadMessages(locale) {
  const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
  const response = await fetch(url);
  if (!response.ok) {
    return {};
  }
  return response.json();
}

function formatMessage(template, substitutions) {
  if (!Array.isArray(substitutions) || !substitutions.length) {
    return template;
  }

  return substitutions.reduce(
    (result, value, index) => result.replaceAll(`$${index + 1}`, String(value)).replaceAll(`$${String(index + 1).toUpperCase()}$`, String(value)),
    template
  );
}
