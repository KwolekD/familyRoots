import { esc, personLabel } from '../utils/format.js';

export function fillPeopleSelects(selects, people) {
  const sorted = [...people].sort((a, b) =>
    `${a.surname} ${a.firstNames}`.localeCompare(`${b.surname} ${b.firstNames}`, 'pl'),
  );
  const options = sorted.map((p) => `<option value="${p.id}">${esc(personLabel(p))}</option>`).join('');
  for (const sel of selects) {
    const prev = sel.value;
    sel.innerHTML = options;
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
  }
}

export function setBlood(form, blood) {
  form.querySelector(`input[name="blood"][value="${blood ? 1 : 0}"]`).checked = true;
}

export const getBlood = (form) => form.querySelector('input[name="blood"]:checked').value === '1';
