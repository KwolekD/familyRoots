import { NODE_H } from '../config.js';
import { nodeSize } from '../layout/nodeSize.js';
import { pairKey } from '../utils/format.js';
import { assignLanes } from './lanes.js';

const pathOf = (d, blood) => `<path class="link ${blood ? 'blood' : 'nonblood'}" d="${d}"/>`;
const partnerMark = (x, y) => `<circle class="partner-mark" cx="${x}" cy="${y}" r="5"/>`;

// Orthogonal parent -> child connector with rounded corners, horizontal run at height `my`.
function elbow(sx, sy, cx, cy, my) {
  if (my <= sy) my = (sy + cy) / 2;
  const dx = cx - sx;
  if (Math.abs(dx) < 0.5) return `M${sx} ${sy}V${cy}`;
  const dir = Math.sign(dx);
  const r = Math.max(0, Math.min(12, Math.abs(dx) / 2, my - sy, cy - my));
  return `M${sx} ${sy}V${my - r}Q${sx} ${my} ${sx + dir * r} ${my}H${cx - dir * r}Q${cx} ${my} ${cx} ${my + r}V${cy}`;
}

function partnerEdges(links, pos, adjacent, out, marks) {
  for (const l of links) {
    if (l.type !== 'partner') continue;
    const a = pos.get(l.a);
    const b = pos.get(l.b);
    if (!a || !b) continue;
    const [L, R] = a.x <= b.x ? [a, b] : [b, a];
    if (adjacent.has(pairKey(l.a, l.b))) {
      out.push(pathOf(`M${L.x + nodeSize.w} ${L.y + NODE_H / 2}L${R.x} ${R.y + NODE_H / 2}`, l.blood));
      marks.push(partnerMark((L.x + nodeSize.w + R.x) / 2, (L.y + R.y) / 2 + NODE_H / 2));
    } else {
      const x1 = L.x + nodeSize.w / 2;
      const x2 = R.x + nodeSize.w / 2;
      const lift = 36 + Math.abs(x2 - x1) * 0.08;
      out.push(pathOf(`M${x1} ${L.y}C${x1} ${L.y - lift} ${x2} ${R.y - lift} ${x2} ${R.y}`, l.blood));
      marks.push(partnerMark((x1 + x2) / 2, (L.y + R.y) / 2 - lift * 0.75));
    }
  }
}

// Every parent -> child connector as { sx, sy, cx, cy, blood }. Children of a side-by-side
// couple hang from the middle of the partner line.
function parentSegments(links, pos, adjacent) {
  const byChild = new Map();
  for (const l of links) {
    if (l.type !== 'parent') continue;
    if (!byChild.has(l.b)) byChild.set(l.b, []);
    byChild.get(l.b).push(l);
  }

  const segs = [];
  for (const [childId, ls] of byChild) {
    const c = pos.get(childId);
    if (!c) continue;
    const cx = c.x + nodeSize.w / 2;
    const used = new Set();
    for (let i = 0; i < ls.length; i++) {
      for (let j = i + 1; j < ls.length; j++) {
        if (used.has(i) || used.has(j)) continue;
        if (ls[i].blood !== ls[j].blood || !adjacent.has(pairKey(ls[i].a, ls[j].a))) continue;
        const A = pos.get(ls[i].a);
        const B = pos.get(ls[j].a);
        if (!A || !B) continue;
        used.add(i);
        used.add(j);
        segs.push({ sx: (A.x + B.x) / 2 + nodeSize.w / 2, sy: Math.max(A.y, B.y) + NODE_H / 2, cx, cy: c.y, blood: ls[i].blood });
      }
    }
    ls.forEach((l, i) => {
      if (used.has(i)) return;
      const A = pos.get(l.a);
      if (A) segs.push({ sx: A.x + nodeSize.w / 2, sy: A.y + NODE_H, cx, cy: c.y, blood: l.blood });
    });
  }
  return segs;
}

// Connectors from the same source point into the same row form one family and share a lane.
function parentEdges(links, pos, adjacent, out) {
  const groups = new Map();
  for (const s of parentSegments(links, pos, adjacent)) {
    const key = `${Math.round(s.sx)},${Math.round(s.sy)},${Math.round(s.cy)}`;
    if (!groups.has(key)) groups.set(key, { sx: s.sx, sy: s.sy, cy: s.cy, xs: [], segs: [] });
    const g = groups.get(key);
    g.xs.push(s.cx);
    g.segs.push(s);
  }
  assignLanes([...groups.values()]);
  for (const g of groups.values()) {
    for (const s of g.segs) out.push(pathOf(elbow(s.sx, s.sy, s.cx, s.cy, g.my), s.blood));
  }
}

export function renderEdges(container, links, pos, adjacent) {
  const out = [];
  const marks = [];
  partnerEdges(links, pos, adjacent, out, marks);
  parentEdges(links, pos, adjacent, out);
  container.innerHTML = out.join('') + marks.join('');
}
