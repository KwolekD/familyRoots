import { settings, setSettings } from '../state/settings.js';
import { $ } from '../utils/dom.js';
import { t } from '../i18n/index.js';

const sidebar = $('#sidebar');
const toggleBtn = $('#sidebar-toggle');
const tabButtons = [...sidebar.querySelectorAll('[data-tab]')];
const panels = [...sidebar.querySelectorAll('[data-panel]')];

function render() {
  const open = settings.sidebarOpen;
  sidebar.classList.toggle('collapsed', !open);
  // Keep the key on the element too, so a language switch re-translates the current state.
  toggleBtn.dataset.i18nTitle = open ? 'sidebar.hide' : 'sidebar.show';
  toggleBtn.title = t(toggleBtn.dataset.i18nTitle);
  toggleBtn.setAttribute('aria-expanded', String(open));
  for (const b of tabButtons) {
    const active = open && b.dataset.tab === settings.sidebarTab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
  }
  for (const p of panels) p.hidden = p.dataset.panel !== settings.sidebarTab;
}

export function setSidebarOpen(open) {
  setSettings({ sidebarOpen: open });
  render();
}

export function openTab(tab) {
  setSettings({ sidebarTab: tab, sidebarOpen: true });
  render();
}

// Shows one view of the Tree tab (menu, person, link) and hides the others.
export function showView(name) {
  openTab('tree');
  for (const v of sidebar.querySelectorAll('[data-view]')) v.hidden = v.dataset.view !== name;
  sidebar.querySelector('.drawer-inner').scrollTop = 0;
}

function onTabClick(tab) {
  // Clicking the tab that is already open hides the sidebar.
  if (settings.sidebarOpen && settings.sidebarTab === tab) setSidebarOpen(false);
  else openTab(tab);
}

export function initSidebar() {
  for (const b of tabButtons) b.addEventListener('click', () => onTabClick(b.dataset.tab));
  toggleBtn.addEventListener('click', () => setSidebarOpen(!settings.sidebarOpen));
  sidebar.addEventListener('click', (e) => {
    const t = e.target.closest('[data-goto]');
    if (t) showView(t.dataset.goto);
  });
  render();
}
