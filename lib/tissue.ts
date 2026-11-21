import {
  boxBlur,
  clamp01,
  hueTrap,
  redness,
  rgbToHsv,
  trap,
} from "./cv";
import {
  BED_CLASSES,
  type PeriwoundStats,
  type Roi,
  TISSUE_CLASSES,
  type TissueClass,
  type TissueComposition,
  type TissueMap,
} from "./types";

const IDX: Record<TissueClass, number> = TISSUE_CLASSES.reduce(
  (acc, c, i) => ((acc[c] = i), acc),
  {} as Record<TissueClass, number>
);

export const TISSUE_COLOUR: Record<TissueClass, string> = {
  granulation: "#e2544f",
  slough: "#e0c04a",
  necrosis: "#2f3139",
  purulent: "#b2ce3c",
  gangrene: "#4f7a56",
  epithelial: "#f2aba2",
  background: "#0b1220",
};

export const TISSUE_LABEL: Record<TissueClass, string> = {
  granulation: "Granulation",
  slough: "Slough / fibrin",
  necrosis: "Necrosis / eschar",
  purulent: "Purulent / pus",
  gangrene: "Wet gangrene",
  epithelial: "Epithelial / peri-wound",
  background: "Background / non-tissue",
};

/**
 * Per-pixel tissue membership scores.
 *
 * Each class is a product of trapezoidal memberships over hue, saturation,
 * value and a red-dominance index. The bands were set from the descriptive
 * colourimetry of wound tissue types (beefy-red granulation, dull-yellow
 * fibrinous slough, yellow-green purulence, dusky green-black wet gangrene,
 * black dry eschar) and are deliberately soft-edged so that the argmax
 * carries a usable confidence rather than a hard decision.
 */
function scoreClasses(r: number, g: number, b: number, out: Float32Array): void {
  const { h, s, v } = rgbToHsv(r, g, b);
  const rr = redness(r, g, b);

  // Background: desaturated-bright (drape, glove, paper), near-black void, or
  // any blue/cyan (surgical drape, denim) which is never viable tissue.
  out[IDX.background] = Math.max(
    trap(s, 0, 0, 0.06, 0.17) * trap(v, 0.68, 0.8, 1, 1),
    trap(v, 0, 0, 0.045, 0.09),
    hueTrap(h, 180, 196, 255, 272) * trap(s, 0.12, 0.26, 1, 1) * trap(v, 0.15, 0.25, 1, 1)
  );

  // Dry necrosis / eschar: dark, low-to-moderate saturation, warm-neutral hue.
  out[IDX.necrosis] =
    trap(v, 0.05, 0.1, 0.24, 0.35) * trap(s, 0, 0, 0.42, 0.68) * (1 - hueTrap(h, 85, 105, 200, 225));

  // Wet gangrene: dark AND saturated with a green-blue or dusky purple cast.
  out[IDX.gangrene] =
    trap(v, 0.07, 0.13, 0.36, 0.48) *
    trap(s, 0.16, 0.3, 1, 1) *
    Math.max(hueTrap(h, 78, 104, 192, 216), hueTrap(h, 248, 266, 302, 322));

  // Purulent discharge / pus: yellow-green, saturated, glossy (high value).
  out[IDX.purulent] =
    hueTrap(h, 44, 58, 92, 106) * trap(s, 0.24, 0.38, 1, 1) * trap(v, 0.38, 0.5, 1, 1);

  // Slough / fibrin: dull yellow to creamy-white, mid-to-low saturation.
  out[IDX.slough] = Math.max(
    hueTrap(h, 20, 33, 55, 70) * trap(s, 0.1, 0.18, 0.5, 0.7) * trap(v, 0.4, 0.5, 1, 1),
    trap(s, 0.03, 0.08, 0.2, 0.33) * trap(v, 0.52, 0.63, 0.95, 1) * hueTrap(h, 12, 24, 72, 92)
  );

  /*
   * Granulation: red to beefy-red, saturated, red-dominant — and crucially
   * NOT bright. Inflamed peri-wound skin is also red and saturated, so hue
   * alone does not separate them; what distinguishes granulation is that it
   * sits closer to pure red (within about 12 degrees of 0) and is darker,
   * because it is deep vascular tissue rather than illuminated epidermis.
   * Without the value ceiling, spreading cellulitis around an ulcer is scored
   * as granulation and the healing assessment inverts.
   */
  out[IDX.granulation] =
    hueTrap(h, 334, 348, 372, 382) *
    trap(s, 0.3, 0.42, 1, 1) *
    trap(v, 0.14, 0.22, 0.82, 0.95) *
    trap(rr, 0.06, 0.15, 1, 1);

  // Epithelial / peri-wound skin: pink-tan through brown, and bright. The
  // saturation ceiling is generous so that both Fitzpatrick V-VI skin and
  // erythematous skin stay here rather than being counted as wound bed.
  out[IDX.epithelial] =
    hueTrap(h, 5, 15, 38, 52) * trap(s, 0.08, 0.16, 0.7, 0.88) * trap(v, 0.2, 0.3, 1, 1);
}

export interface PixelLabels {
  cls: Uint8Array;
  conf: Float32Array;
  w: number;
  h: number;
}

export function classifyPixels(d: ImageData): PixelLabels {
  const n = d.width * d.height;
  const cls = new Uint8Array(n);
  const conf = new Float32Array(n);
  const scores = new Float32Array(TISSUE_CLASSES.length);

  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const r = d.data[p],
      g = d.data[p + 1],
      b = d.data[p + 2];
    scores.fill(0);
    scoreClasses(r, g, b, scores);

    let best = 0,
      bestV = scores[0],
      second = 0;
    for (let k = 1; k < scores.length; k++) {
      if (scores[k] > bestV) {
        second = bestV;
        bestV = scores[k];
        best = k;
      } else if (scores[k] > second) second = scores[k];
    }

    if (bestV < 0.06) {
      // Ambiguous pixel: fall back on coarse value/saturation reasoning.
      const { s, v } = rgbToHsv(r, g, b);
      best = v < 0.3 ? IDX.necrosis : s < 0.14 ? IDX.background : IDX.epithelial;
      conf[i] = 0.15;
    } else {
      conf[i] = clamp01(bestV === 0 ? 0 : (bestV - second) / bestV) * 0.5 + clamp01(bestV) * 0.5;
    }
    cls[i] = best;
  }
  return { cls, conf, w: d.width, h: d.height };
}

function roiPixelBounds(roi: Roi, w: number, h: number) {
  const x0 = Math.max(0, Math.floor(roi.x * w));
  const y0 = Math.max(0, Math.floor(roi.y * h));
  const x1 = Math.min(w, Math.ceil((roi.x + roi.w) * w));
  const y1 = Math.min(h, Math.ceil((roi.y + roi.h) * h));
  return { x0, y0, x1: Math.max(x0 + 1, x1), y1: Math.max(y0 + 1, y1) };
}

/** Relative weight each tissue class contributes to the infection-concern field. */
const INFECTION_WEIGHT: Record<TissueClass, number> = {
  purulent: 1.0,
  gangrene: 1.0,
  necrosis: 0.55,
  slough: 0.22,
  granulation: 0.0,
  epithelial: 0.0,
  background: 0.0,
};

/** Aggregate pixel labels into a coarse grid, majority-smoothed, plus an infection field. */
export function buildTissueMap(px: PixelLabels, roi: Roi, gw = 64): TissueMap {
  const { x0, y0, x1, y1 } = roiPixelBounds(roi, px.w, px.h);
  const roiW = x1 - x0;
  const roiH = y1 - y0;
  const gh = Math.max(8, Math.round((gw * roiH) / roiW));

  const raw = new Uint8Array(gw * gh);
  const conf = new Float32Array(gw * gh);
  const infection = new Float32Array(gw * gh);
  const counts = new Float32Array(TISSUE_CLASSES.length);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const px0 = x0 + Math.floor((gx * roiW) / gw);
      const px1 = x0 + Math.max(px0 + 1, Math.floor(((gx + 1) * roiW) / gw));
      const py0 = y0 + Math.floor((gy * roiH) / gh);
      const py1 = y0 + Math.max(py0 + 1, Math.floor(((gy + 1) * roiH) / gh));
      counts.fill(0);
      let cSum = 0,
        nPix = 0,
        infSum = 0;
      for (let y = py0; y < py1; y++) {
        for (let x = px0; x < px1; x++) {
          const i = y * px.w + x;
          counts[px.cls[i]] += 1;
          cSum += px.conf[i];
          infSum += INFECTION_WEIGHT[TISSUE_CLASSES[px.cls[i]]];
          nPix++;
        }
      }
      let best = 0;
      for (let k = 1; k < counts.length; k++) if (counts[k] > counts[best]) best = k;
      const gi = gy * gw + gx;
      raw[gi] = best;
      conf[gi] = nPix ? cSum / nPix : 0;
      infection[gi] = nPix ? infSum / nPix : 0;
    }
  }

  // 3x3 majority filter removes isolated speckle without blurring boundaries.
  const cls = new Uint8Array(raw.length);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      counts.fill(0);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const yy = Math.min(gh - 1, Math.max(0, gy + dy));
          const xx = Math.min(gw - 1, Math.max(0, gx + dx));
          counts[raw[yy * gw + xx]] += dx === 0 && dy === 0 ? 1.6 : 1;
        }
      let best = 0;
      for (let k = 1; k < counts.length; k++) if (counts[k] > counts[best]) best = k;
      cls[gy * gw + gx] = best;
    }
  }

  return { gw, gh, cls, conf, infection: boxBlur(infection, gw, gh, 2) };
}

/** Tissue composition as a percentage of the wound bed, computed per-pixel inside the ROI. */
export function composition(px: PixelLabels, roi: Roi): TissueComposition {
  const { x0, y0, x1, y1 } = roiPixelBounds(roi, px.w, px.h);
  const counts = new Float64Array(TISSUE_CLASSES.length);
  let roiPix = 0,
    confSum = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * px.w + x;
      counts[px.cls[i]] += 1;
      confSum += px.conf[i];
      roiPix++;
    }
  }
  const bed = BED_CLASSES.reduce((s, c) => s + counts[IDX[c]], 0);
  const pct = (c: TissueClass) => (bed > 0 ? (counts[IDX[c]] / bed) * 100 : 0);

  return {
    granulation: pct("granulation"),
    slough: pct("slough"),
    necrosis: pct("necrosis"),
    purulent: pct("purulent"),
    gangrene: pct("gangrene"),
    bedCells: bed,
    gridCells: roiPix,
    bedFractionOfRoi: roiPix ? bed / roiPix : 0,
    meanConfidence: roiPix ? confSum / roiPix : 0,
    epithelialPct: roiPix ? (counts[IDX.epithelial] / roiPix) * 100 : 0,
  };
}

/**
 * Peri-wound erythema: mean redness in a ring just outside the ROI, compared
 * with the calmest quartile of that ring (used as the patient's own skin baseline).
 * Scale-free, so it survives differences in camera and lighting between visits.
 */
export function periwound(d: ImageData, roi: Roi, ringFrac = 0.22): PeriwoundStats {
  const w = d.width,
    h = d.height;
  const inner = roiPixelBounds(roi, w, h);
  const padX = Math.round(roi.w * w * ringFrac);
  const padY = Math.round(roi.h * h * ringFrac);
  const ox0 = Math.max(0, inner.x0 - padX);
  const oy0 = Math.max(0, inner.y0 - padY);
  const ox1 = Math.min(w, inner.x1 + padX);
  const oy1 = Math.min(h, inner.y1 + padY);

  const vals: number[] = [];
  for (let y = oy0; y < oy1; y++) {
    for (let x = ox0; x < ox1; x++) {
      const insideRoi = x >= inner.x0 && x < inner.x1 && y >= inner.y0 && y < inner.y1;
      if (insideRoi) continue;
      const p = (y * w + x) * 4;
      const { s, v } = rgbToHsv(d.data[p], d.data[p + 1], d.data[p + 2]);
      if (v < 0.1 || s < 0.06) continue; // skip drape / shadow
      vals.push(redness(d.data[p], d.data[p + 1], d.data[p + 2]));
    }
  }
  if (vals.length < 50) return { erythemaIndex: 0, ringRedness: 0, baselineRedness: 0 };
  vals.sort((a, b) => a - b);
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const baseline = vals[Math.floor(vals.length * 0.25)];
  return {
    ringRedness: mean,
    baselineRedness: baseline,
    erythemaIndex: clamp01((mean - baseline) / 0.14),
  };
}
