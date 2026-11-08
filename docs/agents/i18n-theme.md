# Translations & theme

## Translations (`src/i18n/`)

- `en.js`, `pl.js`: flat `key → string` dictionaries. A key missing in `pl` falls back to `en`, then to the key itself.
- `t(key, params)`: fills `{name}` placeholders. If the value is an object, `params.n` picks the plural form via `Intl.PluralRules` (`one`/`other` in English; `one`/`few`/`many`/`other` in Polish).
- `locale` key: the BCP 47 tag used for `toLocaleDateString` (`en-GB`, `pl-PL`).

**Static HTML** carries keys in attributes, and `applyTranslations()` fills them in:

| Attribute | Sets |
|---|---|
| `data-i18n` | `textContent` (put it on a leaf element; it wipes children) |
| `data-i18n-html` | `innerHTML`, only for dictionary strings with markup, never user text |
| `data-i18n-title` / `-placeholder` / `-aria` | `title` / `placeholder` / `aria-label` |

The English text stays in the HTML as the pre-JS fallback.

**JS-rendered text** calls `t()` while rendering. On a language change, `main.js` runs `applyTranslations()` and then `refreshAll({ fit: false, animate: false })`, which re-renders the details card, nodes, stats and the person form heading. Rules for this to work:

- Never cache translated strings at module load. Call `t()` inside the render function.
- Text that depends on state (e.g. the person form heading "Edit {name}") gets a render function called from `refresh*()` (see `renderHeading` in `personForm.js`).
- Or store the key on the element (`el.dataset.i18nTitle = '...'`) so `applyTranslations` picks it up (see the sidebar toggle).
- Toasts and confirms are one-off, so they are not re-translated.
- Names are user text. Escape them with `esc()` when the translated string goes into HTML.

**Default language**: `settings.js` takes the first entry of `navigator.languages` whose primary subtag is in `LANGUAGES` (config.js). Otherwise it uses `en`. Restore defaults re-applies that detection.

Adding a language: create `xx.js`, register it in `DICTS` (`i18n/index.js`), add the code to `LANGUAGES`, and add a radio in the Settings tab.

## Theme

- `settings.theme`: `system | light | dark`. `settingsPanel.applyTheme()` always resolves it to `<html data-theme="light|dark">`, and listens to `prefers-color-scheme` changes for `system`. CSS only needs one dark palette.
- All colors are tokens in `styles/theme.css`, with `:root` for light and `:root[data-theme="dark"]` for dark. Other stylesheets must use tokens, not raw colors. The only exception is white text or icons on accent fills.
- The SVG card shadow color comes from the `--shadow-flood` / `--shadow-opacity` tokens, applied via CSS on `#shadow feDropShadow`.
- An inline script in `<head>` of `index.html` sets `data-theme` before first paint, so dark mode doesn't flash light. It duplicates the settings storage key. Update it if `SETTINGS_KEY` changes.
