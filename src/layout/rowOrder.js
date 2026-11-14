// Preferences for the order inside a row, applied each time untangle regroups the rows.
// `manual`: Map id -> rank, set by dragging cards (state.rowOrder). A unit's rank is the
// lowest of its members'; units without one are automatic.

const manualRank = (u, manual) => {
  const ranks = u.members.filter((m) => manual.has(m)).map((m) => manual.get(m));
  return ranks.length ? Math.min(...ranks) : undefined;
};

// Units placed by hand keep their order. Every other unit stays right after the placed unit
// it came after, so automatic units (e.g. people added later) stay near their relatives.
// Runs before families are grouped, so it only decides order where families allow it.
export function applyManualOrder(row, manual) {
  if (!manual.size) return;
  const rank = new Map(row.map((u) => [u, manualRank(u, manual)]));
  const placed = row.filter((u) => rank.get(u) !== undefined).sort((a, b) => rank.get(a) - rank.get(b));
  if (!placed.length) return;
  const after = new Map([[null, []]]);
  let prev = null;
  for (const u of row) {
    if (rank.get(u) === undefined) after.get(prev).push(u);
    else after.set((prev = u), []);
  }
  row.splice(0, row.length, ...after.get(null), ...placed.flatMap((u) => [u, ...after.get(u)]));
}

const sameKey = (a, b) => a === b || Math.abs(a - b) < 0.5;

// A couple whose spouses both have parents in the tree normally sorts between the two
// families. Placed by hand, it joins the family it was put among: the one its nearest
// single-family neighbours belong to (both sides agree, or only one side is its family).
// `famKeys(u)`: per member with parents, the key of their family. Returns a key or undefined.
export function joinedFamilyKey(row, i, famKeys, manual) {
  const own = famKeys(row[i]);
  if (own.length < 2 || manualRank(row[i], manual) === undefined) return undefined;
  const near = (step) => {
    for (let j = i + step; j >= 0 && j < row.length; j += step) {
      const k = famKeys(row[j]);
      if (k.length === 1) return own.find((o) => sameKey(o, k[0]));
    }
    return undefined;
  };
  const left = near(-1);
  const right = near(1);
  if (left !== undefined && right !== undefined) return sameKey(left, right) ? left : undefined;
  return left ?? right;
}

// Siblings centred under the same source point (equal keys) are put oldest first, within the
// slots they already hold. Skipped, so they keep their slots: undated siblings, siblings placed
// by hand, and couples who are both someone's child (they sit at the edge facing the in-laws
// instead). In a group with siblings placed by hand, the others go right after the last placed
// one born before them, so someone added later still lands by age.
// `kidOf`: unit -> ids of its members who have parents.
export function birthOrder(row, keys, kidOf, { born, manual }) {
  const dated = (u) => kidOf.get(u)?.length === 1 && born.get(kidOf.get(u)[0]) != null;
  const birth = (u) => born.get(kidOf.get(u)[0]);
  const placed = (u) => manualRank(u, manual) !== undefined;
  const sortable = (u) => dated(u) && !placed(u);
  for (let i = 0; i < row.length; ) {
    let j = i + 1;
    while (j < row.length && sameKey(keys.get(row[j]), keys.get(row[i]))) j++;
    const run = row.slice(i, j);
    const movers = run.filter(sortable).sort((a, b) => birth(a) - birth(b));
    if (run.some((u) => dated(u) && placed(u))) {
      const out = run.filter((u) => !movers.includes(u));
      for (const m of movers) {
        const anchor = out.findLast((u) => dated(u) && (placed(u) || movers.includes(u)) && birth(u) <= birth(m));
        out.splice(anchor ? out.indexOf(anchor) + 1 : out.findIndex((u) => dated(u) && placed(u)), 0, m);
      }
      row.splice(i, run.length, ...out);
    } else {
      const slots = run.flatMap((u, k) => (sortable(u) ? [i + k] : []));
      slots.forEach((k, n) => (row[k] = movers[n]));
    }
    i = j;
  }
}
