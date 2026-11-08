# Architecture & data flow

## Modules

| Folder | Role |
|---|---|
| `src/main.js` | Entry point. Inits UI modules, subscribes to store events, loads saved state (or demo). |
| `src/config.js` | Constants: storage keys, default settings, card size, gaps, animation time, zoom limits. |
| `src/state/store.js` | Single global `store` (`state: {people, links}`, `selectedId`), tiny event bus, persistence, `sanitize()`. |
| `src/state/settings.js` | UI preferences (`settings`, `setSettings`, `onSettings`), saved under their own localStorage key so import/clear don't touch them. |
| `src/state/demo.js` | `demoData()`: 15-person, 4-generation sample family. |
| `src/model/graph.js` | Pure graph helpers: `buildIndex`, `components`, `isAncestor`. |
| `src/model/relations.js` | `addLink` (with validation), `toggleLinkBlood`. See [data-model.md](data-model.md). |
| `src/layout/` | `assignGenerations`, `computeLayout`. Pure functions with no DOM access. See [layout.md](layout.md). |
| `src/render/` | `scene.js` (camera, animation, relayout), `nodes.js` (person cards), `edges.js` (connector paths). |
| `src/ui/` | `sidebar` (tabs, views, collapse), `settingsPanel`, `personForm` (add/edit person + quick-connect), `linkForm` (connect two people), `details` (selected-person card), `toolbar` (export/import/demo/clear), `panZoom`, `toast`, `formHelpers`. |
| `src/utils/` | `dates` (parse, long date, age), `dom` (`$`), `format` (`uid`, `pairKey`, `esc`, `fullName`, labels). |
| `styles/` | One CSS file per area: base, sidebar (rail, drawer, option cards), forms (fields, chips, switches), canvas, tree, details. |

## Sidebar

The UI rule is *one thing at a time*: show a choice first, and fields only after the user picks it.

- An always-visible icon rail with tabs **Tree**, **File**, **Settings** and a collapse button. Clicking the active tab also collapses. Open/closed state and the active tab are stored in `settings`.
- The Tree tab has views (`data-view="menu" | "person" | "link"`). Any element with `data-goto="<view>"` switches view. Call `showView(name)` from code; it also opens the sidebar and the Tree tab. `startAdd` / `startEdit` use it.
- In the person form, the optional fields (`#more-fieldset`) and the quick-connect fields (`#connect-fieldset`) stay hidden behind "+ ..." buttons. A connection is only created when `#connect-fieldset` is open.
- Leaving the person form via Back or Cancel calls `exitEdit()` (resets the form).

## Settings

`animate`, `showLegend`, `showStats`, `showZoom` (toggles in the Settings tab) plus `sidebarOpen`, `sidebarTab`. `settingsPanel.apply()` hides the overlays and sets `body.no-motion` (kills CSS transitions). `scene.js` reads `settings.animate` directly.

## Event flow

The store emits three events (`on(event, fn)` in `store.js`):

- **`change`** `{fit}`: fired by `commit()`. `main.js` → `refreshAll()`: refresh both forms' selects, render details, `relayout()`, update stats.
- **`select`** `id`: fired by `select(id)`. Highlights the node and re-renders details. No relayout.
- **`reset`**: fired by `replaceState()` (import/demo/clear). Clears animated positions so the new tree doesn't animate from the old one.

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
- Drag on the canvas pans. A drag threshold of 4px separates drags from clicks. Wheel zooms around the cursor.
- User pan/zoom sets `camera.locked` so a running animation stops moving the camera.
- `Esc` (outside inputs) deselects.
- Details card buttons: add parent/partner/child (`startAdd`), edit, delete, toggle blood, unlink.
