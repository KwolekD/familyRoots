# Layout & rendering

All layout code is pure: `(people, links) → positions`, except that it reads the shared card width from `nodeSize.w` ([src/layout/nodeSize.js](../../src/layout/nodeSize.js)). Rendering is SVG, positioned in world coordinates and viewed through `viewBox`.

## Card width

Every card has the same width, `nodeSize.w`. It is `NODE_W`, unless the *Full names* setting is on: then `relayout()` sets it via `cardWidth(people)` in `nodes.js`, which measures each card's lines on a canvas (fonts mirror `.node .name/.sub/.dates` in `tree.css`, keep them in sync) and widens all cards to fit the longest one. Names are then not truncated. Layout, edges and `fitView()` must use `nodeSize.w`, never `NODE_W` directly.

## Generations (src/layout/generations.js)

`assignGenerations(ids, idx)` → `{ gen: Map<id, row>, ok }`

- **Push**: repeat until stable: each child goes at least 1 row below its parent, and partners share the higher (larger) row. If it hasn't stabilized after `n + 2` passes, the constraints contain a cycle and `ok = false`.
- **Pull**: people with no parents but with children move down to sit right above their highest child (so a married-in spouse's parents don't float at the top). Up to 6 pull/push rounds.
- Rows are normalized to start at 0.
- **Sibling alignment** (`alignSiblings`, layout only): each person's children are also kept on one row, added group by group as extra constraints in push. A group is dropped when it would make the constraints unsatisfiable (someone married their sibling's child) or the tree too tall: groups that cost no extra rows go first, then the rest while the height stays within `SIBLING_EXTRA_ROWS` of the unaligned height. Without that cap, marriages across generations make the shifts add up (a test tree went from 7 to 46 rows). Validation (`addLink`) leaves alignment off, so it never rejects a link.

## Positions (src/layout/treeLayout.js)

`computeLayout(people, links)` → `{ pos: Map<id, {x,y}>, adjacent: Set<pairKey> }`. `pos` holds card top-left corners.

Per connected component:

1. **Initial order** ([units.js](../../src/layout/units.js)): DFS from root people (no parents) in insertion order, visiting partners before children, children oldest first.
2. **Units** ([units.js](../../src/layout/units.js)): a chain of same-row partners drawn side by side as one block. The chain is walked from its lowest-degree end. A woman and a man with no other partners are put woman left, man right, and marked `fixed`: no later step (sweeps, untangle) flips them, even when that costs a crossing.
3. **Sweeps** (12): a down pass pulls units toward the mean x of their parents, then an up pass pulls them toward the mean x of their children. During the first 6 sweeps, rows are re-sorted by desired x, and a couple is flipped if that puts each partner nearer their own relatives.
4. **`placeRow`**: resolves overlaps by averaging a forward pass (push right) and a backward pass (push left), then enforces `H_GAP`.
5. **Untangle** ([untangle.js](../../src/layout/untangle.js), runs once, after the reorder sweeps): first the manual order is applied to each row (see *Manual arrangement*), then rows are regrouped so each family's children are contiguous and ordered like their sources, and couples linking two families face their own parents (unless `fixed`). Then siblings under the same source point go oldest first (`birthOrder` in [rowOrder.js](../../src/layout/rowOrder.js)), within the slots they already hold; in a group with siblings placed by hand, the others go right after the last placed sibling born before them. Undated siblings, siblings placed by hand, and a sibling married to someone who also has parents in the tree, keep their slots: the latter sits at the end of the group facing the in-laws, since birth order there would cross lines. Then a greedy local search (flip a couple, or move a conflicting unit to any slot in its row, regroup, keep if fewer families interleave), capped at `UNTANGLE_MS`. Works on row order only, not x.
6. **Separate** ([separate.js](../../src/layout/separate.js)): every pair of neighbouring families in a gap (sorted by source x) must keep `FAMILY_GAP` between their spans (source + all children). These are difference constraints between units, added one family pair at a time and solved by pushing units right; a pair that would contradict earlier ones (positive cycle) is skipped. Then re-centering sweeps move each unit toward its relatives only within its constraint slack.

A *family* here matches the edge renderer's grouping (one source point → one row); keep `families()` in sync with `parentSegments()` in edges.js. Couple keys use sorted ids, since the renderer groups by position and doesn't care which parent link was added first. Some trees can't be made overlap-free (e.g. three siblings who each married someone whose parents are in the tree: only two can sit at the ends of the sibling group); lanes handle what's left.

Components are laid out left to right, separated by `COMPONENT_GAP`. `adjacent` lists partner pairs placed next to each other. Edge drawing depends on it.

## Manual arrangement (src/layout/arrange.js, rowOrder.js)

Users can drag the selected card sideways (UI: [cardDrag.js](../../src/ui/cardDrag.js)). Rows still hold generations, so there is no vertical move.

- **Stored** as `state.rowOrder` = `{ personId: rank }`. A drop pins its row as drawn with the card moved (every unit gets its index), and pins every row above it in the same component as drawn, so the automatic untangling can't reshuffle what the user sees above in response. Rows below stay free and follow.
- **Couples linking two families** (both spouses have parents) normally sort between the two families. `pin()` leaves them unpinned unless the user dragged one, dropped a card right next to one, or placed it before. Once pinned, `joinedFamilyKey` puts it in the family it sits among (its nearest single-family neighbours on both sides agree, or only one side is one of its families), so siblings can be dragged past it and it can be dragged among its siblings. Its spouse's line then crosses; the user chose that.
- **Applied** by `applyManualOrder` before each row is regrouped (every untangle regroup, row 0 included): placed units are sorted by rank, and every other unit follows the placed unit it came after, so people added later stay near their relatives. Family grouping runs after it and wins, so manual order holds wherever it doesn't split a family, and the greedy search can't undo it. Children always follow their parents, which is how "move the family below" works.
- **Cross-family drops** (`moveCard`): a family's place comes from its parents, so dropping a card past someone of another family can't hold on its own. Then the same move is repeated one row up with both people's parent units, until the two are in one family, one has no parents, or the parents are the same unit or on different rows.
- `drawnUnits` rebuilds units from the drawn positions (same component, same y, side-by-side partners joined), so the UI needs nothing from the layout's internals.
- *File* → *Reset card positions* clears `rowOrder`.

## Edges (src/render/edges.js)

- Adjacent partners: straight horizontal line plus a circle marker. Non-adjacent partners: a curve arching above the cards.
- Parent → child: orthogonal "elbow" path with rounded corners. Connectors from the same source point into the same row form one family and share one horizontal run.
- **Lanes** ([src/render/lanes.js](../../src/render/lanes.js)): a family's run sits halfway through the vertical gap. When runs of different families overlap horizontally (within `EDGE_LANE_MARGIN`), each family gets its own height ("lane"), spaced evenly inside `V_GAP` minus `EDGE_LANE_PAD` at each end. Otherwise neighbouring sibling groups merge into one line and look like siblings. Lanes are recomputed every frame.
- If both parents are adjacent partners and share the same `blood` value, a single line drops from the middle of their partner line. Otherwise each parent gets its own line from the bottom of their card.
- Solid vs dotted lines come from the CSS classes `.blood` / `.nonblood` in `styles/tree.css`.

## Scene (src/render/scene.js)

- `layout` = target positions. `shown` = currently drawn positions, which trail the targets during animation.
- `relayout()` recomputes the layout. New people start at an on-screen relative's position and animate out from there. The camera animates to `fitView()` when `fit` is set.
- Animation: one `requestAnimationFrame` loop with cubic ease, `ANIM_MS` long (0 when the *Animations* setting is off, so it jumps in one frame). Each frame, `draw()` sets node transforms, rebuilds every edge path, and sets the `viewBox`.
- `fitView()` reserves room for the details card on screens ≥ 1000px wide and caps the zoom at `MAX_FIT_ZOOM`.
- Zoom limits: `MIN_ZOOM`..`MAX_ZOOM` in config.
- Card drag: `currentLayout()`, `previewShift(ids, dx)` (cancels the animation, draws everything at its target and the dragged unit shifted, on top), `snapBack()`.
- A `ResizeObserver` on the SVG resizes `camera.view` to the new canvas size around the same centre (sidebar toggle, window resize), so zoom is kept and nothing re-fits.

## PNG export (src/render/png.js)

- Clones `#tree`, inlines computed styles (CSS classes don't apply to an SVG drawn as an image), sets `viewBox` to the bbox of `#edges` + `#nodes` plus `PNG_PAD`, then draws it on a canvas filled with `--bg`. Uses the current theme.
- Scale is `PNG_SCALE` px per unit, shrunk for big trees so the canvas stays under `PNG_MAX_SIDE` / `PNG_MAX_PIXELS`. The whole tree is always included, whatever the camera shows.
- The selection highlight and `<title>` tooltips are left out.
- A new CSS property in tree styles must be added to `PROPS`, or the export won't show it.

## Performance notes

Edges are rebuilt as an `innerHTML` string on every frame, and the layout runs O(sweeps × units × relatives). This is fine for hundreds of people. Profile before scaling to thousands.
