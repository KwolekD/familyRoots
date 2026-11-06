// Children sit one row below their parents, partners share a row.
// `ok` is false when the constraints cannot be satisfied (a cycle).
export function assignGenerations(ids, idx) {
  const gen = new Map(ids.map((id) => [id, 0]));
  const passes = ids.length + 2;

  const push = () => {
    for (let i = 0; i < passes; i++) {
      let changed = false;
      for (const id of ids) {
        const n = idx.get(id);
        const g = gen.get(id);
        for (const c of n.children) {
          if (gen.get(c) < g + 1) {
            gen.set(c, g + 1);
            changed = true;
          }
        }
        for (const s of n.partners) {
          if (gen.get(s) < g) {
            gen.set(s, g);
            changed = true;
          }
        }
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
      if (want > gen.get(id)) {
        gen.set(id, want);
        changed = true;
      }
    }
    return changed;
  };

  let ok = push();
  for (let i = 0; ok && i < 6 && pull(); i++) ok = push();

  const min = Math.min(...gen.values());
  for (const [id, g] of gen) gen.set(id, g - min);
  return { gen, ok };
}
