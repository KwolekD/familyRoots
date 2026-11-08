import { store, on, load, select } from './state/store.js';
import { relayout, highlight, resetScene } from './render/scene.js';
import { initPersonForm, refreshPersonForm } from './ui/personForm.js';
import { initLinkForm, refreshLinkForm } from './ui/linkForm.js';
import { initDetails, renderDetails } from './ui/details.js';
import { initToolbar } from './ui/toolbar.js';
import { initSidebar } from './ui/sidebar.js';
import { initSettingsPanel } from './ui/settingsPanel.js';
import { initPanZoom } from './ui/panZoom.js';
import { settings, onSettings } from './state/settings.js';
import { t, applyTranslations } from './i18n/index.js';
import { $ } from './utils/dom.js';

function updateStatus() {
  const { people, links } = store.state;
  $('#stats').textContent = `${t('count.people', { n: people.length })} \u00b7 ${t('count.links', { n: links.length })}`;
  $('#empty').hidden = people.length > 0;
}

// The details card renders before relayout so the fit can leave room for it.
function refreshAll({ fit = true, animate = true } = {}) {
  refreshPersonForm();
  refreshLinkForm();
  renderDetails();
  relayout({ fit, animate });
  updateStatus();
}

applyTranslations();
initSidebar();
initSettingsPanel();
initPersonForm();
initLinkForm();
initDetails();
initToolbar();
initPanZoom();

on('change', ({ fit }) => refreshAll({ fit }));
on('reset', resetScene);
on('select', () => {
  highlight();
  renderDetails();
});

// Static text is swapped in place; everything rendered from JS is simply rendered again.
let lang = settings.lang;
let fullNames = settings.fullNames;
onSettings(() => {
  if (settings.lang !== lang) {
    lang = settings.lang;
    applyTranslations();
    refreshAll({ fit: false, animate: false });
  }
  // Card width changes, so the whole layout shifts; animate it and re-fit.
  if (settings.fullNames !== fullNames) {
    fullNames = settings.fullNames;
    relayout();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !e.target.closest('input, select')) select(null);
});

store.state = load() || { people: [], links: [] };
refreshAll({ animate: false });
