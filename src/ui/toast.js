import { $ } from '../utils/dom.js';

const el = $('#toast');
let timer = 0;

export function toast(message, kind = 'ok') {
  el.textContent = message;
  el.className = `toast show ${kind}`;
  clearTimeout(timer);
  timer = setTimeout(() => (el.className = 'toast'), 3000);
}
