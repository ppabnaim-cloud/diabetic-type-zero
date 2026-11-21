/**
 * Small, dependency-free computer-vision primitives.
 * Everything here is deterministic and runs on an ImageData buffer.
 */

export interface Hsv {
  h: number; // 0..360
  s: number; // 0..1
  v: number; // 0..1
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 1e-6) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max <= 1e-6 ? 0 : d / max, v: max };
}

/** Trapezoidal membership: 0 below a, ramps to 1 across [a,b], 1 on [b,c], ramps to 0 across [c,d]. */
export function trap(x: number, a: number, b: number, c: number, d: number): number {
  if (x <= a || x >= d) return 0;
  if (x < b) return b === a ? 1 : (x - a) / (b - a);
  if (x <= c) return 1;
  return d === c ? 1 : (d - x) / (d - c);
}

/** Trapezoid on the hue circle; handles bands that wrap through 0/360. */
export function hueTrap(h: number, a: number, b: number, c: number, d: number): number {
  return Math.max(trap(h, a, b, c, d), trap(h + 360, a, b, c, d), trap(h - 360, a, b, c, d));
}

/** Redness index: red channel dominance over the mean of green and blue, normalised. */
export function redness(r: number, g: number, b: number): number {
  return (r - (g + b) / 2) / 255;
}

/** Perceptual luminance 0..1 (Rec. 709). */
export function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Draw an image into a canvas of fixed size and return its ImageData. */
export function imageToData(
  img: HTMLImageElement | HTMLCanvasElement,
  maxSide = 512
): { data: ImageData; w: number; h: number } {
  const sw = "naturalWidth" in img ? img.naturalWidth || img.width : img.width;
  const sh = "naturalHeight" in img ? img.naturalHeight || img.height : img.height;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h), w, h };
}

/** Grey plane (0..1) from ImageData. */
export function greyPlane(d: ImageData): Float32Array {
  const n = d.width * d.height;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    out[i] = luma(d.data[p], d.data[p + 1], d.data[p + 2]);
  }
  return out;
}

/** Separable box blur, radius r, on a single-channel plane. */
export function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src.slice();
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / (2 * r + 1);
      const add = row + Math.min(w - 1, x + r + 1);
      const sub = row + Math.max(0, x - r);
      sum += src[add] - src[sub];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / (2 * r + 1);
      const add = Math.min(h - 1, y + r + 1) * w + x;
      const sub = Math.max(0, y - r) * w + x;
      sum += tmp[add] - tmp[sub];
    }
  }
  return out;
}

/** Mean absolute deviation from a blurred version — a cheap texture-energy measure. */
export function textureEnergy(plane: Float32Array, w: number, h: number, r = 2): number {
  const blur = boxBlur(plane, w, h, r);
  let s = 0;
  for (let i = 0; i < plane.length; i++) s += Math.abs(plane[i] - blur[i]);
  return s / plane.length;
}

/**
 * Difference-of-Gaussians blob detector (approximated with box blurs).
 * Returns local maxima above `thresh`, non-max-suppressed with a minimum spacing.
 */
export function detectBlobs(
  plane: Float32Array,
  w: number,
  h: number,
  rInner = 2,
  rOuter = 5,
  thresh = 0.012,
  minSpacing = 4,
  polarity: 1 | -1 = 1,
  adaptiveK = 0
): { x: number; y: number; strength: number }[] {
  const a = boxBlur(plane, w, h, rInner);
  const b = boxBlur(plane, w, h, rOuter);
  const dog = new Float32Array(plane.length);
  for (let i = 0; i < dog.length; i++) dog[i] = polarity * (a[i] - b[i]);

  // An absolute floor rejects film grain and skin pores; the adaptive term
  // additionally scales with the image's own contrast so that a flat,
  // well-lit photograph does not produce hundreds of spurious "papules".
  if (adaptiveK > 0) {
    let m = 0;
    for (let i = 0; i < dog.length; i++) m += dog[i];
    m /= dog.length;
    let sd = 0;
    for (let i = 0; i < dog.length; i++) sd += (dog[i] - m) ** 2;
    sd = Math.sqrt(sd / dog.length);
    thresh = Math.max(thresh, m + adaptiveK * sd);
  }

  const cands: { x: number; y: number; strength: number }[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = dog[i];
      if (v < thresh) continue;
      let isMax = true;
      for (let dy = -1; dy <= 1 && isMax; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (dog[i + dy * w + dx] > v) {
            isMax = false;
            break;
          }
        }
      if (isMax) cands.push({ x, y, strength: v });
    }
  }
  cands.sort((p, q) => q.strength - p.strength);
  const kept: { x: number; y: number; strength: number }[] = [];
  const sp2 = minSpacing * minSpacing;
  for (const c of cands) {
    if (kept.every((k) => (k.x - c.x) ** 2 + (k.y - c.y) ** 2 > sp2)) kept.push(c);
    if (kept.length >= 4000) break;
  }
  return kept;
}

/** Percentile of a numeric array (0..1 input). */
export function percentile(values: number[] | Float32Array, p: number): number {
  if (values.length === 0) return 0;
  const arr = Array.from(values).sort((a, b) => a - b);
  const idx = Math.min(arr.length - 1, Math.max(0, Math.round(p * (arr.length - 1))));
  return arr[idx];
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Cosine similarity of two equal-length vectors. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Fraction of pixels whose colour falls in a broad, skin-tone-inclusive gamut (Fitzpatrick I-VI). */
export function skinPixelFraction(d: ImageData): number {
  let hit = 0,
    total = 0;
  for (let i = 0; i < d.data.length; i += 4) {
    const r = d.data[i],
      g = d.data[i + 1],
      b = d.data[i + 2];
    total++;
    const { h, s, v } = rgbToHsv(r, g, b);
    // Skin and wound tissue both sit in the warm half of the hue circle.
    const warm = h <= 55 || h >= 330;
    if (warm && s > 0.08 && s < 0.85 && v > 0.12 && r > g && g >= b - 12) hit++;
  }
  return total === 0 ? 0 : hit / total;
}
