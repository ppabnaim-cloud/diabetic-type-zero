export type ModuleId = "metabolic" | "infection" | "progression";

export const TISSUE_CLASSES = [
  "granulation",
  "slough",
  "necrosis",
  "purulent",
  "gangrene",
  "epithelial",
  "background",
] as const;
export type TissueClass = (typeof TISSUE_CLASSES)[number];

/** Classes that together make up the "wound bed" denominator. */
export const BED_CLASSES: TissueClass[] = [
  "granulation",
  "slough",
  "necrosis",
  "purulent",
  "gangrene",
];

export interface Roi {
  x: number; // 0..1 fractions of image width/height
  y: number;
  w: number;
  h: number;
}

export interface TissueMap {
  gw: number; // grid width
  gh: number;
  cls: Uint8Array; // index into TISSUE_CLASSES
  conf: Float32Array; // 0..1 argmax confidence
  infection: Float32Array; // 0..1 infection-concern field
}

export interface TissueComposition {
  granulation: number; // % of wound bed
  slough: number;
  necrosis: number;
  purulent: number;
  gangrene: number;
  bedCells: number;
  gridCells: number;
  bedFractionOfRoi: number; // bed cells / ROI cells
  meanConfidence: number;
  epithelialPct: number; // % of ROI, not of bed
}

export interface PeriwoundStats {
  erythemaIndex: number; // 0..1, redness of ring outside ROI vs. its own baseline
  ringRedness: number;
  baselineRedness: number;
}

export interface CnnResult {
  available: boolean;
  backend?: string;
  variant?: string;
  latencyMs?: number;
  embedding?: Float32Array; // 1280-d pooled MobileNetV2 features
  embeddingDim?: number;
  topK?: { className: string; probability: number }[];
  plausibleClinicalImage?: boolean;
  skinPixelFraction?: number;
  error?: string;
}

export interface SignScore {
  id: string;
  label: string;
  tier: 1 | 2 | 3;
  score: number; // 0..1
  present: boolean;
  evidence: string[];
}

export interface MetabolicFeatures {
  hyperpigmentationIndex: number;
  shadingDrop: number; // darkening of the dark quartile, multiplicative
  pigmentSaturationGain: number; // saturation rise in dark regions — pigment, not shadow
  pigmentedFraction: number; // share of ROI darker AND more saturated than its own median
  velvetyTextureEnergy: number;
  colourVariance: number;
  papuleDensity: number; // blobs per 10k px
  papuleCount: number;
  yellowPlaqueFraction: number;
  telangiectasiaDensity: number;
  darkMaculeCount: number; // density per 10k px
  facialErythema: number;
  meanV: number;
  meanS: number;
  skinFraction: number; // share of ROI that is skin at all
}

export type BodySite =
  | "neck"
  | "axilla"
  | "groin"
  | "knuckles"
  | "elbow_knee"
  | "eyelid"
  | "extensor_buttock"
  | "shin"
  | "face"
  | "other";

export interface CaseLabel {
  module: ModuleId;
  createdAt: string;
  site?: BodySite;
  age?: string;
  roi: Roi;
  confirmed: Record<string, boolean>;
  notes: string;
}
