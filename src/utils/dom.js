const SVG_NS = 'http://www.w3.org/2000/svg';

export const $ = (selector) => document.querySelector(selector);

export function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}
