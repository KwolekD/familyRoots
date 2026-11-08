export const STORAGE_KEY = 'family-tree-app.v1';
export const SETTINGS_KEY = 'family-tree-app.settings.v1';

export const THEMES = ['system', 'light', 'dark'];

export const DEFAULT_SETTINGS = {
  theme: 'system',
  animate: true,
  showLegend: true,
  showStats: true,
  showZoom: true,
  sidebarOpen: true,
  sidebarTab: 'tree',
};

export const NODE_W = 200;
export const NODE_H = 86;
export const H_GAP = 44;
export const PARTNER_GAP = 64;
export const V_GAP = 110;
export const LAYER_H = NODE_H + V_GAP;
export const COMPONENT_GAP = 140;

export const ANIM_MS = 700;
export const MAX_ZOOM = 2.5;
export const MIN_ZOOM = 1 / 12;
export const MAX_FIT_ZOOM = 1.15;
