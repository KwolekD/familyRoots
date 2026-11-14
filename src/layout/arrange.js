import { buildIndex, components } from '../model/graph.js';
import { pairKey } from '../utils/format.js';
import { nodeSize } from './nodeSize.js';

// Manual arrangement: turns a sideways card drag into `rowOrder` ranks (see rowOrder.js).
// `ctx`: { people, links, pos, adjacent, rowOrder }, with pos/adjacent from computeLayout.

// Rows as drawn, per component: { comp, y, units }, units left to right with side-by-side
// partners joined. `unitOf`: id -> unit, and unit.row is its row.
function drawnRows({ people, links, pos, adjacent }) {
  const idx = buildIndex(people, links);
  const rows = new Map();
  components(people, idx).forEach((comp, c) => {
    for (const id of comp) {
      const key = `${c}:${pos.get(id).y}`;
      if (!rows.has(key)) rows.set(key, { comp: c, y: pos.get(id).y, ids: [] });
      rows.get(key).ids.push(id);
    }
  });
  const unitOf = new Map();
  for (const row of rows.values()) {
    row.ids.sort((a, b) => pos.get(a).x - pos.get(b).x);
    row.units = [];
    row.ids.forEach((id, i) => {
      if (i && adjacent.has(pairKey(row.ids[i - 1], id))) row.units.at(-1).members.push(id);
      else row.units.push({ members: [id], row });
    });
    for (const u of row.units) u.members.forEach((m) => unitOf.set(m, u));
  }
  return { idx, rows: [...rows.values()], unitOf };
}

const centre = (u, pos) => (pos.get(u.members[0]).x + pos.get(u.members.at(-1)).x + nodeSize.w) / 2;
const withParents = (u, idx) => u.members.filter((m) => idx.get(m).parents.length);

// Siblings share a family; the layout keeps a family together under its parents.
function family(u, idx) {
  const kids = withParents(u, idx);
  return kids.length ? kids.map((m) => [...idx.get(m).parents].sort().join('+')).join('|') : null;
}

// Pins a row in the given order. A couple linking two families (both spouses have parents)
// is left automatic, so it stays between them, unless it is in `keep` (moved, or the unit
// dropped next to) or was placed before: placed, it joins the family it sits among.
function pin(order, rowOrder, idx, keep = []) {
  order.forEach((x, i) => {
    const placed = keep.includes(x) || x.members.some((m) => Object.hasOwn(rowOrder, m));
    if (withParents(x, idx).length > 1 && !placed) return;
    x.members.forEach((m) => (rowOrder[m] = i));
  });
}

// `u` taken out of its row and put right before (or after) `v`.
function movedNextTo(u, v, before) {
  const order = u.row.units.filter((x) => x !== u);
  order.splice(order.indexOf(v) + (before ? 0 : 1), 0, u);
  return order;
}

// Ids drawn together with `id` (its side-by-side partners), which move with it.
export const dragGroup = (ctx, id) => drawnRows(ctx).unitOf.get(id).members;

// Moves the card of `id` (with its partners) `dx` sideways, among the units of its row.
// Rows above are pinned as drawn, so the move doesn't reshuffle them; rows below follow.
// Children always follow their parents, so a drop past someone of another family can only
// hold if the families swap: then their parents are moved the same way, up to where the
// order is free. Returns false when the drop leaves the order unchanged.
export function moveCard(ctx, id, dx) {
  const { idx, rows, unitOf } = drawnRows(ctx);
  let u = unitOf.get(id);
  const units = u.row.units;
  const others = units.filter((x) => x !== u);
  const c = centre(u, ctx.pos) + dx;
  let slot = others.findIndex((x) => centre(x, ctx.pos) > c);
  if (slot < 0) slot = others.length;
  const from = units.indexOf(u);
  if (slot === from) return false;
  const before = slot < from;
  let v = before ? others[slot] : others[slot - 1];

  for (const row of rows) if (row.comp === u.row.comp && row.y < u.row.y) pin(row.units, ctx.rowOrder, idx);
  for (;;) {
    pin(movedNextTo(u, v, before), ctx.rowOrder, idx, [u, v]);
    const fu = family(u, idx);
    const fv = family(v, idx);
    if (fu === null || fv === null || fu === fv) return true;
    const ku = withParents(u, idx);
    const kv = withParents(v, idx);
    if (ku.length !== 1 || kv.length !== 1) return true;
    const pu = unitOf.get(idx.get(ku[0]).parents[0]);
    const pv = unitOf.get(idx.get(kv[0]).parents[0]);
    if (pu === pv || pu.row !== pv.row) return true;
    u = pu;
    v = pv;
  }
}
