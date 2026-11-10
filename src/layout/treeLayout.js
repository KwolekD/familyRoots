import { H_GAP, PARTNER_GAP, LAYER_H, COMPONENT_GAP } from '../config.js';
import { nodeSize } from './nodeSize.js';
import { buildIndex, components } from '../model/graph.js';
import { assignGenerations } from './generations.js';
import { pairKey } from '../utils/format.js';
import { separateFamilies } from './separate.js';
import { untangle } from './untangle.js';

const SWEEPS = 12;
const REORDER_SWEEPS = 6;

function initialOrder(ids, idx, insertion) {
  const order = new Map();
  let k = 0;
  const visit = (id) => {
    if (order.has(id)) return;
    order.set(id, k++);
    const n = idx.get(id);
    n.partners.forEach(visit);
    n.children.forEach(visit);
  };
  const sorted = [...ids].sort((a, b) => insertion.get(a) - insertion.get(b));
  sorted.filter((id) => !idx.get(id).parents.length).forEach(visit);
  sorted.forEach(visit);
  return order;
}

// A unit is a chain of partners drawn side by side on one row.
function buildUnits(ids, idx, gen, order) {
  const unitOf = new Map();
  const units = [];
  const sorted = [...ids].sort((a, b) => order.get(a) - order.get(b));
  for (const id of sorted) {
    if (unitOf.has(id)) continue;
    const g = gen.get(id);
    const group = [];
    const inGroup = new Set([id]);
    const stack = [id];
    while (stack.length) {
      const x = stack.pop();
      group.push(x);
      for (const s of idx.get(x).partners) {
        if (!inGroup.has(s) && gen.get(s) === g) {
          inGroup.add(s);
          stack.push(s);
        }
      }
    }
    const degree = (x) => idx.get(x).partners.filter((s) => inGroup.has(s)).length;
    const start = group.reduce((best, x) => (degree(x) < degree(best) ? x : best), group[0]);
    const members = [];
    const visited = new Set();
    const walk = (x) => {
      visited.add(x);
      members.push(x);
      for (const s of idx.get(x).partners) if (inGroup.has(s) && !visited.has(s)) walk(s);
    };
    walk(start);
    const unit = { members, gen: g, x: 0, desired: 0, w: members.length * nodeSize.w + (members.length - 1) * PARTNER_GAP };
    members.forEach((m, i) => unitOf.set(m, { unit, i }));
    units.push(unit);
  }
  return { units, unitOf };
}

// Moves units as close to their desired x as possible without overlapping.
function placeRow(row) {
  const n = row.length;
  if (!n) return;
  const fwd = new Array(n);
  const bwd = new Array(n);
  for (let i = 0; i < n; i++) {
    fwd[i] = i ? Math.max(row[i].desired, fwd[i - 1] + row[i - 1].w + H_GAP) : row[i].desired;
  }
  for (let i = n - 1; i >= 0; i--) {
    bwd[i] = i < n - 1 ? Math.min(row[i].desired, bwd[i + 1] - row[i].w - H_GAP) : row[i].desired;
  }
  for (let i = 0; i < n; i++) {
    let x = (fwd[i] + bwd[i]) / 2;
    if (i) x = Math.max(x, row[i - 1].x + row[i - 1].w + H_GAP);
    row[i].x = x;
  }
}

function layoutComponent(ids, idx, insertion, links) {
  const { gen } = assignGenerations(ids, idx);
  const order = initialOrder(ids, idx, insertion);
  const { units, unitOf } = buildUnits(ids, idx, gen, order);
  const maxGen = Math.max(...units.map((u) => u.gen));
  const rows = Array.from({ length: maxGen + 1 }, () => []);
  for (const u of units) rows[u.gen].push(u);
  for (const row of rows) {
    let x = 0;
    for (const u of row) {
      u.x = x;
      x += u.w + H_GAP;
    }
  }

  const offset = (i) => i * (nodeSize.w + PARTNER_GAP) + nodeSize.w / 2;
  const centerOf = (id) => {
    const { unit, i } = unitOf.get(id);
    return unit.x + offset(i);
  };

  // Per member: the mean centre x of its relatives in `rel` (null if none).
  const targetsOf = (u, rel) =>
    u.members.map((m) => {
      const ns = idx.get(m)[rel];
      return ns.length ? ns.reduce((s, n) => s + centerOf(n), 0) / ns.length : null;
    });
  // Unit x that puts its members closest to their targets on average.
  const desiredOf = (targets) => {
    let sum = 0;
    let cnt = 0;
    targets.forEach((t, i) => {
      if (t !== null) {
        sum += t - offset(i) + nodeSize.w / 2;
        cnt++;
      }
    });
    return cnt ? sum / cnt : null;
  };

  // Pulls each unit towards the average position of its relatives in `rel`.
  const sweep = (row, rel, reorder) => {
    for (const u of row) {
      const targets = targetsOf(u, rel);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (reorder && u.members.length > 1 && first !== null && last !== null && first > last + 1) {
        u.members.reverse();
        targets.reverse();
        u.members.forEach((m, i) => (unitOf.get(m).i = i));
      }
      u.desired = desiredOf(targets) ?? u.x;
    }
    if (reorder) row.sort((a, b) => a.desired + a.w / 2 - (b.desired + b.w / 2));
    placeRow(row);
  };

  const parentLinks = links.filter((l) => l.type === 'parent' && unitOf.has(l.a) && unitOf.has(l.b));
  for (let it = 0; it < SWEEPS; it++) {
    const reorder = it < REORDER_SWEEPS;
    if (it === REORDER_SWEEPS) untangle(rows, units, unitOf, parentLinks, offset);
    for (let g = 1; g <= maxGen; g++) sweep(rows[g], 'parents', reorder);
    for (let g = maxGen - 1; g >= 0; g--) sweep(rows[g], 'children', reorder);
  }

  // Pull families apart so no two connectors overlap, then re-centre within what that allows.
  const cons = separateFamilies(rows, units, unitOf, parentLinks, offset);
  const nudge = (row, rel) => {
    for (const u of row) {
      const d = desiredOf(targetsOf(u, rel));
      if (d !== null) cons.nudge(u, d);
    }
  };
  for (let it = 0; it < SWEEPS; it++) {
    for (let g = 1; g <= maxGen; g++) nudge(rows[g], 'parents');
    for (let g = maxGen - 1; g >= 0; g--) nudge(rows[g], 'children');
  }

  const pos = new Map();
  const adjacent = [];
  for (const u of units) {
    u.members.forEach((m, i) => {
      pos.set(m, { x: u.x + i * (nodeSize.w + PARTNER_GAP), y: u.gen * LAYER_H });
      if (i) adjacent.push(pairKey(u.members[i - 1], m));
    });
  }
  return { pos, adjacent };
}

// Returns card positions (top-left corners) and the set of partner pairs drawn side by side.
export function computeLayout(people, links) {
  const idx = buildIndex(people, links);
  const insertion = new Map(people.map((p, i) => [p.id, i]));
  const pos = new Map();
  const adjacent = new Set();
  let cursor = 0;
  for (const comp of components(people, idx)) {
    const result = layoutComponent(comp, idx, insertion, links);
    result.adjacent.forEach((k) => adjacent.add(k));
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of result.pos.values()) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + nodeSize.w);
    }
    for (const [id, p] of result.pos) pos.set(id, { x: p.x - minX + cursor, y: p.y });
    cursor += maxX - minX + COMPONENT_GAP;
  }
  return { pos, adjacent };
}
