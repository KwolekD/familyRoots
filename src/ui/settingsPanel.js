import { settings, setSettings, onSettings, defaultSettings } from '../state/settings.js';
import { $ } from '../utils/dom.js';

const form = $('#settings-form');
const TOGGLES = ['animate', 'showLegend', 'showStats', 'showZoom'];
const CHOICES = ['theme', 'lang'];
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

// Always resolve to an explicit light/dark so the CSS only needs one dark palette.
function applyTheme() {
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && darkQuery.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function apply() {
  for (const k of TOGGLES) form.elements[k].checked = settings[k];
  for (const k of CHOICES) form.elements[k].value = settings[k];
  $('#legend').hidden = !settings.showLegend;
  $('#stats').hidden = !settings.showStats;
  $('#zoom').hidden = !settings.showZoom;
  document.body.classList.toggle('no-motion', !settings.animate);
  applyTheme();
}

export function initSettingsPanel() {
  form.addEventListener('change', (e) => {
    const { name } = e.target;
    if (TOGGLES.includes(name)) setSettings({ [name]: e.target.checked });
    else if (CHOICES.includes(name)) setSettings({ [name]: e.target.value });
  });
  $('#settings-reset').addEventListener('click', () => {
    const keys = [...TOGGLES, ...CHOICES];
    setSettings(Object.fromEntries(keys.map((k) => [k, defaultSettings[k]])));
  });
  darkQuery.addEventListener('change', applyTheme);
  onSettings(apply);
  apply();
}
