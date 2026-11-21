"use client";

import { useEffect, useMemo, useState } from "react";
import { progressionVerdict } from "@/lib/assess";
import { embeddingSimilarity } from "@/lib/cnn";
import { DEFAULT_ROI } from "@/lib/pipeline";
import { type DemoSpec, demoUrl, demosFor } from "@/lib/demos";
import { TISSUE_COLOUR, TISSUE_LABEL } from "@/lib/tissue";
import type { Roi } from "@/lib/types";
import CnnPanel from "./CnnPanel";
import HeatmapView, { type HeatMode } from "./HeatmapView";
import ImageStage from "./ImageStage";
import { Button, CompositionBar, Meter, Note, Pill, Station, Stat, cx } from "./ui";
import { downloadJson, stamp, useAnalysis } from "./useAnalysis";

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.5;
  return (
    <span
      className={cx(
        "num text-sm font-semibold",
        flat ? "text-fog-300" : good ? "text-emerald-300" : "text-red-300"
      )}
    >
      {value >= 0 ? "+" : "−"}
      {Math.abs(value).toFixed(1)} pp
    </span>
  );
}

export default function ProgressionModule() {
  const [srcA, setSrcA] = useState<string | null>(null);
  const [srcB, setSrcB] = useState<string | null>(null);
  const [roiA, setRoiA] = useState<Roi>(DEFAULT_ROI);
  const [roiB, setRoiB] = useState<Roi>(DEFAULT_ROI);
  const [interval, setInterval] = useState("14 days");
  const [treatment, setTreatment] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<HeatMode>("tissue");

  const A = useAnalysis(srcA, roiA, false);
  const B = useAnalysis(srcB, roiB, false);

  const [demos, setDemos] = useState<DemoSpec[]>([]);
  useEffect(() => {
    let alive = true;
    demosFor("progression").then((d) => alive && setDemos(d));
    return () => {
      alive = false;
    };
  }, []);
  const demosA = useMemo(() => demos.filter((d) => d.slot === "A"), [demos]);
  const demosB = useMemo(() => demos.filter((d) => d.slot === "B"), [demos]);

  const cos = useMemo(
    () => embeddingSimilarity(A.cnn?.embedding, B.cnn?.embedding),
    [A.cnn, B.cnn]
  );

  const verdict = useMemo(
    () => (A.analysis && B.analysis ? progressionVerdict(A.analysis.comp, B.analysis.comp, cos) : null),
    [A.analysis, B.analysis, cos]
  );

  const rows = (c: typeof A.analysis) =>
    c
      ? [
          { label: TISSUE_LABEL.granulation, pct: c.comp.granulation, colour: TISSUE_COLOUR.granulation },
          { label: TISSUE_LABEL.slough, pct: c.comp.slough, colour: TISSUE_COLOUR.slough },
          { label: TISSUE_LABEL.purulent, pct: c.comp.purulent, colour: TISSUE_COLOUR.purulent },
          { label: TISSUE_LABEL.necrosis, pct: c.comp.necrosis, colour: TISSUE_COLOUR.necrosis },
          { label: TISSUE_LABEL.gangrene, pct: c.comp.gangrene, colour: TISSUE_COLOUR.gangrene },
        ]
      : [];

  const pairs = useMemo(() => {
    const ids = Array.from(new Set(demos.map((d) => d.pairId).filter(Boolean))) as string[];
    return ids
      .map((id) => ({
        id,
        a: demos.find((d) => d.pairId === id && d.slot === "A"),
        b: demos.find((d) => d.pairId === id && d.slot === "B"),
      }))
      .filter((p) => p.a && p.b);
  }, [demos]);

  const loadPair = (a: DemoSpec, b: DemoSpec) => {
    setSrcA(demoUrl(a));
    setSrcB(demoUrl(b));
    setRoiA(a.roi ?? DEFAULT_ROI);
    setRoiB(b.roi ?? DEFAULT_ROI);
  };

  const tone =
    verdict?.band === "healing" || verdict?.band === "improving"
      ? "low"
      : verdict?.band === "static"
        ? "mod"
        : verdict
          ? "high"
          : undefined;

  const both = !!(A.analysis && B.analysis);

  return (
    <div className="space-y-4">
      <Station
        letter="A"
        title="Station A — Image acquisition"
        subtitle="Two photographs of the same ulcer, taken at different visits"
        state={both ? "done" : "active"}
        id="m3-a"
      >
        <div className="space-y-4">
          {pairs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-fog-400">Load a paired case:</span>
              {pairs.map((p) => (
                <Button key={p.id} variant="ghost" onClick={() => loadPair(p.a!, p.b!)}>
                  {p.a!.title.replace(/ —.*$/, "")} → {p.b!.title.replace(/^.*— /, "")}
                </Button>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-ink-900/30 p-3.5">
              <ImageStage
                title="Visit 1 — baseline"
                src={srcA}
                roi={roiA}
                onSrc={setSrcA}
                onRoi={setRoiA}
                demos={demosA}
                compact
              />
            </div>
            <div className="rounded-xl border border-line bg-ink-900/30 p-3.5">
              <ImageStage
                title="Visit 2 — follow-up"
                src={srcB}
                roi={roiB}
                onSrc={setSrcB}
                onRoi={setRoiB}
                demos={demosB}
                compact
              />
            </div>
          </div>

          {(A.error || B.error) && <Note tone="warn">{A.error ?? B.error}</Note>}
        </div>
      </Station>

      <Station
        letter="B"
        title="Station B — Deep learning"
        subtitle="MobileNetV2 embeddings measure overall visual change; the analyser measures the tissue bed"
        state={both ? "done" : "locked"}
        id="m3-b"
      >
        {!both ? (
          <p className="text-sm text-fog-400">Load both visits at Station A first.</p>
        ) : (
          <CnnPanel
            cnn={B.cnn}
            running={A.cnnRunning || B.cnnRunning || A.preparing || B.preparing}
            analyserMs={(A.analysis?.elapsedMs ?? 0) + (B.analysis?.elapsedMs ?? 0)}
            extra={
              <div className="space-y-4">
                {cos !== undefined && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Stat
                      label="Embedding cosine similarity"
                      value={cos.toFixed(3)}
                      hint="1280-d MobileNetV2 features, visit 1 vs visit 2"
                      tone="brand"
                    />
                    <Stat
                      label="Visual change magnitude"
                      value={((verdict?.visualChangeMagnitude ?? 0) * 100).toFixed(0)}
                      unit="%"
                      hint="derived from the embedding distance"
                    />
                  </div>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  {[
                    { k: "Visit 1", st: A, roi: roiA },
                    { k: "Visit 2", st: B, roi: roiB },
                  ].map(({ k, st, roi }) => (
                    <div key={k} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-fog-400">{k}</p>
                      <HeatmapView
                        img={st.prepared?.img ?? null}
                        roi={roi}
                        map={st.analysis?.map ?? null}
                        mode={mode}
                        onMode={setMode}
                        showModes={k === "Visit 1"}
                        height={220}
                      />
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        )}
      </Station>

      <Station
        letter="C"
        title="Station C — Data labelling"
        subtitle="Tissue composition at each visit, and the change between them"
        state={both ? "done" : "locked"}
        id="m3-c"
      >
        {!both || !verdict ? (
          <p className="text-sm text-fog-400">Load both visits at Station A first.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              {[
                { k: "Visit 1 — baseline", st: A },
                { k: "Visit 2 — follow-up", st: B },
              ].map(({ k, st }) => (
                <div key={k}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fog-400">{k}</p>
                  <CompositionBar rows={rows(st.analysis)} />
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fog-400">
                Change between visits
              </p>
              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-ink-900/70 text-[10.5px] uppercase tracking-wider text-fog-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tissue</th>
                      <th className="px-3 py-2 text-right font-medium">Visit 1</th>
                      <th className="px-3 py-2 text-right font-medium">Visit 2</th>
                      <th className="px-3 py-2 text-right font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Granulation", a: A.analysis!.comp.granulation, b: B.analysis!.comp.granulation, invert: false },
                      { label: "Slough / fibrin", a: A.analysis!.comp.slough, b: B.analysis!.comp.slough, invert: true },
                      { label: "Necrosis / eschar", a: A.analysis!.comp.necrosis, b: B.analysis!.comp.necrosis, invert: true },
                      { label: "Purulent", a: A.analysis!.comp.purulent, b: B.analysis!.comp.purulent, invert: true },
                    ].map((r) => (
                      <tr key={r.label} className="border-t border-line">
                        <td className="px-3 py-2 text-fog-200">{r.label}</td>
                        <td className="num px-3 py-2 text-right text-fog-300">{r.a.toFixed(1)}%</td>
                        <td className="num px-3 py-2 text-right text-fog-300">{r.b.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right">
                          <Delta value={r.b - r.a} invert={r.invert} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] uppercase tracking-wider text-fog-400">
                  Interval between visits
                </span>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-fog-100 outline-none focus:border-brand-500"
                >
                  {["3 days", "7 days", "14 days", "21 days", "28 days", "Over 1 month"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] uppercase tracking-wider text-fog-400">
                  Intervention between visits
                </span>
                <input
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  placeholder="e.g. sharp debridement, NPWT, total contact cast"
                  className="w-full rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-fog-100 outline-none placeholder:text-fog-400/60 focus:border-brand-500"
                />
              </label>
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
        subtitle="Healing trajectory and what it means for the next review"
        state={verdict ? "done" : "locked"}
        id="m3-d"
      >
        {!verdict ? (
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
              <ul className="mt-2.5 space-y-1">
                {verdict.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[12.5px] text-fog-300">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-fog-400" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Stat
                label="Δ Granulation"
                value={`${verdict.dGranulation >= 0 ? "+" : "−"}${Math.abs(verdict.dGranulation).toFixed(1)}`}
                unit="pp"
                tone={verdict.dGranulation > 0 ? "low" : "high"}
              />
              <Stat
                label="Δ Slough"
                value={`${verdict.dSlough >= 0 ? "+" : "−"}${Math.abs(verdict.dSlough).toFixed(1)}`}
                unit="pp"
                tone={verdict.dSlough < 0 ? "low" : "high"}
              />
              <Stat
                label="Δ Necrosis"
                value={`${verdict.dNecrosis >= 0 ? "+" : "−"}${Math.abs(verdict.dNecrosis).toFixed(1)}`}
                unit="pp"
                tone={verdict.dNecrosis < 0 ? "low" : "high"}
              />
              <Stat
                label="Healing index"
                value={verdict.healingIndex.toFixed(1)}
                tone={tone as "low" | "mod" | "high"}
                hint="Δgran − 0.8Δslough − 1.6Δnecr − 1.2Δpus"
              />
            </div>
            <Meter
              value={Math.min(1, Math.max(0, (verdict.healingIndex + 40) / 80))}
              tone={(tone as "low" | "mod" | "high") ?? "brand"}
            />

            <div className="flex flex-wrap gap-2">
              <Pill tone="brand">Interval: {interval}</Pill>
              {treatment && <Pill>Intervention: {treatment}</Pill>}
              {verdict.visualChangeMagnitude !== undefined && (
                <Pill>Visual change: {(verdict.visualChangeMagnitude * 100).toFixed(0)}%</Pill>
              )}
            </div>

            <Note tone="warn">{verdict.areaCaveat}</Note>

            {(verdict.band === "static" || verdict.band === "early_deterioration" || verdict.band === "deteriorating") && (
              <Note tone="warn">
                A diabetic foot ulcer that has not reduced by roughly half its area over four weeks is
                unlikely to heal on the current plan. Re-assess offloading, vascular supply, infection and
                glycaemic control, and please go and see a doctor.
              </Note>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  downloadJson(`dtz-progression-${stamp()}.json`, {
                    platform: "Diabetic Type Zero",
                    module: "dfu-progression",
                    createdAt: new Date().toISOString(),
                    interval,
                    treatment,
                    visit1: { roi: roiA, composition: A.analysis?.comp },
                    visit2: { roi: roiB, composition: B.analysis?.comp },
                    embeddingCosine: cos ?? null,
                    verdict,
                    notes,
                  })
                }
              >
                Export labelled case (JSON)
              </Button>
              <Button
                variant="subtle"
                onClick={() => {
                  setSrcA(null);
                  setSrcB(null);
                  setTreatment("");
                  setNotes("");
                }}
              >
                Start a new case
              </Button>
            </div>
          </div>
        )}
      </Station>
    </div>
  );
}
