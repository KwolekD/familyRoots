import { MAX_ZOOM, MIN_ZOOM } from '../config.js';
import { select } from '../state/store.js';
import { camera, draw, svgSize, fitToScreen } from '../render/scene.js';
import { $ } from '../utils/dom.js';
import { startEdit } from './personForm.js';

const svg = $('#tree');
const DOUBLE_CLICK_MS = 350;
const DRAG_THRESHOLD = 4;

let drag = null;
let lastClick = { id: null, t: 0 };

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

function onPointerDown(e) {
  if (e.button !== 0) return;
  drag = {
    sx: e.clientX,
    sy: e.clientY,
    vx: camera.view.x,
    vy: camera.view.y,
    moved: false,
    nodeId: e.target.closest('.node')?.dataset.id || null,
  };
  svg.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!drag) return;
  const dx = e.clientX - drag.sx;
  const dy = e.clientY - drag.sy;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
  drag.moved = true;
  svg.classList.add('panning');
  const s = svgSize();
  const v = camera.view;
  camera.view = { ...v, x: drag.vx - (dx * v.w) / s.w, y: drag.vy - (dy * v.h) / s.h };
  camera.locked = true;
  draw();
}

// Clicks are resolved here because pointer capture retargets the native click event.
function onPointerEnd(e) {
  if (!drag) return;
  svg.classList.remove('panning');
  if (!drag.moved && e.type === 'pointerup') {
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
