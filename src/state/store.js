import { STORAGE_KEY } from '../config.js';
import { uid } from '../utils/format.js';
import { t } from '../i18n/index.js';

// link.type === 'parent'  -> link.a is a parent of link.b
// link.type === 'partner' -> link.a and link.b are partners
export const store = {
  state: { people: [], links: [] },
  selectedId: null,
};

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
}

function emit(event, payload) {
  for (const fn of listeners.get(event) || []) fn(payload);
}

export const byId = (id) => store.state.people.find((p) => p.id === id);

export function findLink(a, b) {
  return store.state.links.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
}

export function commit({ fit = true } = {}) {
  save();
  emit('change', { fit });
}

export function select(id) {
  store.selectedId = id && byId(id) ? id : null;
  emit('select', store.selectedId);
}

export function replaceState(next) {
  store.state = next;
  store.selectedId = null;
  emit('reset');
  commit();
}

export function removePerson(id) {
  const { state } = store;
  state.people = state.people.filter((p) => p.id !== id);
  state.links = state.links.filter((l) => l.a !== id && l.b !== id);
  if (store.selectedId === id) store.selectedId = null;
}

export function removeLink(id) {
  store.state.links = store.state.links.filter((l) => l.id !== id);
}

// ---------- Persistence ----------

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.state));
  } catch {
    /* storage unavailable (private mode / quota) */
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function sanitize(data) {
  if (!data || !Array.isArray(data.people) || !Array.isArray(data.links)) throw new Error(t('file.invalid'));
  const str = (v) => (typeof v === 'string' ? v : '');
  const people = data.people
    .filter((p) => p && typeof p.id === 'string')
    .map((p) => ({
      id: p.id,
      firstNames: str(p.firstNames),
      surname: str(p.surname),
      familyName: str(p.familyName),
      birth: str(p.birth),
      death: str(p.death),
      gender: ['f', 'm'].includes(p.gender) ? p.gender : '',
    }));
  const ids = new Set(people.map((p) => p.id));
  const links = data.links
    .filter((l) => l && ids.has(l.a) && ids.has(l.b) && l.a !== l.b && ['parent', 'partner'].includes(l.type))
    .map((l) => ({ id: typeof l.id === 'string' ? l.id : uid(), type: l.type, a: l.a, b: l.b, blood: !!l.blood }));
  return { people, links };
}
