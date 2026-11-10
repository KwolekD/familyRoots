import { H_GAP, FAMILY_GAP } from '../config.js';

// Difference constraints `v.x >= u.x + w` between units. Solved incrementally by pushing
// units right, so the layout from the sweeps is kept wherever it already fits.
class Constraints {
  constructor(units) {
    this.out = new Map(units.map((u) => [u, []]));
    this.in = new Map(units.map((u) => [u, []]));
  }

  // Adds all constraints or none. Fails when they contradict earlier ones (a positive cycle).
  add(batch) {
    const old = new Map();
    const added = [];
    let ok = true;
    for (const c of batch) {
      if (c.u === c.v) {
        if (c.w <= 1e-6) continue;
        ok = false;
        break;
      }
      this.out.get(c.u).push(c);
      this.in.get(c.v).push(c);
      added.push(c);
      if (!this.push(c, old)) {
        ok = false;
        break;
      }
    }
    if (!ok) {
      for (const [u, x] of old) u.x = x;
      for (const c of added.reverse()) {
        this.out.get(c.u).pop();
        this.in.get(c.v).pop();
      }
    }
    return ok;
  }

  // The system was satisfiable before `c`, so any cycle goes through `c`: it exists iff
  // pushing from `c.v` comes back around and has to move `c.u`.
  push(c, old) {
    const set = (u, x) => {
      if (!old.has(u)) old.set(u, u.x);
      u.x = x;
    };
    if (c.v.x >= c.u.x + c.w - 1e-6) return true;
    set(c.v, c.u.x + c.w);
    const stack = [c.v];
    while (stack.length) {
      const a = stack.pop();
      for (const e of this.out.get(a)) {
        if (e.v.x >= a.x + e.w - 1e-6) continue;
        if (e.v === c.u) return false;
        set(e.v, a.x + e.w);
        stack.push(e.v);
      }
    }
    return true;
  }

  // Moves `u` as close to `x` as its constraints allow, keeping every one satisfied.
  nudge(u, x) {
    let lo = -Infinity;
    let hi = Infinity;
    for (const e of this.in.get(u)) lo = Math.max(lo, e.u.x + e.w);
    for (const e of this.out.get(u)) hi = Math.min(hi, e.v.x - e.w);
    u.x = Math.min(hi, Math.max(lo, x));
  }
}

// Families as the edge renderer draws them: connectors from one source point into one row.
// A child of two side-by-side partners with the same `blood` hangs from the middle of their
// line; otherwise each parent is its own source. A point is the middle of some members of a
// unit, x = unit.x + off. `off` and `i` are read live, so they stay right when a couple flips.
export function families(parentLinks, unitOf, offset) {
  const byChild = new Map();
  for (const l of parentLinks) {
    if (!byChild.has(l.b)) byChild.set(l.b, []);
    byChild.get(l.b).push(l);
  }
  const point = (unit, ids) => ({
    unit,
    get i() {
      return unitOf.get(ids[0]).i;
    },
    get off() {
      return ids.reduce((s, id) => s + offset(unitOf.get(id).i), 0) / ids.length;
    },
  });
  const fams = new Map();
  const addTo = (src, srcKey, child) => {
    const key = `${srcKey}>${child.unit.gen}`;
    if (!fams.has(key)) fams.set(key, { gen: child.unit.gen, src, kids: [] });
    fams.get(key).kids.push(child);
  };
  for (const [childId, ls] of byChild) {
    const c = unitOf.get(childId);
    const child = point(c.unit, [childId]);
    const used = new Set();
    ls.forEach((l, i) => {
      if (used.has(i)) return;
      const A = unitOf.get(l.a);
      const j = ls.findIndex((m, k) => {
        if (k <= i || used.has(k) || m.blood !== l.blood) return false;
        const B = unitOf.get(m.a);
        return B.unit === A.unit && Math.abs(B.i - A.i) === 1;
      });
      if (j >= 0) {
        used.add(j);
        addTo(point(A.unit, [l.a, ls[j].a]), `${l.a}+${ls[j].a}`, child);
      } else {
        addTo(point(A.unit, [l.a]), l.a, child);
      }
    });
  }
  return [...fams.values()];
}

const xOf = (p) => p.unit.x + p.off;
const mean = (ps) => ps.reduce((s, p) => s + xOf(p), 0) / ps.length;

// Every point of `a` must stay FAMILY_GAP left of every point of `b`.
function between(a, b) {
  const best = new Map();
  for (const p of [a.src, ...a.kids]) {
    for (const q of [b.src, ...b.kids]) {
      const w = p.off - q.off + FAMILY_GAP;
      const key = best.get(p.unit)?.get(q.unit);
      if (key !== undefined && key.w >= w) continue;
      if (!best.has(p.unit)) best.set(p.unit, new Map());
      best.get(p.unit).set(q.unit, { u: p.unit, v: q.unit, w });
    }
  }
  return [...best.values()].flatMap((m) => [...m.values()]);
}

// Spreads the rows so that, within each gap between rows, the horizontal spans of different
// families (source plus all children) don't overlap. Then their connectors can't cross or
// merge. Contradictory pairs (e.g. a child drawn between another family's children) are
// skipped; the renderer's lanes keep those apart. Returns the constraints for re-centering.
export function separateFamilies(rows, units, unitOf, parentLinks, offset) {
  const cons = new Constraints(units);
  for (const row of rows) {
    for (let i = 1; i < row.length; i++) cons.add([{ u: row[i - 1], v: row[i], w: row[i - 1].w + H_GAP }]);
  }
  const fams = families(parentLinks, unitOf, offset);
  for (let g = 1; g < rows.length; g++) {
    const gap = fams
      .filter((f) => f.gen === g)
      .sort((a, b) => xOf(a.src) - xOf(b.src) || mean(a.kids) - mean(b.kids));
    for (let i = 1; i < gap.length; i++) {
      // If the neighbour can't be separated, at least keep clear of the one before it.
      if (!cons.add(between(gap[i - 1], gap[i])) && i > 1) cons.add(between(gap[i - 2], gap[i]));
    }
  }
  return cons;
}

