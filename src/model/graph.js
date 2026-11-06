export function buildIndex(people, links) {
  const idx = new Map(people.map((p) => [p.id, { parents: [], children: [], partners: [] }]));
  for (const l of links) {
    const A = idx.get(l.a);
    const B = idx.get(l.b);
    if (!A || !B) continue;
    if (l.type === 'parent') {
      A.children.push(l.b);
      B.parents.push(l.a);
    } else {
      A.partners.push(l.b);
      B.partners.push(l.a);
    }
  }
  return idx;
}

// Groups of people connected by any relation, in insertion order.
export function components(people, idx) {
  const seen = new Set();
  const comps = [];
  for (const p of people) {
    if (seen.has(p.id)) continue;
    const comp = [];
    const stack = [p.id];
    seen.add(p.id);
    while (stack.length) {
      const id = stack.pop();
      comp.push(id);
      const n = idx.get(id);
      for (const o of [...n.parents, ...n.children, ...n.partners]) {
        if (!seen.has(o)) {
          seen.add(o);
          stack.push(o);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

export function isAncestor(ancestorId, id, idx) {
  const stack = [id];
  const seen = new Set();
  while (stack.length) {
    for (const p of idx.get(stack.pop()).parents) {
      if (p === ancestorId) return true;
      if (!seen.has(p)) {
        seen.add(p);
        stack.push(p);
      }
    }
  }
  return false;
}
