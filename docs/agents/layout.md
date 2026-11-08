# Layout & rendering

All layout code is pure: `(people, links) → positions`. Rendering is SVG, positioned in world coordinates and viewed through `viewBox`.

## Generations (src/layout/generations.js)

`assignGenerations(ids, idx)` → `{ gen: Map<id, row>, ok }`

- **Push**: repeat until stable: each child goes at least 1 row below its parent, and partners share the higher (larger) row. If it hasn't stabilized after `n + 2` passes, the constraints contain a cycle and `ok = false`.
- **Pull**: people with no parents but with children move down to sit right above their highest child (so a married-in spouse's parents don't float at the top). Up to 6 pull/push rounds.
- Rows are normalized to start at 0.

## Positions (src/layout/treeLayout.js)

`computeLayout(people, links)` → `{ pos: Map<id, {x,y}>, adjacent: Set<pairKey> }`. `pos` holds card top-left corners.

Per connected component:

1. **Initial order**: DFS from root people (no parents) in insertion order, visiting partners before children.
2. **Units**: a chain of same-row partners drawn side by side as one block. The chain is walked from its lowest-degree end.
3. **Sweeps** (12): a down pass pulls units toward the mean x of their parents, then an up pass pulls them toward the mean x of their children. During the first 6 sweeps, rows are re-sorted by desired x, and a couple is flipped if that puts each partner nearer their own relatives.
4. **`placeRow`**: resolves overlaps by averaging a forward pass (push right) and a backward pass (push left), then enforces `H_GAP`.

Components are laid out left to right, separated by `COMPONENT_GAP`. `adjacent` lists partner pairs placed next to each other. Edge drawing depends on it.

## Edges (src/render/edges.js)

- Adjacent partners: straight horizontal line plus a circle marker. Non-adjacent partners: a curve arching above the cards.
- Parent → child: orthogonal "elbow" path with rounded corners, turning halfway through the vertical gap.
- If both parents are adjacent partners and share the same `blood` value, a single line drops from the middle of their partner line. Otherwise each parent gets its own line from the bottom of their card.
- Solid vs dotted lines come from the CSS classes `.blood` / `.nonblood` in `styles/tree.css`.

## Scene (src/render/scene.js)

- `layout` = target positions. `shown` = currently drawn positions, which trail the targets during animation.
- `relayout()` recomputes the layout. New people start at an on-screen relative's position and animate out from there. The camera animates to `fitView()` when `fit` is set.
- Animation: one `requestAnimationFrame` loop with cubic ease, `ANIM_MS` long (0 when the *Animations* setting is off, so it jumps in one frame). Each frame, `draw()` sets node transforms, rebuilds every edge path, and sets the `viewBox`.
- `fitView()` reserves room for the details card on screens ≥ 1000px wide and caps the zoom at `MAX_FIT_ZOOM`.
- Zoom limits: `MIN_ZOOM`..`MAX_ZOOM` in config.
- A `ResizeObserver` on the SVG resizes `camera.view` to the new canvas size around the same centre (sidebar toggle, window resize), so zoom is kept and nothing re-fits.

## Performance notes

Edges are rebuilt as an `innerHTML` string on every frame, and the layout runs O(sweeps × units × relatives). This is fine for hundreds of people. Profile before scaling to thousands.
