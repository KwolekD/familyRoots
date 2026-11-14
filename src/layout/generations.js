import { SIBLING_EXTRA_ROWS } from '../config.js';

// Children sit one row below their parents, partners share a row.
// `ok` is false when the constraints cannot be satisfied (a cycle).
// `alignSiblings` also puts each person's children on one row, wherever that stays
// satisfiable (not e.g. when someone married their sibling's child). It is a layout
// preference only, so validation leaves it off and it never makes a link invalid.
export function assignGenerations(ids, idx, { alignSiblings = false, extraRows = SIBLING_EXTRA_ROWS } = {}) {
  const gen = new Map(ids.map((id) => [id, 0]));
  const passes = ids.length + 2;
  const groups = []; // sibling groups kept on one row

  const raise = (id, g) => {
    if (gen.get(id) >= g) return false;
    gen.set(id, g);
    return true;
  };

  const push = () => {
    for (let i = 0; i < passes; i++) {
      let changed = false;
      for (const id of ids) {
        const n = idx.get(id);
        const g = gen.get(id);
        for (const c of n.children) changed = raise(c, g + 1) || changed;
        for (const s of n.partners) changed = raise(s, g) || changed;
      }
      for (const kids of groups) {
        const g = Math.max(...kids.map((k) => gen.get(k)));
        for (const k of kids) changed = raise(k, g) || changed;
      }
      if (!changed) return true;
    }
    return false;
  };

  // People without parents are pulled down to sit right above their children.
  const pull = () => {
    let changed = false;
    for (const id of ids) {
      const n = idx.get(id);
      if (n.parents.length || !n.children.length) continue;
      const want = Math.min(...n.children.map((c) => gen.get(c))) - 1;
      changed = raise(id, want) || changed;
    }
    return changed;
  };

  // Rows only ever grow, so a later push can't undo an earlier constraint.
  const settle = () => {
    let ok = push();
    for (let i = 0; ok && i < 6 && pull(); i++) ok = push();
    return ok;
  };

  const height = () => Math.max(...gen.values()) - Math.min(...gen.values());

  const ok = settle();
  if (ok && alignSiblings) {
    // Each aligned group can shift a whole branch down, and with marriages across
    // generations those shifts add up. So first take the groups that cost no extra rows,
    // then the rest while the tree stays within SIBLING_EXTRA_ROWS of its height.
    const base = height();
    // Both parents of a couple list the same children: try each group once.
    const byKey = new Map();
    for (const id of ids) {
      const kids = idx.get(id).children;
      if (kids.length > 1) byKey.set([...kids].sort().join(' '), kids);
    }
    let todo = [...byKey.values()];
    for (const limit of [base, base + extraRows]) {
      todo = todo.filter((kids) => {
        groups.push(kids);
        if (kids.every((k) => gen.get(k) === gen.get(kids[0]))) return false;
        const saved = new Map(gen);
        if (settle() && height() <= limit) return false;
        groups.pop();
        for (const [k, g] of saved) gen.set(k, g);
        return true;
      });
    }
  }

  const min = Math.min(...gen.values());
  for (const [id, g] of gen) gen.set(id, g - min);
  return { gen, ok };
}
