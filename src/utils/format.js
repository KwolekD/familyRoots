import { parseDate } from './dates.js';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '\u2026' : s);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const fullName = (p) => `${p.firstNames} ${p.surname}`.trim();

export function familyNameLabel(p) {
  if (!p.familyName || p.familyName === p.surname) return '';
  const prefix = p.gender === 'f' ? 'z domu' : p.gender === 'm' ? 'z domu' : 'born';
  return `${prefix} ${p.familyName}`;
}

export function personLabel(p) {
  const year = parseDate(p.birth)?.y;
  return `${p.surname}, ${p.firstNames}${year ? ` (${year})` : ''}`;
}
