import { UNTANGLE_MS } from '../config.js';
import { families } from './separate.js';

const MAX_PASSES = 6;

// Order-only view of the rows (no x), valid right after units are moved. A point's rank
// orders by position in its row, then within the unit (units are never 1e7 wide).
function ranker(rows) {
  const index = new Map();
  for (const row of rows) row.forEach((u, i) => index.set(u, i));
  return (p) => index.get(p.unit) * 1e7 + p.off;
}

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

// Re-sorts rows top-down so every family's children sit together, in the order of their
// sources. A unit with children of several families (a couple whose both sides have parents)
// sorts between them, turned so each spouse faces their own parents. Units without parents
// keep their place after the unit before them.
function groupRows(rows, unitOf, fams) {
  for (let g = 1; g < rows.length; g++) {
    const rank = ranker(rows);
    const srcs = new Map(); // unit -> per member: source ranks
    for (const f of fams) {
      if (f.gen !== g) continue;
      for (const k of f.kids) {
        if (!srcs.has(k.unit)) srcs.set(k.unit, k.unit.members.map(() => []));
        srcs.get(k.unit)[k.i].push(rank(f.src));
      }
    }
    const keys = new Map();
    let prev = -Infinity;
    for (const u of rows[g]) {
      const s = srcs.get(u);
      if (s) {
        const first = s[0];
        const last = s[s.length - 1];
        if (s.length > 1 && first.length && last.length && avg(first) > avg(last)) {
          u.members.reverse();
          u.members.forEach((m, i) => (unitOf.get(m).i = i));
        }
        prev = avg(s.flat());
      }
      keys.set(u, prev);
    }
    rows[g].sort((a, b) => keys.get(a) - keys.get(b));
  }
}

// Family pairs whose children are interleaved: ordered by source, a child of the later family
// sits left of a child of the earlier one. Spacing can't separate such pairs.
// Returns their count and, if `involved` is given, adds the units they touch to it.
function conflicts(rows, fams, involved) {
  const rank = ranker(rows);
  const byGen = new Map();
  for (const f of fams) {
    const ks = f.kids.map(rank);
    if (!byGen.has(f.gen)) byGen.set(f.gen, []);
    byGen.get(f.gen).push({ f, src: rank(f.src), lo: Math.min(...ks), hi: Math.max(...ks) });
  }
  let n = 0;
  for (const list of byGen.values()) {
    list.sort((a, b) => a.src - b.src);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[i].hi <= list[j].lo) continue;
        n++;
        for (const { f } of [list[i], list[j]]) [f.src, ...f.kids].forEach((p) => involved?.add(p.unit));
      }
    }
  }
  return n;
}

// Groups each row by family, then a greedy local search: flip a couple or move a unit to
// another slot in its row, regroup, and keep the move if fewer families are interleaved.
// Mainly fixes couples linking two families (both spouses have parents in the tree).
// Some trees can't be fully untangled, e.g. three children who all married into families
// in the tree: only two can sit at the ends of their sibling group.
export function untangle(rows, units, unitOf, parentLinks, offset) {
  const fams = families(parentLinks, unitOf, offset);
  const regroupScore = () => {
    groupRows(rows, unitOf, fams);
    return conflicts(rows, fams);
  };
  let best = regroupScore();
  const deadline = performance.now() + UNTANGLE_MS;
  const flip = (u) => {
    u.members.reverse();
    u.members.forEach((m, i) => (unitOf.get(m).i = i));
  };
  const tryMove = (apply) => {
    const savedRows = rows.map((r) => [...r]);
    const savedMembers = units.map((u) => [...u.members]);
    apply();
    const s = regroupScore();
    if (s < best) {
      best = s;
      return true;
    }
    rows.forEach((r, i) => r.splice(0, r.length, ...savedRows[i]));
    units.forEach((u, k) => {
      u.members = savedMembers[k];
      u.members.forEach((m, i) => (unitOf.get(m).i = i));
    });
    return false;
  };
  for (let pass = 0; pass < MAX_PASSES && best > 0; pass++) {
    let improved = false;
    // Only units of interleaved families can help; trying every unit is too slow on big trees.
    const involved = new Set();
    conflicts(rows, fams, involved);
    for (const row of rows) {
      for (const u of row.filter((x) => involved.has(x))) {
        if (best === 0 || performance.now() > deadline) return;
        if (u.members.length > 1 && tryMove(() => flip(u))) improved = true;
        for (let j = 0; j < row.length && best > 0; j++) {
          const moveTo = () => {
            row.splice(row.indexOf(u), 1);
            row.splice(j, 0, u);
          };
          if (row.indexOf(u) !== j && tryMove(moveTo)) improved = true;
        }
      }
    }
    if (!improved) break;
  }
}
