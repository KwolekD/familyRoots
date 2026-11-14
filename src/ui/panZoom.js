import { MAX_ZOOM, MIN_ZOOM } from '../config.js';
import { store, select } from '../state/store.js';
import { camera, draw, svgSize, fitToScreen } from '../render/scene.js';
import { $ } from '../utils/dom.js';
import { startEdit } from './personForm.js';
import { cardDragMove, cardDragEnd } from './cardDrag.js';

const svg = $('#tree');
const DOUBLE_CLICK_MS = 350;
const DRAG_THRESHOLD = 4;

let drag = null;
let lastClick = { id: null, t: 0 };
// Pointers currently down, for two-finger pinch zoom.
const pointers = new Map();
let pinch = null;

function zoomAt(px, py, factor) {
  const s = svgSize();
  const v = camera.view;
  const w = Math.min(s.w / MIN_ZOOM, Math.max(s.w / MAX_ZOOM, v.w * factor));
  const k = w / v.w;
  camera.view = { x: px - (px - v.x) * k, y: py - (py - v.y) * k, w, h: v.h * k };
  camera.locked = true;
  draw();
}

function toSvg(clientX, clientY) {
  const s = svgSize();
  const v = camera.view;
  return [v.x + ((clientX - s.left) / s.w) * v.w, v.y + ((clientY - s.top) / s.h) * v.h];
}

const zoomCenter = (factor) => {
  const v = camera.view;
  zoomAt(v.x + v.w / 2, v.y + v.h / 2, factor);
};

function pinchState() {
  const [a, b] = [...pointers.values()];
  return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Pans by the midpoint's movement, then zooms around it by the change in finger distance.
function onPinchMove() {
  const next = pinchState();
  const s = svgSize();
  const v = camera.view;
  camera.view = { ...v, x: v.x - ((next.x - pinch.x) * v.w) / s.w, y: v.y - ((next.y - pinch.y) * v.h) / s.h };
  zoomAt(...toSvg(next.x, next.y), pinch.dist / next.dist);
  pinch = next;
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  svg.setPointerCapture(e.pointerId);
  if (pointers.size === 2) {
    // A second finger turns the gesture into a pinch; it never counts as a click.
    if (drag?.card && drag.moved) cardDragEnd(drag.nodeId, 0, true);
    drag = null;
    svg.classList.remove('panning');
    pinch = pinchState();
    return;
  }
  if (pointers.size > 2) return;
  drag = {
    sx: e.clientX,
    sy: e.clientY,
    vx: camera.view.x,
    vy: camera.view.y,
    moved: false,
    nodeId: e.target.closest('.node')?.dataset.id || null,
  };
  // The selected card can be dragged sideways to rearrange the tree.
  drag.card = !!drag.nodeId && drag.nodeId === store.selectedId;
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch) return onPinchMove();
  if (!drag) return;
  const dx = e.clientX - drag.sx;
  const dy = e.clientY - drag.sy;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
  // A mostly vertical start pans even on the selected card.
  if (!drag.moved && Math.abs(dy) > Math.abs(dx)) drag.card = false;
  drag.moved = true;
  const s = svgSize();
  const v = camera.view;
  if (drag.card) {
    drag.dx = (dx * v.w) / s.w;
    return cardDragMove(drag.nodeId, drag.dx);
  }
  svg.classList.add('panning');
  camera.view = { ...v, x: drag.vx - (dx * v.w) / s.w, y: drag.vy - (dy * v.h) / s.h };
  camera.locked = true;
  draw();
}

// Clicks are resolved here because pointer capture retargets the native click event.
function onPointerEnd(e) {
  pointers.delete(e.pointerId);
  // Lifting one finger after a pinch doesn't resume panning, which would make the view jump.
  if (pinch) {
    if (pointers.size < 2) pinch = null;
    return;
  }
  if (!drag) return;
  svg.classList.remove('panning');
  if (drag.card && drag.moved) {
    cardDragEnd(drag.nodeId, drag.dx, e.type !== 'pointerup');
  } else if (!drag.moved && e.type === 'pointerup') {
    const now = performance.now();
    if (drag.nodeId && lastClick.id === drag.nodeId && now - lastClick.t < DOUBLE_CLICK_MS) startEdit(drag.nodeId);
    select(drag.nodeId);
    lastClick = { id: drag.nodeId, t: now };
  }
  drag = null;
}

export function initPanZoom() {
  svg.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomAt(...toSvg(e.clientX, e.clientY), Math.exp(e.deltaY * 0.0012));
    },
    { passive: false },
  );
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerEnd);
  svg.addEventListener('pointercancel', onPointerEnd);

  $('#zoom-in').addEventListener('click', () => zoomCenter(0.8));
  $('#zoom-out').addEventListener('click', () => zoomCenter(1.25));
  $('#zoom-fit').addEventListener('click', fitToScreen);

  new ResizeObserver(() => {
    const s = svgSize();
    const v = camera.view;
    const h = (v.w * s.h) / s.w;
    camera.view = { ...v, y: v.y + (v.h - h) / 2, h };
    draw();
  }).observe(svg);
}
