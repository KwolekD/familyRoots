import { settings } from '../state/settings.js';
import en from './en.js';
import pl from './pl.js';

const DICTS = { en, pl };
const pluralRules = {};

// Translate `key`, filling {placeholders} from params. `n` also picks the plural form.
export function t(key, params = {}) {
  const lang = settings.lang;
  let s = DICTS[lang]?.[key] ?? en[key] ?? key;
  if (typeof s === 'object') {
    pluralRules[lang] ??= new Intl.PluralRules(lang);
    s = s[pluralRules[lang].select(params.n)] ?? s.other;
  }
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
}

// Static markup carries keys in data attributes; this swaps in the current language.
// data-i18n-html is only for our own dictionary strings, never user text.
export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  document.documentElement.lang = settings.lang;
  document.title = t('app.title');
}
