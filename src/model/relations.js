import { store, byId, findLink } from '../state/store.js';
import { buildIndex, components, isAncestor } from './graph.js';
import { assignGenerations } from '../layout/generations.js';
import { uid, fullName } from '../utils/format.js';

const bloodParentCount = (childId) =>
  store.state.links.filter((l) => l.type === 'parent' && l.b === childId && l.blood).length;

// Returns an error message, or null when the link was added.
export function addLink(type, a, b, blood) {
  const { people, links } = store.state;
  const A = byId(a);
  const B = byId(b);
  if (!A || !B) return 'Select two people.';
  if (a === b) return 'A person cannot be connected to themselves.';
  if (findLink(a, b)) return `${fullName(A)} and ${fullName(B)} are already connected.`;

  const idx = buildIndex(people, links);
  if (type === 'parent') {
    if (isAncestor(b, a, idx)) return `${fullName(B)} is an ancestor of ${fullName(A)}, so cannot be their child.`;
    if (blood && bloodParentCount(b) >= 2) {
      return `${fullName(B)} already has two blood parents. Use a dotted (not blood) line.`;
    }
  } else if (isAncestor(a, b, idx) || isAncestor(b, a, idx)) {
    return 'An ancestor and a descendant cannot be partners in the tree.';
  }

  const link = { id: uid(), type, a, b, blood };
  const testIdx = buildIndex(people, [...links, link]);
  const comp = components(people, testIdx).find((c) => c.includes(a));
  if (!assignGenerations(comp, testIdx).ok) return 'This connection would make the generations inconsistent.';

  links.push(link);
  return null;
}

export function toggleLinkBlood(linkId) {
  const link = store.state.links.find((l) => l.id === linkId);
  if (!link) return null;
  if (!link.blood && link.type === 'parent' && bloodParentCount(link.b) >= 2) {
    return 'This person already has two blood parents.';
  }
  link.blood = !link.blood;
  return null;
}
