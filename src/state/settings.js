import { SETTINGS_KEY, DEFAULT_SETTINGS } from '../config.js';

// UI preferences, kept apart from the tree data so import/clear never touch them.
export const settings = { ...DEFAULT_SETTINGS, ...read() };

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
    // Only keep known keys with the right type, so stale or edited storage can't break the UI.
    return Object.fromEntries(
      Object.entries(saved).filter(([k, v]) => typeof v === typeof DEFAULT_SETTINGS[k]),
    );
  } catch {
    return {};
  }
}
