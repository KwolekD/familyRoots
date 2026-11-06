import { NODE_W, NODE_H } from '../config.js';
import { svgEl } from '../utils/dom.js';
import { fullName, familyNameLabel, truncate } from '../utils/format.js';
import { shortDate, ageOf } from '../utils/dates.js';

function personCard(p) {
  const inner = svgEl('g', { class: 'inner' });
  inner.appendChild(svgEl('rect', { class: 'card', width: NODE_W, height: NODE_H, rx: 14 }));
  inner.appendChild(svgEl('rect', { class: 'accent', x: 10, y: 12, width: 5, height: NODE_H - 24, rx: 2.5 }));
  inner.appendChild(svgEl('text', { class: 'name', x: 26, y: 29 }, truncate(fullName(p), 22)));

  const sub = familyNameLabel(p);
  inner.appendChild(svgEl('text', { class: 'sub', x: 26, y: 49 }, truncate(sub, 28)));

  const dates = [p.birth && `\u2217 ${shortDate(p.birth)}`, p.death && `\u2020 ${shortDate(p.death)}`]
    .filter(Boolean)
    .join('   ');
  inner.appendChild(
    svgEl('text', { class: dates ? 'dates' : 'dates unknown', x: 26, y: sub ? 70 : 60 }, dates || 'dates unknown'),
  );

  const age = ageOf(p);
  const ageText = age !== null ? `, ${p.death ? 'aged' : 'age'} ${age}` : '';
  inner.appendChild(svgEl('title', {}, `${fullName(p)}${sub ? ` (${sub})` : ''}${ageText}`));
  return inner;
}

export function renderNodes(container, people, { selectedId, newIds }) {
  container.textContent = '';
  const els = new Map();
  for (const p of people) {
    const cls = ['node', p.gender || 'u'];
    if (p.death) cls.push('deceased');
    if (p.id === selectedId) cls.push('selected');
    if (newIds.has(p.id)) cls.push('new');
    const g = svgEl('g', { class: cls.join(' '), 'data-id': p.id });
    g.appendChild(personCard(p));
    container.appendChild(g);
    els.set(p.id, g);
  }
  return els;
}

export function highlightSelection(els, selectedId) {
  for (const [id, g] of els) g.classList.toggle('selected', id === selectedId);
}
