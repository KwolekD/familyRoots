// Dates are stored as ISO strings (YYYY-MM-DD) straight from <input type="date">.

export function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return y ? { y, m, d } : null;
}

export function shortDate(s) {
  const p = parseDate(s);
  return p ? `${String(p.d).padStart(2, '0')}.${String(p.m).padStart(2, '0')}.${p.y}` : '';
}

export function longDate(s) {
  const p = parseDate(s);
  if (!p) return '';
  const d = new Date(2000, p.m - 1, p.d);
  d.setFullYear(p.y);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ageOf(person) {
  const b = parseDate(person.birth);
  if (!b) return null;
  const now = new Date();
  const e = parseDate(person.death) || { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  let age = e.y - b.y;
  if (e.m < b.m || (e.m === b.m && e.d < b.d)) age--;
  return age;
}
