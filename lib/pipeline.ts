"use client";

import { runCnn } from "./cnn";
import { imageToData } from "./cv";
import { extractMetabolicFeatures } from "./metabolic";
import { buildTissueMap, classifyPixels, composition, periwound, type PixelLabels } from "./tissue";
import type {
  CnnResult,
  MetabolicFeatures,
  PeriwoundStats,
  Roi,
  TissueComposition,
  TissueMap,
} from "./types";

export const FULL_ROI: Roi = { x: 0, y: 0, w: 1, h: 1 };
export const DEFAULT_ROI: Roi = { x: 0.14, y: 0.14, w: 0.72, h: 0.72 };

export interface Prepared {
  src: string;
  img: HTMLImageElement;
  data: ImageData;
  w: number;
  h: number;
  px: PixelLabels;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode that image file"));
    img.src = src;
  });
}

/** Decode once, classify every pixel once. ROI changes then cost almost nothing. */
export async function prepare(src: string, maxSide = 512): Promise<Prepared> {
  const img = await loadImage(src);
  const { data, w, h } = imageToData(img, maxSide);
  const px = classifyPixels(data);
  return { src, img, data, w, h, px };
}

export interface RoiAnalysis {
  roi: Roi;
  map: TissueMap;
  comp: TissueComposition;
  peri: PeriwoundStats;
  feats: MetabolicFeatures;
  elapsedMs: number;
}

export function analyseRoi(p: Prepared, roi: Roi, withFeatures = true): RoiAnalysis {
  const t0 = performance.now();
  const map = buildTissueMap(p.px, roi, 64);
  const comp = composition(p.px, roi);
  const peri = periwound(p.data, roi);
  const feats = withFeatures
    ? extractMetabolicFeatures(p.data, roi)
    : ({} as MetabolicFeatures);
  return { roi, map, comp, peri, feats, elapsedMs: performance.now() - t0 };
}

export async function inferCnn(p: Prepared): Promise<CnnResult> {
  return runCnn(p.img, p.data);
}

/** Read a File (camera capture or picker) as a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("Could not read that file"));
    fr.readAsDataURL(file);
  });
}
