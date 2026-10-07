import { AccentColor, EditorFont, PageColor } from '@/types/settings';

/** Runtime theming: accent palettes, fonts and page tints applied as CSS variables. */

/**
 * Accents are defined per theme with fixed dark fills (no sRGB lightening),
 * OKLCH-harmonized lightness/chroma across hues, and a dedicated text variant
 * for hues that fail contrast as text. The readable text color ON a brand
 * fill is computed from relative luminance (see pickOnBrand).
 */
export interface AccentDef {
  id: AccentColor;
  name: string;
  /** Light-theme brand fill. */
  light: string;
  /** Dark-theme brand fill (intentionally light, L≈0.75 in OKLCH). */
  dark: string;
  /** Text-safe variant on light backgrounds. */
  text: string;
  softLight: string;
  softDark: string;
}

function relLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = ([0, 2, 4] as const).map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Readable text color on a solid brand fill: dark or white, whichever contrasts more (WCAG 4.5:1 target). */
export function pickOnBrand(brandHex: string): string {
  const dark = '#0d0d0f', light = '#ffffff';
  return contrast(brandHex, dark) >= contrast(brandHex, light) ? dark : light;
}

export const ACCENTS: Record<AccentColor, AccentDef> = {
  blue: { id: 'blue', name: 'Blue', light: '#3761e1', dark: '#7ea7ff', text: '#3761e1', softLight: '#e2f2ff', softDark: '#14203e' },
  sky: { id: 'sky', name: 'Sky', light: '#0e8fcf', dark: '#7cc8f2', text: '#0b76ab', softLight: '#e3f4fd', softDark: '#0c2434' },
  indigo: { id: 'indigo', name: 'Indigo', light: '#6453c4', dark: '#a79fff', text: '#6453c4', softLight: '#efeeff', softDark: '#201d39' },
  violet: { id: 'violet', name: 'Violet', light: '#8c46c3', dark: '#c793f8', text: '#8c46c3', softLight: '#faeaff', softDark: '#291937' },
  magenta: { id: 'magenta', name: 'Magenta', light: '#c026d3', dark: '#e879f9', text: '#a21caf', softLight: '#fae8ff', softDark: '#2a1230' },
  pink: { id: 'pink', name: 'Pink', light: '#c72b76', dark: '#ff85b6', text: '#c72b76', softLight: '#ffe5f2', softDark: '#371422' },
  red: { id: 'red', name: 'Red', light: '#d02c2e', dark: '#ff8177', text: '#d02c2e', softLight: '#ffe6e0', softDark: '#3a1412' },
  orange: { id: 'orange', name: 'Orange', light: '#dd6400', dark: '#ff9c58', text: '#be4700', softLight: '#ffead7', softDark: '#351906' },
  yellow: { id: 'yellow', name: 'Amber', light: '#e6ad00', dark: '#f4c352', text: '#986300', softLight: '#fef0d4', softDark: '#2c1f02' },
  green: { id: 'green', name: 'Green', light: '#008039', dark: '#6dd48d', text: '#008039', softLight: '#e0fae6', softDark: '#0f2817' },
  teal: { id: 'teal', name: 'Teal', light: '#007c77', dark: '#55d1ca', text: '#007c77', softLight: '#def8f6', softDark: '#0b2725' },
  graphite: { id: 'graphite', name: 'Graphite', light: '#4a5666', dark: '#a6afbb', text: '#4a5666', softLight: '#eef2f7', softDark: '#1f2226' }
};

/** Page tints: canvas / panel / soft-panel per theme, plus a raised step for menus in dark. */
export interface PageColorDef {
  id: PageColor;
  name: string;
  appBg: string;
  panel: string;
  panelSoft: string;
  surface3: string;
  darkAppBg: string;
  darkPanel: string;
  darkPanelSoft: string;
  darkSurface3: string;
}

export const PAGE_COLORS: Record<PageColor, PageColorDef> = {
  default: { id: 'default', name: 'Stone', appBg: '#f4f4ef', panel: '#fbfaf7', panelSoft: '#ecebe6', surface3: '#fdfdfb', darkAppBg: '#0e0d0b', darkPanel: '#151512', darkPanelSoft: '#1d1d1a', darkSurface3: '#272624' },
  paper: { id: 'paper', name: 'Cream', appBg: '#f8f3e9', panel: '#fdfaf4', panelSoft: '#f0ebe0', surface3: '#fefcf7', darkAppBg: '#100d07', darkPanel: '#18150e', darkPanelSoft: '#201d16', darkSurface3: '#292620' },
  white: { id: 'white', name: 'Neutral', appBg: '#f3f3f3', panel: '#fafafa', panelSoft: '#ebebeb', surface3: '#ffffff', darkAppBg: '#0c0d0f', darkPanel: '#141517', darkPanelSoft: '#1c1d1f', darkSurface3: '#252628' },
  mist: { id: 'mist', name: 'Mist', appBg: '#edf4fd', panel: '#f6fbff', panelSoft: '#e4ecf5', surface3: '#fbfdff', darkAppBg: '#090e13', darkPanel: '#11151a', darkPanelSoft: '#191d23', darkSurface3: '#22272c' },
  rose: { id: 'rose', name: 'Rose', appBg: '#fdf0f1', panel: '#fff8f9', panelSoft: '#f5e7e9', surface3: '#fffafb', darkAppBg: '#120b0c', darkPanel: '#1a1314', darkPanelSoft: '#221b1b', darkSurface3: '#2c2425' },
  slate: { id: 'slate', name: 'Slate', appBg: '#f1f3f5', panel: '#f8f9fa', panelSoft: '#e9ecef', surface3: '#fcfdfe', darkAppBg: '#101214', darkPanel: '#17191c', darkPanelSoft: '#1f2226', darkSurface3: '#282b2f' }
};

// ---- OKLCH ramp derivation -----------------------------------------------
// Ramps are mixed in OKLCH so hue and chroma stay stable across steps, then
// emitted as "R G B" triplets — the format the Tailwind primary ramp
// (`rgb(var(--p-50) / <alpha>)`) and the CSS fallbacks expect.

type RGB = { r: number; g: number; b: number };
type OKLCH = { l: number; c: number; h: number };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255
  };
}

function rgbToOklch({ r, g, b }: RGB): OKLCH {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToRgb({ l, c, h }: OKLCH): RGB {
  const hr = (h * Math.PI) / 180;
  const A = Math.cos(hr) * c;
  const B = Math.sin(hr) * c;
  const lm = Math.pow(l + 0.3963377774 * A + 0.2158037573 * B, 3);
  const mm = Math.pow(l - 0.1055613458 * A - 0.0638541728 * B, 3);
  const sm = Math.pow(l - 0.0894841775 * A - 1.291485548 * B, 3);
  return {
    r: clamp01(toSrgb(+4.0767416621 * lm - 3.3077115913 * mm + 0.2309699292 * sm)),
    g: clamp01(toSrgb(-1.2684380046 * lm + 2.6097574011 * mm - 0.3413193965 * sm)),
    b: clamp01(toSrgb(-0.0041960863 * lm - 0.7034186147 * mm + 1.707614701 * sm))
  };
}

/** Mix two colors in OKLCH by `amount` (0 = a, 1 = b). Returns an "R G B" triplet. */
function oklchMix(a: string, b: string, amount: number): string {
  const ca = rgbToOklch(hexToRgb(a));
  const cb = rgbToOklch(hexToRgb(b));
  let dh = cb.h - ca.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const mixed: OKLCH = {
    l: ca.l + (cb.l - ca.l) * amount,
    c: Math.max(0, ca.c + (cb.c - ca.c) * amount),
    h: (ca.h + dh * amount + 360) % 360
  };
  const out = oklchToRgb(mixed);
  const to255 = (v: number) => Math.round(v * 255);
  return `${to255(out.r)} ${to255(out.g)} ${to255(out.b)}`;
}

/** Precomputed OKLCH ramps as "R G B" triplets, per accent per theme. */
const rampCache = new Map<string, Record<string, string>>();
function rampFor(def: AccentDef, theme: 'light' | 'dark'): Record<string, string> {
  const key = `${def.id}-${theme}`;
  const cached = rampCache.get(key);
  if (cached) return cached;
  const base = theme === 'dark' ? def.dark : def.light;
  const white = '#ffffff';
  const black = '#000000';
  const mixToWhite: Array<[string, number]> = [['50', 0.9], ['100', 0.8], ['200', 0.62], ['300', 0.42], ['400', 0.22], ['500', 0.1]];
  const mixToBlack: Array<[string, number]> = [['600', 0], ['700', 0.15], ['800', 0.32], ['900', 0.46]];
  const ramp: Record<string, string> = {};
  for (const [step, amount] of mixToWhite) ramp[step] = oklchMix(base, white, amount);
  for (const [step, amount] of mixToBlack) ramp[step] = oklchMix(base, black, amount);
  rampCache.set(key, ramp);
  return ramp;
}


/**
 * Derive the primary ramp in OKLCH and write it to CSS variables.
 * Dark theme uses the accent's fixed light fill so brands stay crisp on
 * near-black, with a dedicated --brand-text for links and active labels.
 */
export function applyAccent(accent: AccentColor, theme: 'light' | 'dark'): void {
  const def = ACCENTS[accent] ?? ACCENTS.blue;
  const root = document.documentElement;
  const ramp = rampFor(def, theme);
  for (const [step, triplet] of Object.entries(ramp)) {
    root.style.setProperty(`--p-${step}`, triplet);
  }
  const base = theme === 'dark' ? def.dark : def.light;
  root.style.setProperty('--brand', base);
  root.style.setProperty('--brand-strong', theme === 'dark' ? def.light : ramp['700'] ? `rgb(${ramp['700']})` : base);
  root.style.setProperty('--brand-text', theme === 'dark' ? def.dark : def.text);
  root.style.setProperty('--brand-soft', theme === 'dark' ? def.softDark : def.softLight);
  root.style.setProperty('--on-brand', pickOnBrand(base));
}

export function applyFont(font: EditorFont): void {
  const preset = FONTS[font] ?? FONTS.system;
  const root = document.documentElement;
  root.style.setProperty('--font-app', preset.stack);
  // Titles follow the chosen font so typography stays consistent everywhere.
  root.style.setProperty('--font-serif', preset.stack);
}

/** Page background tint — has distinct light and dark variants. */
export function applyPageColor(pageColor: PageColor, theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  const preset = PAGE_COLORS[pageColor] ?? PAGE_COLORS.default;
  const dark = theme === 'dark';
  root.style.setProperty('--app-bg', dark ? preset.darkAppBg : preset.appBg);
  root.style.setProperty('--panel', dark ? preset.darkPanel : preset.panel);
  root.style.setProperty('--panel-soft', dark ? preset.darkPanelSoft : preset.panelSoft);
  root.style.setProperty('--surface-3', dark ? preset.darkSurface3 : preset.surface3);
}

// ---- Fonts ---------------------------------------------------------------

export const FONTS: Record<EditorFont, { label: string; stack: string; preview: string }> = {
  system: {
    label: 'System',
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    preview: 'ui-sans-serif, system-ui, sans-serif'
  },
  inter: {
    label: 'Inter',
    stack: "'Inter', ui-sans-serif, system-ui, 'Segoe UI', sans-serif",
    preview: "'Inter', ui-sans-serif, sans-serif"
  },
  claude: {
    label: 'Claude',
    stack: "'Tiempos Text', Copernicus, Georgia, 'Iowan Old Style', 'Times New Roman', serif",
    preview: 'Georgia, serif'
  },
  lora: {
    label: 'Lora',
    stack: "'Lora', Georgia, 'Times New Roman', serif",
    preview: "'Lora', Georgia, serif"
  },
  georgia: {
    label: 'Georgia',
    stack: 'Georgia, "Times New Roman", serif',
    preview: 'Georgia, serif'
  },
  times: {
    label: 'Times New Roman',
    stack: '"Times New Roman", Times, Georgia, serif',
    preview: '"Times New Roman", serif'
  },
  verdana: {
    label: 'Verdana',
    stack: 'Verdana, "Segoe UI", Tahoma, sans-serif',
    preview: 'Verdana, sans-serif'
  },
  arial: {
    label: 'Arial',
    stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    preview: 'Arial, sans-serif'
  },
  courier: {
    label: 'Courier',
    stack: '"Courier New", Courier, "Nimbus Mono PS", monospace',
    preview: '"Courier New", monospace'
  },
  mono: {
    label: 'Source Code',
    stack: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace",
    preview: "'JetBrains Mono', ui-monospace, monospace"
  }
};
