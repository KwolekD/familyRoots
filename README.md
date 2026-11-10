# Family Roots

A small web app for building your own family tree in the browser. Add people, connect them as parents, children or partners, and the tree lays itself out automatically by generation.

No framework and no build step: plain HTML, CSS and JavaScript (ES modules), drawn with SVG.

## Features

- Add and edit people: first names, surname, family (birth/maiden) name, birth and death dates, gender
- Connect people as **parent / child** or **partner**, either while adding a person or afterwards
- Mark each connection as **blood** (solid line) or **not blood** (dotted line, e.g. partner, adoption, step-parent)
- Automatic generational layout, with partners placed side by side
- Validation that blocks impossible links (e.g. someone becoming their own ancestor, more than two blood parents)
- Pan, zoom and fit-to-screen on the tree canvas
- Details card for the selected person, showing age and connections
- Saves automatically to `localStorage`
- Export and import the tree as JSON
- Export the whole tree as a PNG image
- English and Polish UI (defaults to your browser language)
- Light and dark theme, or follow the system setting

## Getting started

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npm start
```

This serves the app at http://localhost:5173 and opens it in your browser.

The app uses ES modules, so it has to be served over HTTP. Opening `index.html` directly from disk won't work, but any static file server will.

## Usage

- **Sidebar**: the icon rail on the left has three tabs: *Tree*, *File* and *Settings*. Click the open tab again, or the arrow at the bottom, to hide the sidebar. On a phone the tabs move to a bottom bar and open as a sheet; pinch to zoom the tree. The app can be added to the home screen.
- **Add a person**: *Tree* → *Add a person*. Use *+ More details* for family name and death date, and *+ Connect to a relative* to link the new person straight away.
- **Connect two people**: *Tree* → *Connect two people*.
- **Select**: click a person to open their details card. Press `Esc` to close it.
- **Edit**: double-click a person, or use the details card.
- **Navigate**: drag to pan, scroll to zoom, or use the `+` / `−` / fit buttons.
- **Data**: *Export JSON*, *Export PNG*, *Import JSON* and *Clear all* are in the *File* tab.
- **Settings**: pick the theme (system / light / dark) and language (English / Polski), and turn animations, full names, the line legend, the statistics badge and the zoom buttons on or off.

## Project structure

```
index.html            Page layout and forms
styles/               CSS (theme tokens, base, sidebar, forms, canvas, tree, details)
src/
  main.js             Entry point, wires everything together
  config.js           Layout, zoom and storage constants
  state/              Store, settings, persistence (localStorage)
  i18n/               English and Polish translations
  model/              Graph helpers and relationship rules/validation
  layout/             Generation assignment and tree layout algorithm
  render/             SVG rendering of nodes, edges and the scene/camera
  ui/                 Forms, details card, toolbar, pan/zoom, toasts
  utils/              Date, DOM and formatting helpers
```

## Data format

Exported JSON looks like this:

```json
{
  "people": [
    { "id": "jan", "firstNames": "Jan", "surname": "Kowalski", "familyName": "",
      "birth": "1921-04-12", "death": "1994-11-03", "gender": "m" }
  ],
  "links": [
    { "id": "l1", "type": "parent", "a": "jan", "b": "piotr", "blood": true }
  ]
}
```

- `type: "parent"`: `a` is a parent of `b`
- `type: "partner"`: `a` and `b` are partners
