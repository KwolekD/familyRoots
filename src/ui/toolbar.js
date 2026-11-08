import { store, replaceState, sanitize } from '../state/store.js';
import { $ } from '../utils/dom.js';
import { toast } from './toast.js';
import { t } from '../i18n/index.js';
import { treeToPng } from '../render/png.js';

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportJson() {
  download(new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' }), 'family-tree.json');
}

async function exportPng() {
  if (!store.state.people.length) return toast(t('file.pngEmpty'), 'error');
  try {
    download(await treeToPng(), 'family-tree.png');
  } catch (err) {
    toast(t('file.pngFailed', { msg: err.message }), 'error');
  }
}

async function importJson(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    replaceState(sanitize(JSON.parse(await file.text())));
    toast(t('file.imported', { n: store.state.people.length }));
  } catch (err) {
    toast(t('file.importFailed', { msg: err.message }), 'error');
  }
}

export function initToolbar() {
  $('#export-btn').addEventListener('click', exportJson);
  $('#export-png-btn').addEventListener('click', exportPng);
  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', importJson);

  $('#clear-btn').addEventListener('click', () => {
    if (!store.state.people.length || !confirm(t('file.confirmClear'))) return;
    replaceState({ people: [], links: [] });
  });
}
