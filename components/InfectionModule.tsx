"use client";

import { useEffect, useMemo, useState } from "react";
import { infectionVerdict } from "@/lib/assess";
import { DEFAULT_ROI } from "@/lib/pipeline";
import { type DemoSpec, demosFor } from "@/lib/demos";
import { TISSUE_COLOUR, TISSUE_LABEL } from "@/lib/tissue";
import type { Roi } from "@/lib/types";
import CnnPanel from "./CnnPanel";
import HeatmapView, { type HeatMode } from "./HeatmapView";
import ImageStage from "./ImageStage";
import { Button, CompositionBar, Meter, Note, Pill, Station, Stat, cx } from "./ui";
import { downloadJson, stamp, useAnalysis } from "./useAnalysis";

const ULCER_SITES = [
  "Plantar forefoot",
  "Plantar midfoot",
  "Heel",
  "Hallux / great toe",
  "Lesser toe",
  "Dorsum of foot",
  "Malleolus",
  "Amputation stump",
  "Other",
];

export default function InfectionModule() {
  const [src, setSrc] = useState<string | null>(null);
  const [roi, setRoi] = useState<Roi>(DEFAULT_ROI);
  const [mode, setMode] = useState<HeatMode>("infection");
  const [ulcerSite, setUlcerSite] = useState(ULCER_SITES[0]);
  const [duration, setDuration] = useState("1–4 weeks");
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  const { prepared, analysis, cnn, cnnRunning, preparing, error } = useAnalysis(src, roi, false);
  const [demos, setDemos] = useState<DemoSpec[]>([]);
  useEffect(() => {
    let alive = true;
    demosFor("infection").then((d) => alive && setDemos(d));
    return () => {
      alive = false;
    };
  }, []);

  const verdict = useMemo(
    () => (analysis ? infectionVerdict(analysis.comp, analysis.peri) : null),
    [analysis]
  );

  const bedRows = analysis
    ? [
        { label: TISSUE_LABEL.granulation, pct: analysis.comp.granulation, colour: TISSUE_COLOUR.granulation },
        { label: TISSUE_LABEL.slough, pct: analysis.comp.slough, colour: TISSUE_COLOUR.slough },
        { label: TISSUE_LABEL.purulent, pct: analysis.comp.purulent, colour: TISSUE_COLOUR.purulent },
        { label: TISSUE_LABEL.necrosis, pct: analysis.comp.necrosis, colour: TISSUE_COLOUR.necrosis },
        { label: TISSUE_LABEL.gangrene, pct: analysis.comp.gangrene, colour: TISSUE_COLOUR.gangrene },
      ]
    : [];

  const BEDSIDE = [
    { id: "fever", label: "Fever or feels systemically unwell" },
    { id: "pain", label: "New or worsening pain" },
    { id: "odour", label: "Malodour" },
    { id: "probe", label: "Probe-to-bone positive" },
    { id: "crepitus", label: "Crepitus or fluctuance" },
    { id: "pulses", label: "Absent pedal pulses" },
  ];
  const bedsideCount = BEDSIDE.filter((b) => flags[b.id]).length;

  const tone = verdict ? (verdict.band === "high" ? "high" : verdict.band === "moderate" ? "mod" : "low") : undefined;

  return (
    <div className="space-y-4">
      <Station
        letter="A"
        title="Station A — Image acquisition"
        subtitle="Photograph the ulcer perpendicular to the wound, fill the frame, no footwear or identifiers in shot"
        state={src ? "done" : "active"}
        id="m2-a"
      >
        <ImageStage src={src} roi={roi} onSrc={setSrc} onRoi={setRoi} demos={demos} />
        {error && <div className="mt-3"><Note tone="warn">{error}</Note></div>}
      </Station>

      <Station
        letter="B"
        title="Station B — Deep learning"
        subtitle="MobileNetV2 · ImageNet transfer learning · pixel-wise tissue-bed segmentation"
        state={src ? (cnnRunning || preparing ? "active" : "done") : "locked"}
        id="m2-b"
      >
        {src ? (
          <CnnPanel
            cnn={cnn}
            running={cnnRunning || preparing}
            analyserMs={analysis?.elapsedMs}
            extra={
              analysis && prepared ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-fog-400">
                    Tissue bed segmentation
                  </p>
                  <HeatmapView
                    img={prepared.img}
                    roi={roi}
                    map={analysis.map}
                    mode={mode}
                    onMode={setMode}
                  />
                </div>
              ) : null
            }
          />
        ) : (
          <p className="text-sm text-fog-400">Select an image at Station A first.</p>
        )}
      </Station>

      <Station
        letter="C"
        title="Station C — Data labelling"
        subtitle="Measured tissue composition, plus the bedside findings no photograph can capture"
        state={analysis ? "done" : "locked"}
        id="m2-c"
      >
        {!analysis ? (
          <p className="text-sm text-fog-400">Select an image at Station A first.</p>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-fog-400">
                  Wound bed composition
                </p>
                <Pill>% of wound bed, not of frame</Pill>
                <Pill>
                  bed fills {(analysis.comp.bedFractionOfRoi * 100).toFixed(0)}% of ROI
                </Pill>
              </div>
              <CompositionBar rows={bedRows} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Peri-wound erythema"
                value={(analysis.peri.erythemaIndex * 100).toFixed(0)}
                unit="%"
                hint="ring outside ROI vs. own baseline"
                tone={analysis.peri.erythemaIndex > 0.45 ? "high" : analysis.peri.erythemaIndex > 0.2 ? "mod" : "low"}
              />
              <Stat
                label="Segmentation confidence"
                value={(analysis.comp.meanConfidence * 100).toFixed(0)}
                unit="%"
              />
              <Stat label="Epithelial / peri-wound" value={analysis.comp.epithelialPct.toFixed(1)} unit="%" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] uppercase tracking-wider text-fog-400">
                  Ulcer site
                </span>
                <select
                  value={ulcerSite}
                  onChange={(e) => setUlcerSite(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-fog-100 outline-none focus:border-brand-500"
                >
                  {ULCER_SITES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] uppercase tracking-wider text-fog-400">
                  Duration
                </span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-fog-100 outline-none focus:border-brand-500"
                >
                  {["Under 1 week", "1–4 weeks", "1–3 months", "Over 3 months"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fog-400">
                Bedside findings — not visible in a photograph
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {BEDSIDE.map((b) => (
                  <label
                    key={b.id}
                    className={cx(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] transition-colors",
                      flags[b.id] ? "border-amber-500/45 bg-amber-500/[0.08] text-amber-100" : "border-line bg-ink-900/40 text-fog-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={!!flags[b.id]}
                      onChange={(e) => setFlags((p) => ({ ...p, [b.id]: e.target.checked }))}
                      className="h-4 w-4 accent-amber-400"
                    />
                    {b.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[10.5px] uppercase tracking-wider text-fog-400">
                Clinician note (optional)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="No patient identifiers."
                className="w-full resize-y rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-fog-100 outline-none placeholder:text-fog-400/60 focus:border-brand-500"
              />
            </label>
          </div>
        )}
      </Station>

      <Station
        letter="D"
        title="Station D — Result"
        subtitle="Infection concern, the evidence behind it, and the limits of a photograph"
        state={verdict ? "done" : "locked"}
        id="m2-d"
      >
        {!verdict || !analysis ? (
          <p className="text-sm text-fog-400">Complete Stations A–C to see the result.</p>
        ) : (
          <div className="space-y-4">
            <div
              className={cx(
                "rounded-2xl border p-4",
                tone === "high"
                  ? "border-red-500/40 bg-red-500/[0.07]"
                  : tone === "mod"
                    ? "border-amber-500/40 bg-amber-500/[0.07]"
                    : "border-emerald-500/35 bg-emerald-500/[0.06]"
              )}
            >
              <p className="text-base font-semibold leading-snug text-fog-100 sm:text-lg">
                {verdict.headline}
              </p>
              <p className="mt-2 text-[12.5px] text-fog-300">{verdict.gradeSuggestion}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Stat
                label="Infection concern"
                value={(verdict.score * 100).toFixed(0)}
                unit="%"
                tone={tone as "low" | "mod" | "high"}
              />
              <Stat label="Purulent" value={analysis.comp.purulent.toFixed(1)} unit="%" />
              <Stat label="Wet gangrene" value={analysis.comp.gangrene.toFixed(1)} unit="%" />
              <Stat label="Necrosis" value={analysis.comp.necrosis.toFixed(1)} unit="%" />
            </div>
            <Meter value={verdict.score} tone={(tone as "low" | "mod" | "high") ?? "brand"} />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fog-400">
                Score contributions
              </p>
              <ul className="space-y-1.5">
                {verdict.contributions.map((c) => (
                  <li key={c.label} className="flex items-center gap-3 text-[12px]">
                    <span className="w-44 shrink-0 text-fog-300">{c.label}</span>
                    <div className="flex-1">
                      <Meter value={c.value} tone={c.value > 0.6 ? "high" : c.value > 0.25 ? "mod" : "low"} height={5} />
                    </div>
                    <span className="num w-20 shrink-0 text-right text-fog-400">
                      ×{c.weight.toFixed(2)} = {(c.value * c.weight * 100).toFixed(0)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {bedsideCount > 0 && (
              <Note tone="warn">
                <strong className="text-amber-100">
                  {bedsideCount} bedside finding{bedsideCount > 1 ? "s" : ""} recorded.
                </strong>{" "}
                {flags.fever || flags.probe || flags.crepitus
                  ? "Systemic upset, probe-to-bone or crepitus raises this above anything the image alone shows — this needs urgent in-person assessment, not an app."
                  : "These are not reflected in the image score but should raise your clinical threshold."}
              </Note>
            )}

            <Note tone="warn">{verdict.gradeCaveat}</Note>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  downloadJson(`dtz-infection-${stamp()}.json`, {
                    platform: "Diabetic Type Zero",
                    module: "dfu-infection",
                    createdAt: new Date().toISOString(),
                    ulcerSite,
                    duration,
                    roi,
                    composition: analysis.comp,
                    periwound: analysis.peri,
                    verdict,
                    bedsideFindings: flags,
                    cnn: cnn
                      ? { available: cnn.available, backend: cnn.backend, latencyMs: cnn.latencyMs, embeddingDim: cnn.embeddingDim, topK: cnn.topK }
                      : null,
                    notes,
                  })
                }
              >
                Export labelled case (JSON)
              </Button>
              <Button variant="subtle" onClick={() => { setSrc(null); setFlags({}); setNotes(""); }}>
                Start a new case
              </Button>
            </div>
          </div>
        )}
      </Station>
    </div>
  );
}
