import { store, replaceState, sanitize } from '../state/store.js';
import { demoData } from '../state/demo.js';
import { $ } from '../utils/dom.js';
import { toast } from './toast.js';
import { t } from '../i18n/index.js';

function exportJson() {
  const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'family-tree.json';
  a.click();
  URL.revokeObjectURL(a.href);
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
  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', importJson);

  $('#demo-btn').addEventListener('click', () => {
    if (store.state.people.length && !confirm(t('file.confirmDemo'))) return;
    replaceState(demoData());
  });

  $('#clear-btn').addEventListener('click', () => {
    if (!store.state.people.length || !confirm(t('file.confirmClear'))) return;
    replaceState({ people: [], links: [] });
  });
}
