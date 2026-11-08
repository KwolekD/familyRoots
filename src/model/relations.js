import { store, byId, findLink } from '../state/store.js';
import { buildIndex, components, isAncestor } from './graph.js';
import { assignGenerations } from '../layout/generations.js';
import { uid, fullName } from '../utils/format.js';
import { t } from '../i18n/index.js';

const bloodParentCount = (childId) =>
  store.state.links.filter((l) => l.type === 'parent' && l.b === childId && l.blood).length;

// Returns an error message, or null when the link was added.
export function addLink(type, a, b, blood) {
  const { people, links } = store.state;
  const A = byId(a);
  const B = byId(b);
  if (!A || !B) return t('err.selectTwo');
  if (a === b) return t('err.self');
  if (findLink(a, b)) return t('err.alreadyConnected', { a: fullName(A), b: fullName(B) });

  const idx = buildIndex(people, links);
  if (type === 'parent') {
    if (isAncestor(b, a, idx)) return t('err.ancestorChild', { a: fullName(A), b: fullName(B) });
    if (blood && bloodParentCount(b) >= 2) {
      return t('err.twoBloodParents', { b: fullName(B) });
    }
  } else if (isAncestor(a, b, idx) || isAncestor(b, a, idx)) {
    return t('err.ancestorPartner');
  }

  const link = { id: uid(), type, a, b, blood };
  const testIdx = buildIndex(people, [...links, link]);
  const comp = components(people, testIdx).find((c) => c.includes(a));
  if (!assignGenerations(comp, testIdx).ok) return t('err.generations');

  links.push(link);
  return null;
}

export function toggleLinkBlood(linkId) {
  const link = store.state.links.find((l) => l.id === linkId);
  if (!link) return null;
  if (!link.blood && link.type === 'parent' && bloodParentCount(link.b) >= 2) {
    return t('err.toggleTwoBlood');
  }
  link.blood = !link.blood;
  return null;
}
