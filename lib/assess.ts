import { clamp01 } from "./cv";
import type { PeriwoundStats, TissueComposition } from "./types";

export type InfectionBand = "low" | "moderate" | "high";

export interface InfectionVerdict {
  score: number; // 0..1
  band: InfectionBand;
  insufficientBed: boolean;
  headline: string;
  evidence: string[];
  gradeSuggestion: string;
  gradeCaveat: string;
  /** Extensive tissue loss needs urgent assessment whether or not it is infected. */
  tissueLossFlag?: string;
  contributions: { label: string; value: number; weight: number }[];
}

/**
 * Composite infection-concern score.
 *
 * Weights reflect the relative discriminating value of each photographable
 * feature: frank purulence and wet gangrene are the strongest single findings,
 * necrosis is intermediate, slough alone is weak, and spreading peri-wound
 * erythema contributes independently of the bed composition.
 */
export function infectionVerdict(c: TissueComposition, p: PeriwoundStats): InfectionVerdict {
  const parts = [
    { label: "Purulent discharge / pus", value: clamp01(c.purulent / 25), weight: 0.34, pct: c.purulent },
    { label: "Wet gangrene", value: clamp01(c.gangrene / 15), weight: 0.3, pct: c.gangrene },
    { label: "Necrosis / eschar", value: clamp01(c.necrosis / 35), weight: 0.16, pct: c.necrosis },
    { label: "Slough burden", value: clamp01(c.slough / 60), weight: 0.08, pct: c.slough },
    { label: "Peri-wound erythema", value: p.erythemaIndex, weight: 0.12, pct: p.erythemaIndex * 100 },
  ];
  /*
   * If almost nothing in the selected region is wound bed, the composition
   * percentages are computed over a handful of pixels and mean nothing. A
   * healed, scarred foot was scoring 68% slough and 24% necrosis on a bed
   * occupying a tenth of the region, and reporting "possible infection".
   * Below the floor the module declines to score rather than guess.
   */
  const insufficientBed = c.bedFractionOfRoi < 0.12;

  const score = insufficientBed ? 0 : clamp01(parts.reduce((s, x) => s + x.value * x.weight, 0));
  const band: InfectionBand = insufficientBed
    ? "low"
    : score >= 0.45
      ? "high"
      : score >= 0.2
        ? "moderate"
        : "low";

  const evidence: string[] = [];
  if (insufficientBed) {
    return {
      score: 0,
      band: "low",
      insufficientBed: true,
      headline:
        "No substantial open wound bed in the selected region — nothing to assess for infection here",
      evidence: [],
      gradeSuggestion:
        `Only ${(c.bedFractionOfRoi * 100).toFixed(0)}% of the region is open wound. If an ulcer is present, drag the region of interest tightly over it; if the wound has closed, there is no bed to grade.`,
      gradeCaveat:
        "Percentages are not reported, because over such a small area they would be dominated by a few pixels of scar, shadow or dressing.",
      contributions: parts.map(({ label, weight }) => ({ label, value: 0, weight })),
    };
  }
  if (c.purulent >= 2) evidence.push(`purulent discharge over ${c.purulent.toFixed(1)}% of the wound bed`);
  if (c.gangrene >= 1.5) evidence.push(`wet gangrene over ${c.gangrene.toFixed(1)}%`);
  if (c.necrosis >= 5) evidence.push(`necrosis / eschar over ${c.necrosis.toFixed(1)}%`);
  if (c.slough >= 25) evidence.push(`heavy slough burden (${c.slough.toFixed(1)}%)`);
  if (p.erythemaIndex >= 0.35) evidence.push(`peri-wound erythema (index ${p.erythemaIndex.toFixed(2)})`);

  const headline =
    band === "high"
      ? `Likely infected${evidence.length ? ", evidenced by " + evidence.join(", ") : ""} — please go and see a doctor`
      : band === "moderate"
        ? `Possible infection${evidence.length ? ", evidenced by " + evidence.join(", ") : ""} — please go and see a doctor`
        : "No convincing photographic evidence of infection in this image";

  const gradeSuggestion =
    band === "high" && (c.gangrene >= 3 || c.necrosis >= 20)
      ? "Suggests IWGDF/IDSA grade 3 (moderate infection: deep or extensive local involvement)"
      : band === "high"
        ? "Suggests IWGDF/IDSA grade 2-3 (local infection, extent to be measured clinically)"
        : band === "moderate"
          ? "Suggests IWGDF/IDSA grade 2 (mild local infection) if ≥2 local signs are confirmed clinically"
          : "Consistent with IWGDF/IDSA grade 1 (uninfected) on image appearance alone";

  const gradeCaveat =
    "Grade 4 (severe infection with systemic inflammatory response) cannot be assessed from a photograph. " +
    "Erythema extent in centimetres, probe-to-bone, deep-space involvement, temperature, pulse, white cell count " +
    "and CRP all require bedside assessment.";

  /*
   * Necrosis is weak evidence of INFECTION — dry gangrene is often purely
   * ischaemic and needs revascularisation rather than antibiotics — so it is
   * deliberately down-weighted in the infection score. But a bed that is
   * mostly dead tissue is limb-threatening regardless, and saying nothing
   * about it because the infection score is low would be the wrong silence.
   */
  const deadTissue = c.necrosis + c.gangrene;
  const tissueLossFlag =
    deadTissue >= 40
      ? `${deadTissue.toFixed(0)}% of the wound bed is non-viable tissue. Whether or not this is infected, extensive necrosis is limb-threatening and needs urgent assessment of the arterial supply — pedal pulses, ankle-brachial index or toe pressures, and a vascular opinion. Antibiotics alone do not treat ischaemia.`
      : undefined;

  return {
    score,
    band,
    insufficientBed: false,
    tissueLossFlag,
    headline,
    evidence,
    gradeSuggestion,
    gradeCaveat,
    contributions: parts.map(({ label, value, weight }) => ({ label, value, weight })),
  };
}

export type HealingBand = "healing" | "improving" | "static" | "early_deterioration" | "deteriorating";

export interface ProgressionVerdict {
  dGranulation: number; // percentage points
  dSlough: number;
  dNecrosis: number;
  dPurulent: number;
  healingIndex: number;
  compositionIndex: number;
  bedShrink: number; // +ve means the bed occupies less of the frame than before
  band: HealingBand;
  headline: string;
  bullets: string[];
  visualChangeMagnitude?: number; // from CNN embeddings, 0..1
  areaCaveat: string;
}

/**
 * Composition-based healing assessment.
 *
 * Deltas are in percentage points of the wound bed, which is scale-free — it
 * survives a change of camera, distance or lighting between visits. Absolute
 * area change is deliberately NOT asserted, because without a fiducial marker
 * in frame the pixel area of a wound is not comparable across photographs.
 */
export function progressionVerdict(
  a: TissueComposition,
  b: TissueComposition,
  cosineSim?: number
): ProgressionVerdict {
  const dGranulation = b.granulation - a.granulation;
  const dSlough = b.slough - a.slough;
  const dNecrosis = b.necrosis - a.necrosis;
  const dPurulent = b.purulent - a.purulent;

  const compositionIndex = dGranulation - 0.8 * dSlough - 1.6 * dNecrosis - 1.2 * dPurulent;

  /*
   * Composition alone cannot see a wound that is closing.
   *
   * On a genuine healing series, a large bed that is 99% granulation becomes a
   * small bed that is 85% granulation: composition says it got worse, when in
   * fact the ulcer nearly closed. Relative bed size supplies the missing axis.
   * It is scale-dependent and therefore only meaningful if both photographs
   * were taken at a similar distance and angle — which is precisely why a
   * ruler or adhesive fiducial marker in frame is worth the trouble.
   */
  const bedShrink = a.bedFractionOfRoi > 0 ? (a.bedFractionOfRoi - b.bedFractionOfRoi) / a.bedFractionOfRoi : 0;
  const healingIndex = compositionIndex + Math.max(-1, Math.min(1, bedShrink)) * 60;

  const band: HealingBand =
    healingIndex >= 20
      ? "healing"
      : healingIndex >= 6
        ? "improving"
        : healingIndex > -6
          ? "static"
          : healingIndex > -20
            ? "early_deterioration"
            : "deteriorating";

  const up = (x: number) => (x >= 0 ? "increased" : "decreased");
  const bullets = [
    `Wound bed occupies ${(b.bedFractionOfRoi * 100).toFixed(0)}% of the region, against ${(a.bedFractionOfRoi * 100).toFixed(0)}% before — ${bedShrink >= 0 ? "a reduction" : "an increase"} of ${Math.abs(bedShrink * 100).toFixed(0)}% (uncalibrated)`,
    `Granulation tissue ${up(dGranulation)} by ${Math.abs(dGranulation).toFixed(1)} percentage points (${a.granulation.toFixed(1)}% → ${b.granulation.toFixed(1)}%)`,
    `Slough ${up(dSlough)} by ${Math.abs(dSlough).toFixed(1)} percentage points (${a.slough.toFixed(1)}% → ${b.slough.toFixed(1)}%)`,
    `Necrosis ${up(dNecrosis)} by ${Math.abs(dNecrosis).toFixed(1)} percentage points (${a.necrosis.toFixed(1)}% → ${b.necrosis.toFixed(1)}%)`,
  ];
  if (Math.abs(dPurulent) >= 1)
    bullets.push(
      `Purulent tissue ${up(dPurulent)} by ${Math.abs(dPurulent).toFixed(1)} percentage points (${a.purulent.toFixed(1)}% → ${b.purulent.toFixed(1)}%)`
    );

  const headline =
    band === "healing"
      ? `Good wound healing — granulation tissue increased by ${dGranulation.toFixed(1)} percentage points and slough ${up(dSlough)} by ${Math.abs(dSlough).toFixed(1)}`
      : band === "improving"
        ? `Modest improvement — granulation ${up(dGranulation)} by ${Math.abs(dGranulation).toFixed(1)} percentage points`
        : band === "static"
          ? "Wound bed essentially static between the two images — reassess the offloading, dressing choice and vascular status"
          : band === "early_deterioration"
            ? "Early deterioration — granulation is being lost to slough or necrosis; please go and see a doctor"
            : "Deterioration — significant loss of granulation with rising slough, necrosis or purulence; please go and see a doctor";

  return {
    dGranulation,
    dSlough,
    dNecrosis,
    dPurulent,
    healingIndex,
    compositionIndex,
    bedShrink,
    band,
    headline,
    bullets,
    visualChangeMagnitude: cosineSim === undefined ? undefined : clamp01((1 - cosineSim) / 0.35),
    areaCaveat:
      "Tissue percentages are composition of the wound bed and are scale-free. The change in relative bed size is " +
      "NOT scale-free: it assumes both photographs were taken at a similar distance and angle, and it is reported " +
      "as a relative figure only. Absolute wound area in square centimetres is not claimed. Place a ruler or an " +
      "adhesive fiducial marker in frame and that measurement becomes quantitative.",
  };
}
