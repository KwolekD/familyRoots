import { NODE_W, NODE_H, ANIM_MS, MAX_FIT_ZOOM } from '../config.js';
import { store } from '../state/store.js';
import { computeLayout } from '../layout/treeLayout.js';
import { renderNodes, highlightSelection } from './nodes.js';
import { renderEdges } from './edges.js';
import { $ } from '../utils/dom.js';

const svg = $('#tree');
const gEdges = $('#edges');
const gNodes = $('#nodes');
const details = $('#details');

let layout = new Map();
let adjacentPairs = new Set();
let nodeEls = new Map();
let animFrame = 0;
// Positions currently drawn; they lag behind `layout` while animating.
const shown = new Map();

export const camera = {
  view: { x: -500, y: -350, w: 1000, h: 700 },
  // Set when the user pans/zooms, so a running animation stops moving the camera.
  locked: false,
};

export function svgSize() {
  const r = svg.getBoundingClientRect();
  return { w: r.width || 1000, h: r.height || 700, left: r.left, top: r.top };
}

export function draw() {
  for (const [id, g] of nodeEls) {
    const p = shown.get(id);
    if (p) g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  }
  renderEdges(gEdges, store.state.links, shown, adjacentPairs);
  const { x, y, w, h } = camera.view;
  svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
}

function fitView() {
  const s = svgSize();
  if (!layout.size) return { x: -s.w / 2, y: -s.h / 2, w: s.w, h: s.h };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of layout.values()) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x + NODE_W);
    y1 = Math.max(y1, p.y + NODE_H);
  }
  // Keep the tree clear of the floating details card on wide screens.
  const reserve = details.hidden || s.w < 1000 ? 0 : details.offsetWidth + 32;
  const availW = s.w - reserve;
  const pad = 70;
  const scale = Math.min(MAX_FIT_ZOOM, availW / (x1 - x0 + pad * 2), s.h / (y1 - y0 + pad * 2 + 40));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 - 20;
  return { x: cx - availW / 2 / scale, y: cy - s.h / 2 / scale, w: s.w / scale, h: s.h / scale };
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function animateTo(targetView) {
  cancelAnimationFrame(animFrame);
  camera.locked = false;
  const from = new Map([...layout.keys()].map((id) => [id, { ...shown.get(id) }]));
  const v0 = { ...camera.view };
  const v1 = targetView || camera.view;
  const t0 = performance.now();
  const step = (t) => {
    const k = ease(Math.min(1, (t - t0) / ANIM_MS));
    for (const [id, p] of layout) {
      const f = from.get(id);
      shown.set(id, { x: f.x + (p.x - f.x) * k, y: f.y + (p.y - f.y) * k });
    }
    if (!camera.locked) {
      camera.view = {
        x: v0.x + (v1.x - v0.x) * k,
        y: v0.y + (v1.y - v0.y) * k,
        w: v0.w + (v1.w - v0.w) * k,
        h: v0.h + (v1.h - v0.h) * k,
      };
    }
    draw();
    if (k < 1) animFrame = requestAnimationFrame(step);
  };
  animFrame = requestAnimationFrame(step);
}

export function relayout({ fit = true, animate = true } = {}) {
  const { people, links } = store.state;
  const result = computeLayout(people, links);
  layout = result.pos;
  adjacentPairs = result.adjacent;
  for (const id of [...shown.keys()]) if (!layout.has(id)) shown.delete(id);

  // New people grow out of a relative that is already on screen.
  const newIds = new Set();
  for (const [id, p] of layout) {
    if (shown.has(id)) continue;
    newIds.add(id);
    const neighbour = animate && links.find((l) => (l.a === id && shown.has(l.b)) || (l.b === id && shown.has(l.a)));
    const src = neighbour ? shown.get(neighbour.a === id ? neighbour.b : neighbour.a) : p;
    shown.set(id, { ...src });
  }
  nodeEls = renderNodes(gNodes, people, { selectedId: store.selectedId, newIds: animate ? newIds : new Set() });

  if (!animate) {
    for (const [id, p] of layout) shown.set(id, { ...p });
    if (fit) camera.view = fitView();
    draw();
    return;
  }
  animateTo(fit ? fitView() : null);
}

export const fitToScreen = () => animateTo(fitView());

export const highlight = () => highlightSelection(nodeEls, store.selectedId);

export const resetScene = () => shown.clear();
