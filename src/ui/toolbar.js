import { store, replaceState, sanitize } from '../state/store.js';
import { demoData } from '../state/demo.js';
import { $ } from '../utils/dom.js';
import { toast } from './toast.js';

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
    toast(`Imported ${store.state.people.length} people`);
  } catch (err) {
    toast(`Import failed: ${err.message}`, 'error');
  }
}

export function initToolbar() {
  $('#export-btn').addEventListener('click', exportJson);
  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', importJson);

  $('#demo-btn').addEventListener('click', () => {
    if (store.state.people.length && !confirm('Replace the current tree with the demo family?')) return;
    replaceState(demoData());
  });

  $('#clear-btn').addEventListener('click', () => {
    if (!store.state.people.length || !confirm('Remove everyone from the tree?')) return;
    replaceState({ people: [], links: [] });
  });
}
