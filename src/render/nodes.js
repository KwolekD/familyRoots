import { NODE_W, NODE_H, NODE_PAD_RIGHT } from '../config.js';
import { nodeSize } from '../layout/nodeSize.js';
import { settings } from '../state/settings.js';
import { svgEl } from '../utils/dom.js';
import { fullName, familyNameLabel, truncate } from '../utils/format.js';
import { shortDate, ageOf } from '../utils/dates.js';
import { t } from '../i18n/index.js';

const TEXT_X = 26;

const datesLine = (p) =>
  [p.birth && `\u2217 ${shortDate(p.birth)}`, p.death && `\u2020 ${shortDate(p.death)}`].filter(Boolean).join('   ');

// Text widths via canvas; fonts mirror .node .name / .sub / .dates in styles/tree.css.
const ctx = document.createElement('canvas').getContext('2d');
function textWidth(text, font) {
  ctx.font = `${font} ${getComputedStyle(document.body).fontFamily}`;
  return ctx.measureText(text).width;
}

// Shared card width: NODE_W, or wide enough for the longest line of any card when full names are on.
export function cardWidth(people) {
  if (!settings.fullNames) return NODE_W;
  let w = 0;
  for (const p of people) {
    w = Math.max(w, textWidth(fullName(p), '650 14.5px'), textWidth(familyNameLabel(p), 'italic 12px'), textWidth(datesLine(p), '12px'));
  }
  return Math.max(NODE_W, Math.ceil(TEXT_X + w + NODE_PAD_RIGHT));
}

function personCard(p) {
  const full = settings.fullNames;
  const inner = svgEl('g', { class: 'inner' });
  inner.appendChild(svgEl('rect', { class: 'card', width: nodeSize.w, height: NODE_H, rx: 14 }));
  inner.appendChild(svgEl('rect', { class: 'accent', x: 10, y: 12, width: 5, height: NODE_H - 24, rx: 2.5 }));
  inner.appendChild(svgEl('text', { class: 'name', x: TEXT_X, y: 29 }, full ? fullName(p) : truncate(fullName(p), 22)));

  const sub = familyNameLabel(p);
  inner.appendChild(svgEl('text', { class: 'sub', x: TEXT_X, y: 49 }, full ? sub : truncate(sub, 28)));

  const dates = datesLine(p);
  inner.appendChild(
    svgEl('text', { class: dates ? 'dates' : 'dates unknown', x: TEXT_X, y: sub ? 70 : 60 }, dates || t('node.datesUnknown')),
  );

  const age = ageOf(p);
  const ageText = age !== null ? `, ${t(p.death ? 'node.aged' : 'node.age', { n: age })}` : '';
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
