export const STORAGE_KEY = 'family-tree-app.v1';
export const SETTINGS_KEY = 'family-tree-app.settings.v1';

export const LANGUAGES = ['en', 'pl'];
export const THEMES = ['system', 'light', 'dark'];

// Phone layout (bottom tab bar + sheet). Same breakpoint as styles/mobile.css.
export const MOBILE_QUERY = '(max-width: 700px)';

// `lang` here is only the fallback; settings.js replaces it with the browser language when supported.
export const DEFAULT_SETTINGS = {
  theme: 'system',
  lang: 'en',
  animate: true,
  showLegend: true,
  showStats: true,
  showZoom: true,
  fullNames: false,
  sidebarOpen: true,
  sidebarTab: 'tree',
};

export const NODE_W = 200;
// Right padding after the longest line when cards are widened to fit full names.
export const NODE_PAD_RIGHT = 18;
export const NODE_H = 86;
export const H_GAP = 44;
export const PARTNER_GAP = 64;
export const V_GAP = 110;
export const LAYER_H = NODE_H + V_GAP;
export const COMPONENT_GAP = 140;
// Parent->child connectors of different families that overlap horizontally get separate heights
// inside the V_GAP band, keeping this distance from the cards above and below.
export const EDGE_LANE_PAD = 22;
// Horizontal runs closer than this count as overlapping (leaves room for the rounded corners).
export const EDGE_LANE_MARGIN = 24;

export const ANIM_MS = 700;
export const MAX_ZOOM = 2.5;
export const MIN_ZOOM = 1 / 12;
export const MAX_FIT_ZOOM = 1.15;

// PNG export: pixels per tree unit, shrunk automatically for big trees to stay within canvas limits.
export const PNG_SCALE = 2;
export const PNG_PAD = 40;
export const PNG_MAX_SIDE = 16000;
export const PNG_MAX_PIXELS = 120e6;
