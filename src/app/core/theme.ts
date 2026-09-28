/**
 * Palette d'une vitrine dérivée des couleurs de la boutique. Toutes les teintes sont calculées
 * ici (et non en CSS) pour garantir un contraste lisible quelle que soit la couleur choisie :
 * texte blanc ou noir sur la couleur, version assombrie pour du texte sur fond blanc.
 */
export const DEFAULT_BRAND = '#5b4fe5';

type Rgb = [number, number, number];

function parseHex(value: string | null | undefined): Rgb | null {
  const hex = (value ?? '').trim().replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) {
    return null;
  }
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('');
}

function mix(a: Rgb, b: Rgb, weightOfA: number): Rgb {
  return [0, 1, 2].map((i) => a[i] * weightOfA + b[i] * (1 - weightOfA)) as Rgb;
}

/** Rotation de teinte (degrés) en conservant saturation et luminosité. */
function rotateHue([r, g, b]: Rgb, degrees: number): Rgb {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) {
    return [r, g, b];
  }
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h = (h * 60 + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** Luminance relative (WCAG). */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [22, 24, 29];

/** Assombrit jusqu'à un contraste suffisant sur blanc (texte, liens, prix). */
function readableOnWhite(rgb: Rgb): Rgb {
  let color = rgb;
  for (let i = 0; i < 12 && contrast(color, WHITE) < 4.5; i++) {
    color = mix(color, [0, 0, 0], 0.88);
  }
  return color;
}

export interface BrandTheme {
  [cssVar: string]: string;
}

export function buildTheme(primary: string | null, secondary: string | null): BrandTheme {
  const brand = parseHex(primary) ?? parseHex(DEFAULT_BRAND)!;
  const accent = parseHex(secondary) ?? mix(brand, INK, 0.55);
  const onBrand = contrast(brand, WHITE) >= 3 ? WHITE : INK;
  // Bannière : la couleur principale seule, assombrie vers le bas (jamais « salie » par la secondaire)
  const heroFrom = mix(brand, [0, 0, 0], 0.78);
  const heroMid = mix(brand, [0, 0, 0], 0.9);

  return {
    '--brand': toHex(brand),
    '--brand-ink': toHex(onBrand),
    '--brand-strong': toHex(readableOnWhite(brand)),
    '--brand-hover': toHex(mix(brand, onBrand === WHITE ? [0, 0, 0] : WHITE, 0.88)),
    '--brand-soft': toHex(mix(brand, WHITE, 0.1)),
    '--brand-softer': toHex(mix(brand, WHITE, 0.05)),
    '--brand-ring': `rgba(${brand.map(Math.round).join(', ')}, 0.28)`,
    '--brand-rgb': brand.map(Math.round).join(', '),
    '--accent': toHex(accent),
    '--hero-from': toHex(heroFrom),
    '--hero-to': toHex(brand),
    '--hero-ink': toHex(contrast(heroMid, WHITE) >= 3 ? WHITE : INK),
    // Fonds des visuels sans photo : variations douces autour des deux couleurs
    // (teintes voisines de la couleur principale : la secondaire est souvent un gris)
    '--tint-0': toHex(mix(brand, WHITE, 0.13)),
    '--tint-1': toHex(mix(rotateHue(brand, 28), WHITE, 0.12)),
    '--tint-2': toHex(mix(rotateHue(brand, -28), WHITE, 0.12)),
    '--tint-3': toHex(mix(brand, WHITE, 0.07)),
    '--tint-ink': toHex(readableOnWhite(mix(brand, INK, 0.85)))
  };
}
