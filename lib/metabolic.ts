import {
  boxBlur,
  clamp01,
  detectBlobs,
  greyPlane,
  percentile,
  redness,
  rgbToHsv,
  textureEnergy,
} from "./cv";
import type { BodySite, MetabolicFeatures, Roi, SignScore } from "./types";

export const BODY_SITES: { id: BodySite; label: string }[] = [
  { id: "neck", label: "Posterior / lateral neck" },
  { id: "axilla", label: "Axilla" },
  { id: "groin", label: "Groin" },
  { id: "knuckles", label: "Knuckles / finger joints" },
  { id: "elbow_knee", label: "Elbow / knee" },
  { id: "eyelid", label: "Eyelid / periorbital" },
  { id: "extensor_buttock", label: "Extensor surface / buttock" },
  { id: "shin", label: "Shin (pretibial)" },
  { id: "face", label: "Face" },
  { id: "other", label: "Other / unsure" },
];

export interface SignDef {
  id: string;
  label: string;
  tier: 1 | 2 | 3;
  appearance: string;
  sites: string;
  stage: string;
  /** Site multipliers; `*` is the fallback. */
  prior: Partial<Record<BodySite | "*", number>>;
  score: (f: MetabolicFeatures) => { raw: number; evidence: string[] };
}

const ramp = (x: number, lo: number, hi: number) => clamp01((x - lo) / (hi - lo));

export const SIGNS: SignDef[] = [
  {
    id: "acanthosis_nigricans",
    label: "Acanthosis nigricans",
    tier: 1,
    appearance: 'Velvety, thickened, hyperpigmented ("dirty"-looking) skin',
    sites: "Posterior/lateral neck, axillae, groin, knuckles, elbows, knees",
    stage: "Insulin resistance → pre-diabetes → young-onset T2DM",
    prior: { neck: 1, axilla: 1, groin: 1, knuckles: 0.95, elbow_knee: 0.9, other: 0.6, "*": 0.3 },
    score: (f) => {
      const pig = ramp(f.hyperpigmentationIndex, 0.14, 0.62);
      const vel = ramp(f.velvetyTextureEnergy, 0.0042, 0.011);
      const ext = ramp(f.pigmentedFraction, 0.06, 0.42);
      const ev: string[] = [];
      if (pig > 0.25) ev.push(`hyperpigmentation index ${f.hyperpigmentationIndex.toFixed(2)} (saturation rise ${f.pigmentSaturationGain.toFixed(3)}, not shadow)`);
      if (ext > 0.25) ev.push(`plaque covers ${(f.pigmentedFraction * 100).toFixed(0)}% of the field`);
      if (vel > 0.25) ev.push(`velvety fine-scale texture energy ${f.velvetyTextureEnergy.toFixed(4)}`);
      return { raw: 0.62 * pig + 0.24 * ext + 0.14 * vel, evidence: ev };
    },
  },
  {
    id: "acrochordons",
    label: "Acrochordons (skin tags)",
    tier: 1,
    appearance: "Small soft pedunculated papules, often alongside acanthosis nigricans",
    sites: "Neck, axillae, eyelids",
    stage: "Insulin resistance, pre-diabetes",
    prior: { neck: 1, axilla: 1, eyelid: 0.95, groin: 0.8, other: 0.5, "*": 0.3 },
    score: (f) => {
      const pap = ramp(f.papuleDensity, 0.8, 3.0);
      const tex = ramp(f.velvetyTextureEnergy, 0.0042, 0.011);
      const ev: string[] = [];
      if (pap > 0.3) ev.push(`${f.papuleCount} pedunculated/papular blobs (${f.papuleDensity.toFixed(1)} per 10k px)`);
      if (tex > 0.3) ev.push("raised surface texture");
      return { raw: 0.62 * pap + 0.38 * tex, evidence: ev };
    },
  },
  {
    id: "finger_pebbles",
    label: "Finger pebbles / knuckle pads (Huntley's papules)",
    tier: 1,
    appearance: "Grouped tiny papules giving a cobblestone texture",
    sites: "Over knuckles and finger joints",
    stage: "Insulin resistance, diabetes",
    prior: { knuckles: 1, elbow_knee: 0.5, other: 0.35, "*": 0.2 },
    score: (f) => {
      const pap = ramp(f.papuleDensity, 3.2, 11);
      const tex = ramp(f.velvetyTextureEnergy, 0.0042, 0.012);
      const ev: string[] = [];
      if (pap > 0.3) ev.push(`cobblestone papule density ${f.papuleDensity.toFixed(1)} per 10k px`);
      if (tex > 0.3) ev.push("high-frequency surface relief");
      return { raw: 0.68 * pap + 0.32 * tex, evidence: ev };
    },
  },
  {
    id: "eruptive_xanthoma",
    label: "Eruptive xanthomas",
    tier: 2,
    appearance: "Crops of yellow-red papules (severe hypertriglyceridaemia, often uncontrolled diabetes)",
    sites: "Extensor surfaces and buttocks",
    stage: "Metabolic syndrome / uncontrolled diabetes",
    prior: { extensor_buttock: 1, elbow_knee: 0.9, other: 0.5, "*": 0.3 },
    score: (f) => {
      const yel = ramp(f.yellowPlaqueFraction, 0.025, 0.16);
      const pap = ramp(f.papuleDensity, 0.5, 4);
      const ev: string[] = [];
      if (yel > 0.3) ev.push(`yellow papular fraction ${(f.yellowPlaqueFraction * 100).toFixed(0)}%`);
      if (pap > 0.3) ev.push("crops of discrete papules");
      return { raw: 0.6 * yel + 0.4 * pap, evidence: ev };
    },
  },
  {
    id: "xanthelasma",
    label: "Xanthelasma",
    tier: 2,
    appearance: "Yellow plaques around the eyelids (dyslipidaemia)",
    sites: "Periorbital / eyelids",
    stage: "Dyslipidaemia, metabolic syndrome",
    prior: { eyelid: 1, face: 0.7, other: 0.25, "*": 0.15 },
    score: (f) => {
      const yel = ramp(f.yellowPlaqueFraction, 0.015, 0.12);
      const ev: string[] = [];
      if (yel > 0.25) ev.push(`yellow plaque fraction ${(f.yellowPlaqueFraction * 100).toFixed(0)}%`);
      return { raw: yel, evidence: ev };
    },
  },
  {
    id: "pcos_signs",
    label: "PCOS-associated signs (hirsutism, androgenic acne)",
    tier: 2,
    appearance: "Terminal hair in an androgenic pattern and/or inflammatory acne",
    sites: "Face, jawline, neck, chest",
    stage: "Tightly linked to insulin resistance in young women",
    prior: { face: 1, neck: 0.6, other: 0.3, "*": 0.2 },
    score: (f) => {
      const hair = ramp(f.darkMaculeCount, 1.2, 6);
      const ery = ramp(f.facialErythema, 0.25, 0.65);
      const ev: string[] = [];
      if (hair > 0.3) ev.push("dark linear/punctate structures consistent with terminal hair");
      if (ery > 0.3) ev.push(`inflammatory erythema index ${f.facialErythema.toFixed(2)}`);
      return { raw: 0.5 * hair + 0.5 * ery, evidence: ev };
    },
  },
  {
    id: "diabetic_dermopathy",
    label: 'Diabetic dermopathy ("shin spots")',
    tier: 3,
    appearance: "Brown atrophic macules, pretibial",
    sites: "Shins",
    stage: "Established / longer-standing diabetes",
    prior: { shin: 1, other: 0.3, "*": 0.2 },
    score: (f) => {
      const mac = ramp(f.darkMaculeCount, 0.6, 3.2);
      const brown = ramp(f.pigmentedFraction, 0.04, 0.3);
      const ev: string[] = [];
      if (mac > 0.25) ev.push(`${f.darkMaculeCount.toFixed(1)} atrophic macules per 10k px`);
      if (brown > 0.25) ev.push(`discrete pigmented patches over ${(f.pigmentedFraction * 100).toFixed(0)}% of the field`);
      return { raw: 0.72 * mac + 0.28 * brown, evidence: ev };
    },
  },
  {
    id: "necrobiosis_lipoidica",
    label: "Necrobiosis lipoidica",
    tier: 3,
    appearance: "Shiny yellow-brown plaques with visible telangiectasia",
    sites: "Shins",
    stage: "Established diabetes",
    prior: { shin: 1, other: 0.25, "*": 0.15 },
    score: (f) => {
      const yel = ramp(f.yellowPlaqueFraction, 0.03, 0.2);
      const tel = ramp(f.telangiectasiaDensity, 0.004, 0.05);
      const ev: string[] = [];
      if (yel > 0.3) ev.push("yellow-brown plaque");
      if (tel > 0.3) ev.push(`telangiectasia density ${f.telangiectasiaDensity.toFixed(3)}`);
      return { raw: 0.5 * yel + 0.5 * tel, evidence: ev };
    },
  },
  {
    id: "rubeosis_faciei",
    label: "Rubeosis faciei",
    tier: 3,
    appearance: "Persistent facial flushing",
    sites: "Face",
    stage: "Established diabetes, microvascular change",
    prior: { face: 1, neck: 0.5, other: 0.15, "*": 0.1 },
    score: (f) => {
      const ery = ramp(f.facialErythema, 0.3, 0.72);
      const ev: string[] = [];
      if (ery > 0.25) ev.push(`regional erythema index ${f.facialErythema.toFixed(2)}`);
      return { raw: ery, evidence: ev };
    },
  },
];

const PRESENT_THRESHOLD = 0.42;

/** Extract the morphometric / colourimetric feature vector from the ROI. */
export function extractMetabolicFeatures(d: ImageData, roi: Roi): MetabolicFeatures {
  const w = d.width,
    h = d.height;
  const x0 = Math.max(0, Math.floor(roi.x * w));
  const y0 = Math.max(0, Math.floor(roi.y * h));
  const x1 = Math.min(w, Math.ceil((roi.x + roi.w) * w));
  const y1 = Math.min(h, Math.ceil((roi.y + roi.h) * h));
  const rw = Math.max(1, x1 - x0),
    rh = Math.max(1, y1 - y0);

  // Crop the ROI into its own ImageData so every derived plane lines up.
  const crop = new ImageData(rw, rh);
  for (let y = 0; y < rh; y++) {
    const src = ((y0 + y) * w + x0) * 4;
    crop.data.set(d.data.subarray(src, src + rw * 4), y * rw * 4);
  }
  const n = rw * rh;

  const vPlane = new Float32Array(n);
  const sPlane = new Float32Array(n);
  const rednessPlane = new Float32Array(n);

  /*
   * Skin mask.
   *
   * A real clinical photograph is mostly not skin: there is hair, a drape, a
   * ward background, shadow and blown highlight. Every statistic below is
   * computed over skin pixels only. Without this, scalp hair alone supplies
   * hundreds of dark blobs and a huge texture energy, and the module reports
   * diabetic dermopathy on a photograph of somebody's neck.
   */
  const skin = new Uint8Array(n);
  let skinN = 0,
    yellowHits = 0,
    sumS = 0;

  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const r = crop.data[p],
      g = crop.data[p + 1],
      b = crop.data[p + 2];
    const { h: hu, s, v } = rgbToHsv(r, g, b);
    vPlane[i] = v;
    sPlane[i] = s;
    rednessPlane[i] = redness(r, g, b);

    const warm = hu <= 58 || hu >= 328;
    const isSkin = warm && s >= 0.07 && s <= 0.82 && v >= 0.16 && v <= 0.985 && r > b;
    if (isSkin) {
      skin[i] = 1;
      skinN++;
      sumS += s;
      if (hu >= 40 && hu <= 70 && s >= 0.24 && v >= 0.5) yellowHits++;
    }
  }

  const skinFraction = skinN / n;
  const denom = Math.max(1, skinN);
  const masked = (plane: Float32Array) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) if (skin[i]) out.push(plane[i]);
    return out;
  };

  /*
   * Pigmentation vs. shadow.
   *
   * Shading is multiplicative in RGB, so it lowers HSV value but leaves
   * saturation essentially untouched. Melanin deposition lowers value AND
   * raises saturation. Comparing the dark and light quartiles on a heavily
   * blurred value plane therefore separates a genuinely hyperpigmented plaque
   * from a skin fold that merely sits in shadow — which is the single biggest
   * source of false positives for acanthosis nigricans.
   */
  const blurR = Math.max(3, Math.round(Math.min(rw, rh) * 0.06));
  const vBlur = boxBlur(vPlane, rw, rh, blurR);
  const vBlurSkin = masked(vBlur);
  const vLo = percentile(vBlurSkin, 0.2);
  const vHi = percentile(vBlurSkin, 0.8);
  const shadingDrop = vHi > 0.02 ? clamp01((vHi - vLo) / vHi) : 0;

  let sDark = 0,
    nDark = 0,
    sLight = 0,
    nLight = 0;
  for (let i = 0; i < n; i++) {
    if (!skin[i]) continue;
    if (vBlur[i] <= vLo) {
      sDark += sPlane[i];
      nDark++;
    } else if (vBlur[i] >= vHi) {
      sLight += sPlane[i];
      nLight++;
    }
  }
  const pigmentSaturationGain =
    nDark > 0 && nLight > 0 ? sDark / nDark - sLight / nLight : 0;

  // Weighted sum rather than a product: a plaque that is strongly darker but
  // only mildly more saturated should still register, as should the converse.
  const hyperpigmentationIndex = clamp01(
    0.5 * ramp(shadingDrop, 0.04, 0.3) + 0.5 * ramp(pigmentSaturationGain, 0.004, 0.06)
  );

  // Extent of the plaque: pixels that are both darker and more saturated than
  // this image's own median. Scale-free and independent of skin type.
  const sSkin = masked(sPlane);
  const refS = nLight > 0 ? sLight / nLight : percentile(sSkin, 0.5);
  let pigmented = 0;
  for (let i = 0; i < n; i++)
    if (skin[i] && vBlur[i] < vHi * 0.93 && sPlane[i] > refS + 0.02) pigmented++;
  const pigmentedFraction = pigmented / denom;

  const grey = greyPlane(crop);
  const velvetyTextureEnergy = textureEnergy(grey, rw, rh, 2, skin);

  const meanS = sumS / denom;
  let varS = 0;
  for (let i = 0; i < n; i++) if (skin[i]) varS += (sPlane[i] - meanS) ** 2;

  /*
   * Papules are of the order of 2 % of the frame across, an order of magnitude
   * larger than skin grain, so the difference-of-Gaussians radii are set well
   * above the grain scale and the response must clear both an absolute floor
   * and 2.6 standard deviations of the image's own DoG response.
   */
  const per10k = 10000 / denom;
  const bright = detectBlobs(grey, rw, rh, 4, 12, 0.022, 9, 1, 2.2, skin);
  const dark = detectBlobs(grey, rw, rh, 4, 13, 0.022, 10, -1, 2.2, skin);

  // Telangiectasia proxy: fine-scale redness residual above a local baseline.
  const rBlur = boxBlur(rednessPlane, rw, rh, 4);
  let telHits = 0;
  for (let i = 0; i < n; i++) if (skin[i] && rednessPlane[i] - rBlur[i] > 0.05) telHits++;

  /*
   * Erythema must be measured WITHIN the image, never against an absolute.
   * Deeply pigmented skin has an intrinsically higher red-to-green ratio, so
   * any fixed threshold would systematically over-call erythema in Fitzpatrick
   * V-VI patients. Comparing the 90th against the 50th percentile of redness
   * inside the same ROI measures regional vasodilatation and is independent of
   * the patient's constitutive skin tone.
   */
  const rSkin = masked(rednessPlane);
  const facialErythema = clamp01((percentile(rSkin, 0.9) - percentile(rSkin, 0.5)) / 0.09);

  return {
    hyperpigmentationIndex,
    shadingDrop,
    pigmentSaturationGain,
    pigmentedFraction,
    velvetyTextureEnergy,
    colourVariance: Math.sqrt(varS / denom),
    papuleCount: bright.length,
    papuleDensity: bright.length * per10k,
    yellowPlaqueFraction: yellowHits / denom,
    telangiectasiaDensity: telHits / n,
    darkMaculeCount: dark.length * per10k,
    facialErythema,
    meanV: percentile(masked(vPlane), 0.5),
    meanS,
    skinFraction,
  };
}

export function scoreSigns(f: MetabolicFeatures, site: BodySite): SignScore[] {
  return SIGNS.map((def) => {
    const { raw, evidence } = def.score(f);
    const prior = def.prior[site] ?? def.prior["*"] ?? 0.3;
    const score = clamp01(raw * prior);
    return {
      id: def.id,
      label: def.label,
      tier: def.tier,
      score,
      present: score >= PRESENT_THRESHOLD,
      evidence,
    };
  }).sort((a, b) => b.score - a.score || a.tier - b.tier);
}

export type IrStage = "none" | "equivocal" | "consistent" | "strong";

export interface MetabolicVerdict {
  composite: number;
  stage: IrStage;
  headline: string;
  detail: string;
  positives: SignScore[];
  investigations: string[];
}

/**
 * Composite insulin-resistance signal. Tier 1 signs are specific to insulin
 * resistance and carry full weight; Tier 2 are metabolic-syndrome companions;
 * Tier 3 indicate established disease and are weak early-detection evidence,
 * so they are down-weighted rather than ignored.
 */
export function metabolicVerdict(signs: SignScore[], confirmed?: Record<string, boolean>): MetabolicVerdict {
  const eff = signs.map((s) => {
    const c = confirmed?.[s.id];
    // A clinician confirmation/rejection in Station C overrides the model score.
    const score = c === true ? Math.max(s.score, 0.8) : c === false ? Math.min(s.score, 0.1) : s.score;
    return { ...s, score, present: score >= PRESENT_THRESHOLD };
  });

  const maxTier = (t: 1 | 2 | 3) => Math.max(0, ...eff.filter((s) => s.tier === t).map((s) => s.score));
  const t1 = maxTier(1),
    t2 = maxTier(2),
    t3 = maxTier(3);
  const nT1 = eff.filter((s) => s.tier === 1 && s.present).length;

  const composite = clamp01(t1 * 0.78 + t2 * 0.3 + t3 * 0.14 + (nT1 >= 2 ? 0.12 : 0));

  const stage: IrStage =
    composite >= 0.65 ? "strong" : composite >= 0.45 ? "consistent" : composite >= 0.25 ? "equivocal" : "none";

  const positives = eff.filter((s) => s.present);
  const names = positives.map((s) => s.label).join(", ");

  const headline =
    stage === "strong"
      ? "Likely features of insulin resistance, pre-diabetes or young-onset type 2 diabetes mellitus — please go and see a doctor"
      : stage === "consistent"
        ? "Features consistent with an insulin-resistant state — please go and see a doctor"
        : stage === "equivocal"
          ? "Equivocal findings — not enough dermatological signal to call it either way"
          : "No photographable features of insulin resistance detected in this image";

  const detail =
    positives.length > 0
      ? `Detected: ${names}.`
      : "None of the Tier 1 cutaneous markers of insulin resistance reached the detection threshold in this image.";

  const investigations =
    composite >= 0.45
      ? [
          "HbA1c",
          "Fasting plasma glucose (± 75 g OGTT if fasting glucose is equivocal)",
          "Fasting insulin with HOMA-IR",
          "Fasting lipid profile (triglycerides, HDL-C)",
          "Waist circumference and blood pressure",
          "In young women with androgenic features: consider PCOS work-up",
        ]
      : [];

  return { composite, stage, headline, detail, positives, investigations };
}
