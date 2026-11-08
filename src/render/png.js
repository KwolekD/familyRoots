import { PNG_SCALE, PNG_PAD, PNG_MAX_SIDE, PNG_MAX_PIXELS } from '../config.js';
import { $ } from '../utils/dom.js';

// Styles come from CSS classes, which an SVG drawn as an <img> can't see, so they get inlined.
const PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
  'stroke-linejoin', 'stroke-opacity', 'opacity', 'filter', 'flood-color', 'flood-opacity',
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-numeric',
];

function inlineStyles(src, dst) {
  const cs = getComputedStyle(src);
  // Computed url() may be absolute; inside the standalone image only the fragment resolves.
  const css = PROPS.map((p) => `${p}:${cs.getPropertyValue(p).replace(/url\(["']?[^#)]*#([^"')]+)["']?\)/, 'url(#$1)')}`);
  dst.setAttribute('style', css.join(';'));
  for (let i = 0; i < src.children.length; i++) inlineStyles(src.children[i], dst.children[i]);
}

function bounds() {
  const a = $('#nodes').getBBox();
  const b = $('#edges').getBBox();
  const x0 = Math.min(a.x, b.width ? b.x : a.x);
  const y0 = Math.min(a.y, b.height ? b.y : a.y);
  const x1 = Math.max(a.x + a.width, b.width ? b.x + b.width : -Infinity);
  const y1 = Math.max(a.y + a.height, b.height ? b.y + b.height : -Infinity);
  return { x: x0 - PNG_PAD, y: y0 - PNG_PAD, w: x1 - x0 + PNG_PAD * 2, h: y1 - y0 + PNG_PAD * 2 };
}

// Highest scale up to PNG_SCALE that stays inside browser canvas limits, so big trees still fit whole.
function pickScale({ w, h }) {
  return Math.min(PNG_SCALE, PNG_MAX_SIDE / w, PNG_MAX_SIDE / h, Math.sqrt(PNG_MAX_PIXELS / (w * h)));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('SVG render failed'));
    img.src = url;
  });
}

/** Renders the whole tree (not just the visible part) to a PNG blob. */
export async function treeToPng() {
  const svg = $('#tree');
  // Export without the selection highlight.
  const selected = [...svg.querySelectorAll('.node.selected')];
  selected.forEach((g) => g.classList.remove('selected'));
  const clone = svg.cloneNode(true);
  try {
    inlineStyles(svg, clone);
  } finally {
    selected.forEach((g) => g.classList.add('selected'));
  }

  const box = bounds();
  const scale = pickScale(box);
  const width = Math.round(box.w * scale);
  const height = Math.round(box.h * scale);
  clone.querySelectorAll('title').forEach((el) => el.remove());
  clone.removeAttribute('id');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);

  const markup = new XMLSerializer().serializeToString(clone);
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg');
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
  );
}
