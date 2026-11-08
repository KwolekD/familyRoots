import { store, commit } from '../state/store.js';
import { addLink } from '../model/relations.js';
import { $ } from '../utils/dom.js';
import { fillPeopleSelects, setBlood, getBlood } from './formHelpers.js';
import { toast } from './toast.js';
import { t } from '../i18n/index.js';

const form = $('#link-form');
const { a, b, type } = form.elements;

export function refreshLinkForm() {
  const count = store.state.people.length;
  fillPeopleSelects([a, b], store.state.people);
  if (a.value === b.value && b.options.length > 1) b.selectedIndex = a.selectedIndex === 0 ? 1 : 0;
  form.hidden = count < 2;
  $('#link-hint').hidden = count >= 2;
}

function onSubmit(e) {
  e.preventDefault();
  const blood = getBlood(form);
  let err;
  if (type.value === 'parent') err = addLink('parent', a.value, b.value, blood);
  else if (type.value === 'child') err = addLink('parent', b.value, a.value, blood);
  else err = addLink('partner', a.value, b.value, blood);
  if (err) return toast(err, 'error');
  commit();
  toast(t('link.added'));
}

export function initLinkForm() {
  type.addEventListener('change', () => setBlood(form, type.value !== 'partner'));
  form.addEventListener('submit', onSubmit);
}
