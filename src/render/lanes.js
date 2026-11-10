import { V_GAP, EDGE_LANE_PAD, EDGE_LANE_MARGIN } from '../config.js';

// Families whose horizontal connectors would share one height get separate heights,
// otherwise neighbouring sibling groups merge into one line and look related.
// `groups`: [{ sx, sy, cy, xs: [childX...] }] → sets `g.my` (height of the horizontal run).
export function assignLanes(groups) {
  for (const g of groups) {
    g.lo = Math.min(g.sx, ...g.xs);
    g.hi = Math.max(g.sx, ...g.xs);
    g.base = g.cy - V_GAP / 2;
    g.lane = 0;
    g.lanes = 1;
  }
  // Only groups with an actual horizontal run need a lane.
  const wide = groups.filter((g) => g.hi - g.lo >= 0.5).sort((a, b) => a.lo - b.lo || a.hi - b.hi);
  const conflicts = (a, b) =>
    Math.abs(a.base - b.base) < V_GAP / 2 && a.lo < b.hi + EDGE_LANE_MARGIN && b.lo < a.hi + EDGE_LANE_MARGIN;

  // Greedy interval colouring, left to right: take the lowest lane no conflicting group uses.
  wide.forEach((g, i) => {
    const taken = new Set();
    for (let j = 0; j < i; j++) if (conflicts(g, wide[j])) taken.add(wide[j].lane);
    while (taken.has(g.lane)) g.lane++;
  });

  // Lane count per cluster of mutually reachable conflicts, so spacing is even within it.
  const seen = new Set();
  for (const start of wide) {
    if (seen.has(start)) continue;
    const cluster = [start];
    seen.add(start);
    for (let k = 0; k < cluster.length; k++) {
      for (const o of wide) {
        if (!seen.has(o) && conflicts(cluster[k], o)) {
          seen.add(o);
          cluster.push(o);
        }
      }
    }
    const n = Math.max(...cluster.map((g) => g.lane)) + 1;
    for (const g of cluster) g.lanes = n;
  }

  const span = V_GAP - 2 * EDGE_LANE_PAD;
  for (const g of groups) {
    const top = g.cy - V_GAP + EDGE_LANE_PAD;
    g.my = g.lanes === 1 ? g.base : top + ((g.lane + 0.5) * span) / g.lanes;
  }
}
