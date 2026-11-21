"use client";

import type { BodySite, ModuleId, Roi } from "./types";

/**
 * Demo images are real clinical photographs served from /public/demo and
 * described by /public/demo/manifest.json, which is fetched at runtime.
 *
 * Keeping the manifest out of the bundle means images can be added, removed
 * or re-cropped by editing one JSON file and dropping in a photograph — no
 * code change and no rebuild of the application logic.
 */
export interface DemoSpec {
  id: string;
  module: ModuleId;
  file: string;
  title: string;
  note?: string;
  /** Metabolic module: pre-selects the body site in Station C. */
  site?: BodySite;
  /** Progression module: which visit this image represents. */
  slot?: "A" | "B";
  pairId?: string;
  /** Suggested region of interest, as fractions of the image. */
  roi?: Roi;
  credit?: string;
}

export interface DemoManifest {
  version: number;
  note?: string;
  images: DemoSpec[];
}

const EMPTY: DemoManifest = { version: 0, images: [] };

let cache: Promise<DemoManifest> | null = null;

export function loadManifest(): Promise<DemoManifest> {
  if (cache) return cache;
  cache = fetch("/demo/manifest.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : EMPTY))
    .then((m: DemoManifest) => {
      if (!m || !Array.isArray(m.images)) return EMPTY;
      return { ...m, images: m.images.filter((i) => i && i.id && i.file && i.module) };
    })
    .catch(() => EMPTY);
  return cache;
}

export function demoUrl(spec: DemoSpec): string {
  return `/demo/${spec.file}`;
}

/**
 * Probe each image and keep only those that actually load. A manifest entry
 * whose file is missing must not leave a broken tile in the interface during
 * a live demonstration.
 */
export function filterAvailable(specs: DemoSpec[]): Promise<DemoSpec[]> {
  return Promise.all(
    specs.map(
      (s) =>
        new Promise<DemoSpec | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(s);
          img.onerror = () => resolve(null);
          img.src = demoUrl(s);
        })
    )
  ).then((r) => r.filter((x): x is DemoSpec => x !== null));
}

export async function demosFor(module: ModuleId): Promise<DemoSpec[]> {
  const m = await loadManifest();
  return filterAvailable(m.images.filter((i) => i.module === module));
}
