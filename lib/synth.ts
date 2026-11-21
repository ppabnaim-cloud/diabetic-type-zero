"use client";

import type { ModuleId } from "./types";

/* ------------------------------------------------------------------ *
 * Seeded procedural image synthesis.
 *
 * Every demo image in this app is generated here, in the browser, from a
 * fixed seed. No patient photograph is bundled, fetched or stored. The
 * generators are tuned so that the resulting colourimetry and texture are
 * representative of the condition being illustrated; the analyser then
 * measures them independently, with no knowledge of which demo was chosen.
 * ------------------------------------------------------------------ */

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Field = (u: number, v: number) => number;

function valueNoise(seed: number, n: number): Field {
  const rnd = mulberry32(seed);
  const g = new Float32Array((n + 1) * (n + 1));
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = Math.min(0.9999, Math.max(0, u)) * n;
    const y = Math.min(0.9999, Math.max(0, v)) * n;
    const xi = Math.floor(x),
      yi = Math.floor(y);
    const sx = smooth(x - xi),
      sy = smooth(y - yi);
    const a = g[yi * (n + 1) + xi],
      b = g[yi * (n + 1) + xi + 1];
    const c = g[(yi + 1) * (n + 1) + xi],
      d = g[(yi + 1) * (n + 1) + xi + 1];
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };
}

function fbm(seed: number, octaves = 4, base = 4): Field {
  const layers: Field[] = [];
  for (let i = 0; i < octaves; i++) layers.push(valueNoise(seed + i * 977, base * 2 ** i));
  return (u, v) => {
    let s = 0,
      amp = 1,
      tot = 0;
    for (const l of layers) {
      s += amp * l(u, v);
      tot += amp;
      amp *= 0.5;
    }
    return s / tot;
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

type Rgb = [number, number, number];

/** Representative skin tones, Fitzpatrick III-V (the dominant local phenotypes). */
const SKIN: Record<string, Rgb> = {
  iii: [226, 185, 152],
  iv: [196, 150, 112],
  v: [148, 104, 72],
};

const TISSUE: Record<string, Rgb> = {
  granulation: [178, 52, 46],
  granulationBright: [206, 74, 64],
  slough: [214, 191, 118],
  sloughPale: [228, 214, 170],
  necrosis: [38, 32, 30],
  purulent: [186, 196, 78],
  gangrene: [58, 78, 56],
  an: [104, 70, 46],
  xanthoma: [226, 206, 112],
};

function noiseWarp(f: Field, amp: number, seed: number): Field {
  const wx = valueNoise(seed + 31, 6);
  const wy = valueNoise(seed + 59, 6);
  return (u, v) => f(u + amp * (wx(u, v) - 0.5), v + amp * (wy(u, v) - 0.5));
}

/* ------------------------------------------------------------------ */

interface SkinOpts {
  tone: Rgb;
  seed: number;
  erythema?: number; // 0..1 diffuse redness
}

function skinShader({ tone, seed, erythema = 0 }: SkinOpts) {
  const coarse = fbm(seed, 4, 3);
  const fine = valueNoise(seed + 7, 110);
  const pores = valueNoise(seed + 13, 220);
  return (u: number, v: number): Rgb => {
    const shade = 0.82 + 0.3 * coarse(u, v);
    const grain = 0.96 + 0.08 * fine(u, v);
    const pore = 0.985 + 0.03 * pores(u, v);
    const k = shade * grain * pore;
    let c: Rgb = [tone[0] * k, tone[1] * k, tone[2] * k];
    if (erythema > 0) {
      c = [c[0] + 46 * erythema, c[1] - 12 * erythema, c[2] - 14 * erythema];
    }
    return c;
  };
}

function paint(size: number, shader: (u: number, v: number) => Rgb, watermark = true): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = shader((x + 0.5) / size, (y + 0.5) / size);
      const p = (y * size + x) * 4;
      img.data[p] = Math.max(0, Math.min(255, r));
      img.data[p + 1] = Math.max(0, Math.min(255, g));
      img.data[p + 2] = Math.max(0, Math.min(255, b));
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (watermark) {
    const fs = Math.round(size * 0.038);
    ctx.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
    const text = "SYNTHETIC DEMO — NOT A PATIENT IMAGE";
    const w = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(size - w - fs * 1.2, size - fs * 2.1, w + fs * 1.2, fs * 2.1);
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillText(text, size - w - fs * 0.6, size - fs * 0.7);
  }
  return c;
}

/* --------------------------- generators --------------------------- */

/** Velvety hyperpigmented plaque across a skin fold — acanthosis nigricans. */
function acanthosis(seed: number, tone: Rgb, strength: number) {
  const skin = skinShader({ tone, seed });
  const band = noiseWarp(fbm(seed + 211, 3, 3), 0.18, seed);
  const ridge = valueNoise(seed + 401, 26);
  const velvet = valueNoise(seed + 503, 150);
  return (u: number, v: number): Rgb => {
    const base = skin(u, v);
    // A broad, soft-edged plaque occupying the centre of the frame.
    const field = band(u, v) * 0.6 + (1 - Math.abs(v - 0.48) * 2.3) * 0.4;
    let m = smoothstep(0.42, 0.72, field) * strength;
    if (m <= 0.01) return base;
    // Velvety look: fine ridging plus accentuated skin-line relief.
    const r = 0.5 + 0.5 * Math.sin(v * 170 + 6 * ridge(u, v));
    const relief = 1 + 0.17 * (r - 0.5) + 0.1 * (velvet(u, v) - 0.5);
    const plaque = mixRgb(base, TISSUE.an, m * 0.86);
    return [plaque[0] * relief, plaque[1] * relief, plaque[2] * relief];
  };
}

/** Pedunculated papules — skin tags. */
function skinTags(seed: number, tone: Rgb, count: number, radius: number) {
  const skin = skinShader({ tone, seed });
  const rnd = mulberry32(seed + 90);
  const tags = Array.from({ length: count }, () => ({
    x: 0.08 + 0.84 * rnd(),
    y: 0.08 + 0.84 * rnd(),
    r: radius * (0.6 + 0.9 * rnd()),
    t: 0.5 + 0.5 * rnd(),
  }));
  return (u: number, v: number): Rgb => {
    let c = skin(u, v);
    for (const t of tags) {
      const d = Math.hypot(u - t.x, v - t.y);
      if (d > t.r * 1.9) continue;
      const body = smoothstep(t.r, t.r * 0.45, d);
      if (body > 0.02) {
        // Papule body: slightly darker and browner, with a top-left highlight.
        const lift = 1 + 0.26 * (1 - d / Math.max(1e-6, t.r)) * (u < t.x && v < t.y ? 1 : -0.45);
        const col = mixRgb(c, [tone[0] * 0.7, tone[1] * 0.6, tone[2] * 0.55], body * t.t);
        c = [col[0] * lift, col[1] * lift, col[2] * lift];
      }
      // Contact shadow under the papule.
      const sh = smoothstep(t.r * 1.75, t.r * 1.0, d) * 0.2 * (1 - body);
      c = [c[0] * (1 - sh), c[1] * (1 - sh), c[2] * (1 - sh)];
    }
    return c;
  };
}

/** Dense cobblestone micro-papules — finger pebbles over knuckles. */
function fingerPebbles(seed: number, tone: Rgb) {
  const skin = skinShader({ tone, seed });
  const jitter = valueNoise(seed + 55, 14);
  return (u: number, v: number): Rgb => {
    const c = skin(u, v);
    const n = 19;
    const gx = u * n + 0.7 * jitter(u, v);
    const gy = v * n + 0.7 * jitter(v, u);
    const fx = gx - Math.floor(gx) - 0.5;
    const fy = gy - Math.floor(gy) - 0.5;
    const d = Math.hypot(fx, fy);
    const dome = smoothstep(0.42, 0.1, d);
    // Top-left lit, bottom-right shadowed — reads as relief, not pigment.
    const lam = 1 + 0.22 * dome * (-(fx + fy) / 0.9);
    const k = lam * (1 - 0.07 * (1 - dome));
    return [c[0] * k, c[1] * k, c[2] * k];
  };
}

/** Yellow lipid plaques — xanthelasma / eruptive xanthoma. */
function xanthoma(seed: number, tone: Rgb, count: number, radius: number) {
  const skin = skinShader({ tone, seed });
  const rnd = mulberry32(seed + 77);
  const edge = fbm(seed + 303, 3, 6);
  const blobs = Array.from({ length: count }, () => ({
    x: 0.15 + 0.7 * rnd(),
    y: 0.2 + 0.6 * rnd(),
    r: radius * (0.7 + 0.7 * rnd()),
  }));
  return (u: number, v: number): Rgb => {
    let c = skin(u, v);
    for (const b of blobs) {
      const d = Math.hypot((u - b.x) * 1.5, v - b.y) / Math.max(1e-6, b.r);
      const m = smoothstep(1.0, 0.55, d * (0.85 + 0.3 * edge(u, v)));
      if (m > 0.01) c = mixRgb(c, TISSUE.xanthoma, m * 0.9);
    }
    return c;
  };
}

/** Brown atrophic macules — diabetic dermopathy. */
function dermopathy(seed: number, tone: Rgb, count: number) {
  const skin = skinShader({ tone, seed });
  const rnd = mulberry32(seed + 404);
  const spots = Array.from({ length: count }, () => ({
    x: 0.06 + 0.88 * rnd(),
    y: 0.06 + 0.88 * rnd(),
    r: 0.022 + 0.03 * rnd(),
  }));
  return (u: number, v: number): Rgb => {
    let c = skin(u, v);
    for (const s of spots) {
      const d = Math.hypot(u - s.x, (v - s.y) * 1.3) / s.r;
      const m = smoothstep(1.1, 0.4, d);
      if (m > 0.01) c = mixRgb(c, [96, 62, 42], m * 0.72);
    }
    return c;
  };
}

export interface WoundOpts {
  seed: number;
  tone: Rgb;
  /** Target proportions of the wound bed; they are normalised internally. */
  bed: { purulent?: number; gangrene?: number; necrosis?: number; slough?: number; granulation?: number };
  radius?: number;
  erythema?: number; // peri-wound redness, 0..1
  moist?: number; // specular highlight strength 0..1
}

/**
 * Generic diabetic-foot-ulcer generator.
 *
 * The bed is filled by thresholding a "centrality" field — a blend of fractal
 * noise and distance from the wound centre — against the cumulative target
 * proportions. Purulence and necrosis therefore sit centrally and granulation
 * peripherally, as they tend to clinically.
 */
function wound({ seed, tone, bed, radius = 0.3, erythema = 0, moist = 0.35 }: WoundOpts) {
  const skin = skinShader({ tone, seed, erythema: erythema * 0.35 });
  const edgeN = valueNoise(seed + 808, 9);
  const tissueN = fbm(seed + 909, 4, 5);
  const spec = valueNoise(seed + 1313, 70);
  const grainN = valueNoise(seed + 1717, 180);

  const order: [keyof WoundOpts["bed"], Rgb][] = [
    ["purulent", TISSUE.purulent],
    ["gangrene", TISSUE.gangrene],
    ["necrosis", TISSUE.necrosis],
    ["slough", TISSUE.slough],
    ["granulation", TISSUE.granulation],
  ];
  const total = order.reduce((s, [k]) => s + (bed[k] ?? 0), 0) || 1;
  const cuts: { col: Rgb; upTo: number }[] = [];
  let acc = 0;
  for (const [k, col] of order) {
    acc += (bed[k] ?? 0) / total;
    cuts.push({ col, upTo: acc });
  }

  const geom = (u: number, v: number) => {
    const dx = u - 0.5,
      dy = (v - 0.5) * 1.12;
    const ang = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
    return { dx, dy, d: Math.hypot(dx, dy), r0: radius * (0.78 + 0.44 * edgeN(ang, 0.5)) };
  };
  const centralityAt = (u: number, v: number, d: number, r0: number) =>
    0.56 * (1 - Math.min(1, d / Math.max(1e-6, r0))) + 0.44 * tissueN(u, v);

  /*
   * The centrality field is not uniformly distributed, so thresholding it
   * directly against cumulative proportions would not produce the proportions
   * asked for. Sampling the field inside the wound and inverting its empirical
   * CDF makes the rank uniform, so each tissue class ends up occupying the
   * share of the bed the demo specifies — which is exactly what the analyser
   * is then asked to recover, independently.
   */
  const samples: number[] = [];
  for (let i = 0; i < 160; i++) {
    for (let j = 0; j < 160; j++) {
      const su = (i + 0.5) / 160,
        sv = (j + 0.5) / 160;
      const g = geom(su, sv);
      if (g.d < g.r0) samples.push(centralityAt(su, sv, g.d, g.r0));
    }
  }
  samples.sort((a, b) => a - b);
  const rank = (x: number) => {
    let lo = 0,
      hi = samples.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (samples[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return samples.length ? lo / samples.length : 0.5;
  };

  return (u: number, v: number): Rgb => {
    const { d, r0 } = geom(u, v);

    const base = skin(u, v);
    // Peri-wound erythema decays outward from the wound margin.
    const ring = smoothstep(r0 * 2.3, r0, d) * erythema;
    const outer: Rgb = [base[0] + 58 * ring, base[1] - 18 * ring, base[2] - 20 * ring];

    const inside = smoothstep(r0 + 0.012, r0 - 0.012, d);
    if (inside <= 0.01) return outer;

    // Rank-normalised centrality: 0 at the wound centre, 1 at the margin.
    const q = 1 - rank(centralityAt(u, v, d, r0));
    let col = cuts[cuts.length - 1].col;
    for (const c of cuts) {
      if (q <= c.upTo) {
        col = c.col;
        break;
      }
    }

    // Granular relief and moist specular highlight.
    const grain = 0.9 + 0.2 * grainN(u, v);
    let t: Rgb = [col[0] * grain, col[1] * grain, col[2] * grain];
    const s = Math.max(0, spec(u, v) - 0.82) / 0.18;
    const sg = s * moist;
    t = [t[0] + 95 * sg, t[1] + 95 * sg, t[2] + 88 * sg];

    // Rolled, macerated wound margin — kept narrow so it does not swamp the
    // bed, and pale rather than pink so it reads as epithelium, not granulation.
    const margin = smoothstep(r0 - 0.004, r0 - 0.022, d);
    const edgeCol = mixRgb([208, 176, 164], t, margin);
    return mixRgb(outer, edgeCol, inside);
  };
}

/* ------------------------- demo registry -------------------------- */

export interface DemoSpec {
  id: string;
  module: ModuleId;
  title: string;
  note: string;
  /** Progression module only: which of the two time points this image is. */
  slot?: "A" | "B";
  pairId?: string;
  shader: (size: number) => HTMLCanvasElement;
  /** Body site to pre-select in Station C (metabolic module). */
  site?: string;
}

const S = (f: (u: number, v: number) => Rgb) => (size: number) => paint(size, f);

export const DEMOS: DemoSpec[] = [
  {
    id: "an-neck",
    module: "metabolic",
    title: "Acanthosis nigricans — posterior neck",
    note: "Velvety hyperpigmented plaque, Fitzpatrick IV",
    site: "neck",
    shader: S(acanthosis(1201, SKIN.iv, 1.0)),
  },
  {
    id: "an-axilla-mild",
    module: "metabolic",
    title: "Early acanthosis nigricans — axilla",
    note: "Subtle plaque, Fitzpatrick V",
    site: "axilla",
    shader: S(acanthosis(3307, SKIN.v, 0.78)),
  },
  {
    id: "tags-neck",
    module: "metabolic",
    title: "Acrochordons — lateral neck",
    note: "Multiple pedunculated papules",
    site: "neck",
    shader: S(skinTags(777, SKIN.iv, 40, 0.028)),
  },
  {
    id: "pebbles-knuckle",
    module: "metabolic",
    title: "Finger pebbles — knuckles",
    note: "Cobblestone micro-papules (Huntley's papules)",
    site: "knuckles",
    shader: S(fingerPebbles(2024, SKIN.iv)),
  },
  {
    id: "xanthelasma",
    module: "metabolic",
    title: "Xanthelasma — periorbital",
    note: "Yellow lipid plaques",
    site: "eyelid",
    shader: S(xanthoma(515, SKIN.iii, 3, 0.1)),
  },
  {
    id: "dermopathy-shin",
    module: "metabolic",
    title: "Diabetic dermopathy — shin",
    note: "Brown atrophic macules (established disease)",
    site: "shin",
    shader: S(dermopathy(616, SKIN.iv, 22)),
  },
  {
    id: "normal-neck",
    module: "metabolic",
    title: "Normal neck skin — negative control",
    note: "No Tier 1 features; use to check specificity",
    site: "neck",
    shader: S(skinShader({ tone: SKIN.iv, seed: 4242 })),
  },

  {
    id: "dfu-infected",
    module: "infection",
    title: "Infected DFU — purulent, plantar forefoot",
    note: "Frank pus with necrotic centre and spreading erythema",
    shader: S(
      wound({
        seed: 9001,
        tone: SKIN.iv,
        bed: { purulent: 44, necrosis: 16, gangrene: 5, slough: 20, granulation: 15 },
        radius: 0.3,
        erythema: 0.85,
        moist: 0.35,
      })
    ),
  },
  {
    id: "dfu-gangrene",
    module: "infection",
    title: "Wet gangrene — forefoot",
    note: "Dusky green-black bed, limb-threatening appearance",
    shader: S(
      wound({
        seed: 9107,
        tone: SKIN.v,
        bed: { gangrene: 34, necrosis: 30, purulent: 14, slough: 14, granulation: 8 },
        radius: 0.34,
        erythema: 0.9,
        moist: 0.4,
      })
    ),
  },
  {
    id: "dfu-clean",
    module: "infection",
    title: "Non-infected DFU — negative control",
    note: "Clean beefy-red granulating bed, calm peri-wound skin",
    shader: S(
      wound({
        seed: 9211,
        tone: SKIN.iv,
        bed: { granulation: 84, slough: 14, necrosis: 2 },
        radius: 0.26,
        erythema: 0.06,
        moist: 0.3,
      })
    ),
  },

  {
    id: "prog-t0",
    module: "progression",
    slot: "A",
    pairId: "healing",
    title: "Visit 1 (day 0) — sloughy bed",
    note: "Mostly fibrinous slough, limited granulation",
    shader: S(
      wound({
        seed: 7001,
        tone: SKIN.iv,
        bed: { slough: 58, granulation: 26, necrosis: 12, purulent: 4 },
        radius: 0.3,
        erythema: 0.3,
        moist: 0.35,
      })
    ),
  },
  {
    id: "prog-t1",
    module: "progression",
    slot: "B",
    pairId: "healing",
    title: "Visit 2 (day 14) — granulating",
    note: "Same ulcer after debridement and offloading",
    shader: S(
      wound({
        seed: 7001,
        tone: SKIN.iv,
        bed: { granulation: 76, slough: 20, necrosis: 3, purulent: 1 },
        radius: 0.25,
        erythema: 0.12,
        moist: 0.38,
      })
    ),
  },
  {
    id: "prog-bad-t1",
    module: "progression",
    slot: "B",
    pairId: "deteriorating",
    title: "Visit 2 (day 14) — deteriorating",
    note: "Alternative follow-up: granulation lost to slough and pus",
    shader: S(
      wound({
        seed: 7001,
        tone: SKIN.iv,
        bed: { slough: 60, purulent: 16, necrosis: 20, granulation: 4 },
        radius: 0.32,
        erythema: 0.78,
        moist: 0.38,
      })
    ),
  },
];

const cache = new Map<string, string>();

/** Render a demo to a data URL, memoised for the lifetime of the page. */
export function renderDemo(id: string, size = 448): string {
  const key = `${id}@${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const spec = DEMOS.find((d) => d.id === id);
  if (!spec) throw new Error(`unknown demo: ${id}`);
  const url = spec.shader(size).toDataURL("image/png");
  cache.set(key, url);
  return url;
}

export function demosFor(module: ModuleId): DemoSpec[] {
  return DEMOS.filter((d) => d.module === module);
}
