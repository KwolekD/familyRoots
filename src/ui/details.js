import { store, byId, commit, select, removePerson, removeLink } from '../state/store.js';
import { toggleLinkBlood } from '../model/relations.js';
import { esc, fullName, familyNameLabel } from '../utils/format.js';
import { longDate, ageOf } from '../utils/dates.js';
import { $ } from '../utils/dom.js';
import { startAdd, startEdit } from './personForm.js';
import { toast } from './toast.js';

const panel = $('#details');

function connectionItem(p, l) {
  const other = byId(l.a === p.id ? l.b : l.a);
  const rel = l.type === 'partner' ? 'Partner of' : l.a === p.id ? 'Parent of' : 'Child of';
  return `<li>
    <svg width="22" height="8"><line x1="2" y1="4" x2="20" y2="4" class="ls ${l.blood ? 'blood' : 'nonblood'}"/></svg>
    <span class="rel">${rel}</span>
    <a href="#" data-go="${other.id}" title="${esc(fullName(other))}">${esc(fullName(other))}</a>
    <button type="button" data-toggle="${l.id}" title="Switch between blood and not blood line">${l.blood ? 'Blood' : 'Not blood'}</button>
    <button type="button" data-unlink="${l.id}" title="Remove connection">&times;</button>
  </li>`;
}

export function renderDetails() {
  const p = store.selectedId && byId(store.selectedId);
  if (!p) {
    panel.hidden = true;
    return;
  }
  const age = ageOf(p);
  const initials = (p.firstNames[0] || '') + (p.surname[0] || '');
  const rows = [];
  if (p.familyName) rows.push(['Family name', esc(p.familyName)]);
  rows.push(['Born', p.birth ? esc(longDate(p.birth)) : '<span class="muted">unknown</span>']);
  if (p.death) rows.push(['Died', esc(longDate(p.death))]);
  if (age !== null) rows.push([p.death ? 'Aged' : 'Age', String(age)]);

  const conns = store.state.links
    .filter((l) => l.a === p.id || l.b === p.id)
    .map((l) => connectionItem(p, l))
    .join('');

  panel.innerHTML = `
    <header>
      <div class="avatar ${p.gender}">${esc(initials.toUpperCase())}</div>
      <div>
        <h3>${esc(fullName(p))}</h3>
        <p class="muted">${esc(familyNameLabel(p)) || '&nbsp;'}</p>
      </div>
      <button type="button" class="close" data-action="close" title="Close">&times;</button>
    </header>
    <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <div class="quick">
      <button type="button" data-action="addParent">+ Parent</button>
      <button type="button" data-action="addPartner">+ Partner</button>
      <button type="button" data-action="addChild">+ Child</button>
    </div>
    <h4>Connections</h4>
    ${conns ? `<ul class="conns">${conns}</ul>` : '<p class="muted">No connections yet.</p>'}
    <div class="footer">
      <button type="button" data-action="edit">Edit</button>
      <button type="button" class="danger" data-action="delete">Delete</button>
    </div>`;
  panel.hidden = false;
}

function onClick(e) {
  const t = e.target.closest('[data-action],[data-go],[data-toggle],[data-unlink]');
  if (!t) return;
  e.preventDefault();
  const p = byId(store.selectedId);

  if (t.dataset.go) return select(t.dataset.go);
  if (t.dataset.toggle) {
    const err = toggleLinkBlood(t.dataset.toggle);
    if (err) return toast(err, 'error');
    return commit({ fit: false });
  }
  if (t.dataset.unlink) {
    removeLink(t.dataset.unlink);
    return commit();
  }

  switch (t.dataset.action) {
    case 'close':
      return select(null);
    case 'edit':
      return startEdit(p.id);
    case 'addParent':
      return startAdd('parentOf', p.id);
    case 'addPartner':
      return startAdd('partnerOf', p.id);
    case 'addChild':
      return startAdd('childOf', p.id);
    case 'delete':
      if (confirm(`Delete ${fullName(p)} and all of their connections?`)) {
        removePerson(p.id);
        commit();
        toast(`${fullName(p)} removed`);
      }
  }
}

export function initDetails() {
  panel.addEventListener('click', onClick);
}
