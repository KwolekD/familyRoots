import { t } from '../i18n/index.js';

// Dates are ISO-style strings at one of three precisions: YYYY, YYYY-MM or YYYY-MM-DD.
// Missing parts come back as null, so callers must not assume a full date.

export function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return y ? { y, m: m || null, d: d || null } : null;
}

const pad = (n) => String(n).padStart(2, '0');

export function shortDate(s) {
  const p = parseDate(s);
  if (!p) return '';
  if (!p.m) return String(p.y);
  return p.d ? `${pad(p.d)}.${pad(p.m)}.${p.y}` : `${pad(p.m)}.${p.y}`;
}

export function longDate(s) {
  const p = parseDate(s);
  if (!p) return '';
  if (!p.m) return String(p.y);
  const d = new Date(2000, p.m - 1, p.d || 1);
  d.setFullYear(p.y);
  const opts = p.d ? { day: 'numeric', month: 'long', year: 'numeric' } : { month: 'long', year: 'numeric' };
  return d.toLocaleDateString(t('locale'), opts);
}

// Compares only the parts both dates have, so "1990" vs "1990-05-10" counts as equal.
export function compareDates(a, b) {
  const x = parseDate(a);
  const y = parseDate(b);
  if (!x || !y) return 0;
  if (x.y !== y.y) return x.y - y.y;
  if (!x.m || !y.m || x.m !== y.m) return x.m && y.m ? x.m - y.m : 0;
  return x.d && y.d ? x.d - y.d : 0;
}

// Number for sorting, or null without a date. compareDates can't sort a list ("1990" equals
// both "1990-03" and "1990-05"), so missing parts count as earliest here.
export function dateSortKey(s) {
  const p = parseDate(s);
  return p ? p.y * 10000 + (p.m || 0) * 100 + (p.d || 0) : null;
}

// Whether the anniversary of `b` has been reached in the year of `e`; null when the dates are too vague to tell.
function anniversaryReached(b, e) {
  if (!b.m || !e.m) return null;
  if (e.m !== b.m) return e.m > b.m;
  if (!b.d || !e.d) return null;
  return e.d >= b.d;
}

// A number, or a "79–80" range string when a missing month/day leaves it uncertain.
export function ageOf(person) {
  const b = parseDate(person.birth);
  if (!b) return null;
  const now = new Date();
  const e = parseDate(person.death) || { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  const age = e.y - b.y;
  const reached = anniversaryReached(b, e);
  if (reached !== null) return reached ? age : age - 1;
  return age <= 0 ? 0 : `${age - 1}–${age}`;
}
