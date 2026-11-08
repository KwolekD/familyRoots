import { SETTINGS_KEY, DEFAULT_SETTINGS, LANGUAGES, THEMES } from '../config.js';

// First supported language from the browser's preference list, e.g. "pl-PL" -> "pl".
function browserLang() {
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  for (const tag of prefs) {
    const code = tag.toLowerCase().split('-')[0];
    if (LANGUAGES.includes(code)) return code;
  }
  return DEFAULT_SETTINGS.lang;
}

export const defaultSettings = { ...DEFAULT_SETTINGS, lang: browserLang() };

const ALLOWED = { theme: THEMES, lang: LANGUAGES };

// UI preferences, kept apart from the tree data so import/clear never touch them.
export const settings = { ...defaultSettings, ...read() };

const listeners = [];

export const onSettings = (fn) => listeners.push(fn);

export function setSettings(patch) {
  Object.assign(settings, patch);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable */
  }
  for (const fn of listeners) fn(settings);
}

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    // Only keep known keys with the right type (and value, for enums), so stale or edited storage can't break the UI.
    return Object.fromEntries(
      Object.entries(saved).filter(
        ([k, v]) => typeof v === typeof DEFAULT_SETTINGS[k] && (!ALLOWED[k] || ALLOWED[k].includes(v)),
      ),
    );
  } catch {
    return {};
  }
}
