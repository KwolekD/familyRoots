# Architecture & data flow

## Modules

| Folder | Role |
|---|---|
| `src/main.js` | Entry point. Inits UI modules, subscribes to store events, loads saved state (or starts empty). |
| `src/config.js` | Constants: storage keys, default settings, card size, gaps, animation time, zoom limits. |
| `src/state/store.js` | Single global `store` (`state: {people, links, rowOrder}`, `selectedId`), `emptyState()`, tiny event bus, persistence, `sanitize()`. |
| `src/state/settings.js` | UI preferences (`settings`, `setSettings`, `onSettings`, `defaultSettings`), saved under their own localStorage key so import/clear don't touch them. Detects the default language. |
| `src/i18n/` | `t()`, `applyTranslations()`, `en.js` / `pl.js` dictionaries. See [i18n-theme.md](i18n-theme.md). |
| `src/model/graph.js` | Pure graph helpers: `buildIndex`, `components`, `isAncestor`. |
| `src/model/relations.js` | `addLink` (with validation), `toggleLinkBlood`. See [data-model.md](data-model.md). |
| `src/layout/` | `assignGenerations`, `computeLayout`, `moveCard` (manual arrangement). Pure functions with no DOM access. See [layout.md](layout.md). |
| `src/render/` | `scene.js` (camera, animation, relayout), `nodes.js` (person cards), `edges.js` (connector paths), `png.js` (PNG export). |
| `src/ui/` | `sidebar` (tabs, views, collapse), `settingsPanel`, `personForm` (add/edit person + quick-connect), `linkForm` (connect two people), `details` (selected-person card), `toolbar` (export JSON/PNG, import, reset card positions, clear), `panZoom`, `cardDrag`, `toast`, `formHelpers`. |
| `src/utils/` | `dates` (parse, long date, age), `dom` (`$`), `format` (`uid`, `pairKey`, `esc`, `fullName`, labels). |
| `styles/` | `theme.css` (light/dark color tokens), then one CSS file per area: base, sidebar (rail, drawer, option cards), forms (fields, chips, switches), canvas, tree, details, and last `mobile.css` (phone overrides). |

## Sidebar

The UI rule is *one thing at a time*: show a choice first, and fields only after the user picks it.

- An always-visible icon rail with tabs **Tree**, **File**, **Settings** and a collapse button. Clicking the active tab also collapses. Open/closed state and the active tab are stored in `settings`.
- The Tree tab has views (`data-view="menu" | "person" | "link"`). Any element with `data-goto="<view>"` switches view. Call `showView(name)` from code; it also opens the sidebar and the Tree tab. `startAdd` / `startEdit` use it.
- In the person form, the optional fields (`#more-fieldset`) and the quick-connect fields (`#connect-fieldset`) stay hidden behind "+ ..." buttons. A connection is only created when `#connect-fieldset` is open.
- Leaving the person form via Back or Cancel calls `exitEdit()` (resets the form).

## Phone layout

`styles/mobile.css` (≤ 700px, mirrored as `MOBILE_QUERY` in config.js) turns the rail into a bottom tab bar and the drawer into a sheet that slides up over the canvas, so the tree never resizes. The details card becomes a bottom card and is hidden while the sheet is open. `sidebar.js` closes the sheet on phones when the canvas is tapped or the store emits `change` (an action finished), so the result is visible.

App icon: `icons/` (SVG favicon, PNG touch/manifest icons) and `manifest.webmanifest`. The PNGs are renders of `icon.svg`; regenerate them if it changes.

## Settings

`theme`, `lang` (radio groups), `animate`, `fullNames`, `showLegend`, `showStats`, `showZoom` (toggles) in the Settings tab, plus `sidebarOpen`, `sidebarTab`. `settingsPanel.apply()` hides the overlays, sets `body.no-motion` (kills CSS transitions) and `<html data-theme>`. `scene.js` reads `settings.animate` directly. A `fullNames` change re-runs `relayout()` (card width changes; see [layout.md](layout.md)). A `lang` change re-renders all text; see [i18n-theme.md](i18n-theme.md).

## Event flow

The store emits three events (`on(event, fn)` in `store.js`):

- **`change`** `{fit}`: fired by `commit()`. `main.js` → `refreshAll()`: refresh both forms' selects, render details, `relayout()`, update stats.
- **`select`** `id`: fired by `select(id)`. Highlights the node and re-renders details. No relayout.
- **`reset`**: fired by `replaceState()` (import/clear). Clears animated positions so the new tree doesn't animate from the old one.

Typical mutation:

```js
store.state.people.push(person);   // or addLink(...), removePerson(...)
commit();                          // saves to localStorage + emits 'change'
```

`commit({ fit: false })` keeps the current camera (used for small edits).

## Order matters

In `refreshAll`, `renderDetails()` runs **before** `relayout()` because `fitView()` reserves horizontal space for the visible details card.

## Interaction

- Click card → `select`. Double-click (manual timing in `panZoom.js`, 350 ms) → `startEdit`.
- Drag on the canvas pans. A drag threshold of 4px separates drags from clicks. A drag that starts on the **selected** card and mostly sideways moves that card instead (`cardDrag.js`): `previewShift()` draws its unit following the pointer, and on release `moveCard()` writes `state.rowOrder` and commits (or `snapBack()` if the order didn't change). Only the selected card is a handle, so grabbing any other card still pans. A second finger cancels the move. Wheel zooms around the cursor. Two-finger pinch zooms around the midpoint and pans with it; it never counts as a click.
- User pan/zoom sets `camera.locked` so a running animation stops moving the camera.
- `Esc` (outside inputs) deselects.
- Details card buttons: add parent/partner/child (`startAdd`), edit, delete, toggle blood, unlink.
