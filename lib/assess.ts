import { clamp01 } from "./cv";
import type { PeriwoundStats, TissueComposition } from "./types";

export type InfectionBand = "low" | "moderate" | "high";

export interface InfectionVerdict {
  score: number; // 0..1
  band: InfectionBand;
  headline: string;
  evidence: string[];
  gradeSuggestion: string;
  gradeCaveat: string;
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
  const score = clamp01(parts.reduce((s, x) => s + x.value * x.weight, 0));
  const band: InfectionBand = score >= 0.45 ? "high" : score >= 0.2 ? "moderate" : "low";

  const evidence: string[] = [];
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

  return {
    score,
    band,
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

  const healingIndex = dGranulation - 0.8 * dSlough - 1.6 * dNecrosis - 1.2 * dPurulent;

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
    band,
    headline,
    bullets,
    visualChangeMagnitude: cosineSim === undefined ? undefined : clamp01((1 - cosineSim) / 0.35),
    areaCaveat:
      "Percentages are composition of the wound bed, which is scale-free. Absolute wound area is NOT reported: " +
      "without a ruler or adhesive fiducial marker in frame, pixel area is not comparable between photographs.",
  };
}
