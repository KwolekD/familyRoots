import { PARTNER_GAP } from '../config.js';
import { nodeSize } from './nodeSize.js';

// Oldest first; undated people keep their relative order, after the dated ones.
function byBirth(ids, born) {
  const key = (id) => born.get(id) ?? Infinity;
  return [...ids].sort((a, b) => (key(a) === key(b) ? 0 : key(a) - key(b)));
}

// DFS from people without parents, partners before children, children oldest first.
export function initialOrder(ids, idx, insertion, born) {
  const order = new Map();
  let k = 0;
  const visit = (id) => {
    if (order.has(id)) return;
    order.set(id, k++);
    const n = idx.get(id);
    n.partners.forEach(visit);
    byBirth(n.children, born).forEach(visit);
  };
  const sorted = [...ids].sort((a, b) => insertion.get(a) - insertion.get(b));
  sorted.filter((id) => !idx.get(id).parents.length).forEach(visit);
  sorted.forEach(visit);
  return order;
}

// A unit is a chain of partners drawn side by side on one row. A woman and a man who have
// no other partners are drawn woman left, man right, and `fixed` so no later step flips them.
export function buildUnits(ids, idx, gen, order, gender) {
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
    const couple = members.length === 2 && members.every((m) => idx.get(m).partners.length === 1);
    const genders = couple ? members.map((m) => gender.get(m)).join('') : '';
    if (genders === 'mf') members.reverse();
    const fixed = genders === 'mf' || genders === 'fm';
    const unit = { members, gen: g, fixed, x: 0, desired: 0, w: members.length * nodeSize.w + (members.length - 1) * PARTNER_GAP };
    members.forEach((m, i) => unitOf.set(m, { unit, i }));
    units.push(unit);
  }
  return { units, unitOf };
}
