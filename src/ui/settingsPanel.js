import { DEFAULT_SETTINGS } from '../config.js';
import { settings, setSettings, onSettings } from '../state/settings.js';
import { $ } from '../utils/dom.js';

const form = $('#settings-form');
const KEYS = ['animate', 'showLegend', 'showStats', 'showZoom'];

function apply() {
  for (const k of KEYS) form.elements[k].checked = settings[k];
  $('#legend').hidden = !settings.showLegend;
  $('#stats').hidden = !settings.showStats;
  $('#zoom').hidden = !settings.showZoom;
  document.body.classList.toggle('no-motion', !settings.animate);
}

export function initSettingsPanel() {
  form.addEventListener('change', (e) => {
    if (KEYS.includes(e.target.name)) setSettings({ [e.target.name]: e.target.checked });
  });
  $('#settings-reset').addEventListener('click', () => {
    const defaults = Object.fromEntries(KEYS.map((k) => [k, DEFAULT_SETTINGS[k]]));
    setSettings(defaults);
  });
  onSettings(apply);
  apply();
}
