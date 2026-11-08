# Family Tree App

Browser app for building a family tree. Vanilla JS (ES modules), SVG rendering, CSS. No framework, no bundler, no tests yet. User-facing overview: [README.md](README.md).

## Run

```bash
npm install
npm start        # http-server on http://localhost:5173, cache disabled
```

Must be served over HTTP (ES modules). There is no build or lint step.

## Docs index

Read the relevant file before working in that area. Keep this file short: put details in topic files, not here.

| Topic | File | Read when |
|---|---|---|
| Architecture & data flow | [docs/agents/architecture.md](docs/agents/architecture.md) | touching state, events, UI wiring, adding a module |
| Data model & relationship rules | [docs/agents/data-model.md](docs/agents/data-model.md) | changing person/link fields, validation, import/export, storage |
| Layout & rendering | [docs/agents/layout.md](docs/agents/layout.md) | changing tree positioning, edges, animation, pan/zoom |

## Conventions

- Plain ES modules with relative imports and `.js` extensions. No dependencies at runtime.
- Small focused modules (most under 150 lines). Split rather than grow a file.
- Tunable numbers live in [src/config.js](src/config.js), not inline.
- DOM lookups via `$` from [src/utils/dom.js](src/utils/dom.js). IDs are defined in [index.html](index.html).
- Any user text interpolated into HTML strings goes through `esc()` from [src/utils/format.js](src/utils/format.js).
- Mutate `store.state` then call `commit()`. Never re-render manually from a UI module.
- UI text is English. Sample data uses Polish names.
- Comments explain *why*, briefly.

## Maintaining these docs

- When a change makes a doc wrong, update that doc in the same change.
- When a topic file grows past ~200 lines, split it and add a row to the index above.
- New area of the code with non-obvious behavior → new topic file + index row.
