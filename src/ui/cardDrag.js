import { store, commit } from '../state/store.js';
import { currentLayout, previewShift, snapBack } from '../render/scene.js';
import { dragGroup, moveCard } from '../layout/arrange.js';
import { $ } from '../utils/dom.js';

// Sideways drag of the selected card (panZoom.js decides when a drag is one). Its partners
// drawn beside it move along; on release the new order goes into state.rowOrder and the
// relayout brings the family below along. `dx` is in tree units.

const svg = $('#tree');
let ids = null;

const context = () => ({ ...store.state, ...currentLayout() });

export function cardDragMove(id, dx) {
  if (!ids) {
    ids = dragGroup(context(), id);
    svg.classList.add('moving-card');
  }
  previewShift(ids, dx);
}

export function cardDragEnd(id, dx, cancelled) {
  if (!ids) return;
  ids = null;
  svg.classList.remove('moving-card');
  if (!cancelled && moveCard(context(), id, dx)) commit({ fit: false });
  else snapBack();
}
