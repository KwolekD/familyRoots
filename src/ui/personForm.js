import { store, byId, commit, on } from '../state/store.js';
import { addLink } from '../model/relations.js';
import { uid, esc, fullName } from '../utils/format.js';
import { $ } from '../utils/dom.js';
import { fillPeopleSelects, setBlood, getBlood } from './formHelpers.js';
import { showView } from './sidebar.js';
import { toast } from './toast.js';

const form = $('#person-form');
const fields = form.elements;
const PERSON_FIELDS = ['firstNames', 'surname', 'familyName', 'birth', 'death', 'gender'];
const ADD_TITLES = { parentOf: 'Add parent', partnerOf: 'Add partner', childOf: 'Add child' };

let editingId = null;

// Optional sections stay behind a "+ ..." button until the user asks for them.
function setMoreOpen(open) {
  $('#more-fieldset').hidden = !open;
  $('#more-open').hidden = open;
}

function setConnectOpen(open) {
  const available = store.state.people.length > 0 && !editingId;
  $('#connect-fieldset').hidden = !(open && available);
  $('#connect-open').hidden = open || !available;
  updateAlsoParents();
}

const connecting = () => !$('#connect-fieldset').hidden;

export function refreshPersonForm() {
  if (editingId && !byId(editingId)) exitEdit();
  fillPeopleSelects([fields.relative], store.state.people);
  setConnectOpen(connecting());
}

function updateAlsoParents() {
  const box = $('#also-parents');
  const rid = fields.relative.value;
  if (!connecting() || fields.relation.value !== 'childOf' || !rid) {
    box.innerHTML = '';
    return;
  }
  const partners = store.state.links
    .filter((l) => l.type === 'partner' && (l.a === rid || l.b === rid))
    .map((l) => byId(l.a === rid ? l.b : l.a));
  box.innerHTML = partners
    .map(
      (p) => `<label class="check"><input type="checkbox" value="${p.id}" ${partners.length === 1 ? 'checked' : ''}>
        Also child of ${esc(fullName(p))}</label>`,
    )
    .join('');
}

function openForm() {
  showView('person');
  fields.firstNames.focus({ preventScroll: true });
}

export function startAdd(relation, relativeId) {
  exitEdit();
  fields.relation.value = relation;
  fields.relative.value = relativeId;
  setBlood(form, relation !== 'partnerOf');
  if (relation === 'childOf') fields.surname.value = byId(relativeId)?.surname || '';
  setConnectOpen(true);
  $('#form-title').textContent = `${ADD_TITLES[relation]} of ${fullName(byId(relativeId))}`;
  openForm();
}

export function startEdit(id) {
  const p = byId(id);
  if (!p) return;
  editingId = id;
  for (const key of PERSON_FIELDS) fields[key].value = p[key] || '';
  $('#form-title').textContent = `Edit ${fullName(p)}`;
  $('#submit-btn').textContent = 'Save changes';
  $('#cancel-edit').hidden = false;
  setMoreOpen(!!(p.familyName || p.death));
  setConnectOpen(false);
  openForm();
}

export function exitEdit() {
  editingId = null;
  form.reset();
  setBlood(form, true);
  $('#form-title').textContent = 'Add person';
  $('#submit-btn').textContent = 'Add to tree';
  $('#cancel-edit').hidden = true;
  setMoreOpen(false);
  setConnectOpen(false);
}

function readPerson() {
  return {
    firstNames: fields.firstNames.value.trim(),
    surname: fields.surname.value.trim(),
    familyName: fields.familyName.value.trim(),
    birth: fields.birth.value,
    death: fields.death.value,
    gender: fields.gender.value,
  };
}

function connectNewPerson(person) {
  const relation = fields.relation.value;
  const relative = fields.relative.value;
  if (!connecting() || !relative) return [];
  const blood = getBlood(form);
  const targets = [relative];
  if (relation === 'childOf') {
    form.querySelectorAll('#also-parents input:checked').forEach((cb) => targets.push(cb.value));
  }
  const problems = [];
  for (const t of targets) {
    let err;
    if (relation === 'childOf') err = addLink('parent', t, person.id, blood);
    else if (relation === 'parentOf') err = addLink('parent', person.id, t, blood);
    else err = addLink('partner', person.id, t, blood);
    if (err) problems.push(err);
  }
  return problems;
}

function onSubmit(e) {
  e.preventDefault();
  const data = readPerson();
  if (!data.firstNames || !data.surname) return toast('First name and surname are required.', 'error');
  if (data.birth && data.death && data.death < data.birth) {
    return toast('Death date cannot be before birth date.', 'error');
  }

  if (editingId) {
    const id = editingId;
    Object.assign(byId(id), data);
    exitEdit();
    showView('menu');
    store.selectedId = id;
    commit({ fit: false });
    return toast('Changes saved');
  }

  const person = { id: uid(), ...data };
  store.state.people.push(person);
  const problems = connectNewPerson(person);
  exitEdit();
  store.selectedId = person.id;
  commit();
  if (problems.length) toast(problems.join(' '), 'error');
  else toast(`${fullName(person)} added to the tree`);
}

function cancel() {
  exitEdit();
  showView('menu');
}

export function initPersonForm() {
  fields.relation.addEventListener('change', () => {
    setBlood(form, fields.relation.value !== 'partnerOf');
    updateAlsoParents();
  });
  fields.relative.addEventListener('change', updateAlsoParents);
  $('#more-open').addEventListener('click', () => setMoreOpen(true));
  $('#connect-open').addEventListener('click', () => {
    setBlood(form, fields.relation.value !== 'partnerOf');
    setConnectOpen(true);
  });
  $('#connect-close').addEventListener('click', () => setConnectOpen(false));
  $('#cancel-edit').addEventListener('click', cancel);
  // Leaving the form discards a half-finished edit or a prefilled "add relative".
  $('#person-back').addEventListener('click', exitEdit);
  form.addEventListener('submit', onSubmit);
  on('reset', exitEdit);
}
