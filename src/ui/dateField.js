import { t } from '../i18n/index.js';
import { parseDate } from '../utils/dates.js';

// Day / month / year inputs instead of <input type="date">, because genealogy dates are
// often known only to the year or month, which the native picker cannot express.

const parts = (root) => ({
  d: root.querySelector('[data-part="d"]'),
  m: root.querySelector('[data-part="m"]'),
  y: root.querySelector('[data-part="y"]'),
});

// Month names come from Intl, so they're rebuilt on a language change.
export function renderMonthOptions(root) {
  const { m } = parts(root);
  const selected = m.value;
  const name = (i) => new Date(2000, i, 1).toLocaleDateString(t('locale'), { month: 'long' });
  m.innerHTML =
    `<option value="">${t('date.month')}</option>` +
    Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${name(i)}</option>`).join('');
  m.value = selected;
}

export function writeDate(root, value) {
  const { d, m, y } = parts(root);
  const p = parseDate(value);
  y.value = p ? p.y : '';
  m.value = p?.m || '';
  d.value = p?.d || '';
}

function validDay(y, m, d) {
  const date = new Date(Date.UTC(2000, m - 1, d));
  date.setUTCFullYear(y);
  return date.getUTCMonth() === m - 1;
}

// Returns { value } with a YYYY / YYYY-MM / YYYY-MM-DD string ('' when blank), or { error } with a message key.
export function readDate(root) {
  const { d, m, y } = parts(root);
  const ys = y.value.trim();
  const ds = d.value.trim();
  const mon = Number(m.value);
  if (!ys && !ds && !mon) return { value: '' };
  if (!ys) return { error: 'date.needYear' };
  if (ds && !mon) return { error: 'date.needMonth' };
  if (!/^\d{1,4}$/.test(ys) || Number(ys) < 1) return { error: 'date.invalid' };
  const year = ys.padStart(4, '0');
  if (!mon) return { value: year };
  const mm = String(mon).padStart(2, '0');
  if (!ds) return { value: `${year}-${mm}` };
  const day = Number(ds);
  if (!/^\d{1,2}$/.test(ds) || day < 1 || !validDay(Number(ys), mon, day)) return { error: 'date.invalid' };
  return { value: `${year}-${mm}-${String(day).padStart(2, '0')}` };
}
