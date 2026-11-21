"use client";

import { Fragment, useMemo, useState } from "react";
import { BODY_SITES, SIGNS, metabolicVerdict, scoreSigns } from "@/lib/metabolic";
import { DEFAULT_ROI } from "@/lib/pipeline";
import { demosFor } from "@/lib/synth";
import type { BodySite, Roi } from "@/lib/types";
import CnnPanel from "./CnnPanel";
import ImageStage from "./ImageStage";
import { Button, Meter, Note, Pill, Station, Stat, cx } from "./ui";
import { downloadJson, stamp, useAnalysis } from "./useAnalysis";

type Confirm = "auto" | "yes" | "no";

const TIER_NOTE: Record<1 | 2 | 3, string> = {
  1: "Directly tied to insulin resistance — the core early-detection targets",
  2: "Metabolic syndrome companions — supporting signal, less specific",
  3: "Established / longer-standing diabetes — photographable but weak for early detection",
};

export default function MetabolicModule() {
  const [src, setSrc] = useState<string | null>(null);
  const [roi, setRoi] = useState<Roi>(DEFAULT_ROI);
  const [site, setSite] = useState<BodySite>("neck");
  const [ageBand, setAgeBand] = useState("18–29");
  const [confirm, setConfirm] = useState<Record<string, Confirm>>({});
  const [notes, setNotes] = useState("");
  const [showRef, setShowRef] = useState(false);
  const [showFeat, setShowFeat] = useState(false);

  const { prepared, analysis, cnn, cnnRunning, preparing, error } = useAnalysis(src, roi, true);
  const demos = useMemo(() => demosFor("metabolic"), []);

  const signs = useMemo(
    () => (analysis ? scoreSigns(analysis.feats, site) : []),
    [analysis, site]
  );

  const confirmedMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(confirm)) if (v !== "auto") out[k] = v === "yes";
    return out;
  }, [confirm]);

  const verdict = useMemo(
    () => (signs.length ? metabolicVerdict(signs, confirmedMap) : null),
    [signs, confirmedMap]
  );

  const tone = verdict
    ? verdict.stage === "strong"
      ? "high"
      : verdict.stage === "consistent"
        ? "mod"
        : "low"
    : undefined;

  return (
    <div className="space-y-4">
      <Station
        letter="A"
        title="Station A — Image acquisition"
        subtitle="Photograph the skin site, upload an existing image, or choose a synthetic demo"
        state={src ? "done" : "active"}
        id="m1-a"
      >
        <ImageStage
          src={src}
          roi={roi}
          onSrc={setSrc}
          onRoi={setRoi}
          demos={demos}
          onDemo={(d) => {
            if (d.site) setSite(d.site as BodySite);
            setConfirm({});
          }}
        />
        {error && <div className="mt-3"><Note tone="warn">{error}</Note></div>}
      </Station>

      <Station
        letter="B"
        title="Station B — Deep learning"
        subtitle="MobileNetV2 · ImageNet transfer learning · runs on this device"
        state={src ? (cnnRunning || preparing ? "active" : "done") : "locked"}
        id="m1-b"
      >
        {src ? (
          <CnnPanel cnn={cnn} running={cnnRunning || preparing} analyserMs={analysis?.elapsedMs} />
        ) : (
          <p className="text-sm text-fog-400">Select an image at Station A first.</p>
        )}
      </Station>

      <Station
        letter="C"
        title="Station C — Data labelling"
        subtitle="Confirm the body site and review each candidate sign; your corrections drive the result"
        state={src && analysis ? "done" : "locked"}
        id="m1-c"
      >
        {!analysis ? (
          <p className="text-sm text-fog-400">Select an image at Station A first.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] uppercase tracking-wider text-fog-400">
                  Body site photographed
                </span>
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value as BodySite)}
                  className="w-full rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-fog-100 outline-none focus:border-brand-500"
                >
                  {BODY_SITES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[10.5px] text-fog-400">
                  Site is a strong prior — acanthosis nigricans on a shin means something different from
                  acanthosis nigricans on a neck.
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10.5px] uppercase tracking-wider text-fog-400">
                  Age band
                </span>
                <select
                  value={ageBand}
                  onChange={(e) => setAgeBand(e.target.value)}
                  className="w-full rounded-xl border border-line bg-ink-900 px-3 py-2.5 text-sm text-fog-100 outline-none focus:border-brand-500"
                >
                  {["Under 18", "18–29", "30–39", "40–49", "50 and over"].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[10.5px] text-fog-400">
                  Recorded with the case label; it does not alter the image analysis.
                </span>
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-fog-400">
                  Candidate signs
                </p>
                <button
                  onClick={() => setShowRef((v) => !v)}
                  className="text-[11px] text-brand-300 hover:underline"
                >
                  {showRef ? "Hide" : "Show"} label reference
                </button>
              </div>

              <ul className="space-y-2">
                {signs.map((s) => {
                  const state = confirm[s.id] ?? "auto";
                  const def = SIGNS.find((d) => d.id === s.id)!;
                  return (
                    <li
                      key={s.id}
                      className={cx(
                        "rounded-xl border px-3.5 py-3",
                        s.present ? "border-brand-500/40 bg-brand-500/[0.05]" : "border-line bg-ink-900/40"
                      )}
                    >
                      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-fog-100">{s.label}</span>
                            <Pill tone={s.tier === 1 ? "brand" : "neutral"}>Tier {s.tier}</Pill>
                          </div>
                          <p className="mt-1 text-[11.5px] leading-snug text-fog-400">{def.appearance}</p>
                          {s.evidence.length > 0 && (
                            <p className="mt-1 text-[11px] leading-snug text-brand-300/80">
                              Evidence: {s.evidence.join("; ")}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-28">
                              <Meter value={s.score} tone={s.score >= 0.42 ? "mod" : "brand"} height={5} />
                            </div>
                            <span className="num text-[11px] text-fog-300">{(s.score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="inline-flex shrink-0 rounded-lg border border-line bg-ink-900 p-0.5">
                          {(["auto", "yes", "no"] as Confirm[]).map((c) => (
                            <button
                              key={c}
                              onClick={() => setConfirm((p) => ({ ...p, [s.id]: c }))}
                              className={cx(
                                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                                state === c
                                  ? c === "yes"
                                    ? "bg-emerald-500 text-ink-900"
                                    : c === "no"
                                      ? "bg-red-500/80 text-ink-900"
                                      : "bg-ink-600 text-fog-100"
                                  : "text-fog-400 hover:text-fog-100"
                              )}
                            >
                              {c === "auto" ? "Auto" : c === "yes" ? "Present" : "Absent"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {showRef && (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[46rem] text-left text-[11.5px]">
                  <thead className="bg-ink-900/70 text-[10.5px] uppercase tracking-wider text-fog-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Sign</th>
                      <th className="px-3 py-2 font-medium">Appearance</th>
                      <th className="px-3 py-2 font-medium">Where to photograph</th>
                      <th className="px-3 py-2 font-medium">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([1, 2, 3] as const).map((tier) => (
                      <Fragment key={`tier-${tier}`}>
                        <tr className="bg-ink-700/50">
                          <td colSpan={4} className="px-3 py-1.5 text-[10.5px] font-semibold text-brand-300">
                            Tier {tier} — {TIER_NOTE[tier]}
                          </td>
                        </tr>
                        {SIGNS.filter((s) => s.tier === tier).map((s) => (
                          <tr key={s.id} className="border-t border-line align-top">
                            <td className="px-3 py-2 font-medium text-fog-100">{s.label}</td>
                            <td className="px-3 py-2 text-fog-300">{s.appearance}</td>
                            <td className="px-3 py-2 text-fog-300">{s.sites}</td>
                            <td className="px-3 py-2 text-fog-400">{s.stage}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <button
                onClick={() => setShowFeat((v) => !v)}
                className="text-[11px] text-brand-300 hover:underline"
              >
                {showFeat ? "Hide" : "Show"} extracted feature vector
              </button>
              {showFeat && (
                <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(analysis.feats).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-line bg-ink-900/50 px-2.5 py-2">
                      <dt className="truncate text-[10px] text-fog-400">{k}</dt>
                      <dd className="num text-xs text-fog-100">
                        {typeof v === "number" ? v.toFixed(4) : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
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
        subtitle="Composite insulin-resistance signal and what to do next"
        state={verdict ? "done" : "locked"}
        id="m1-d"
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
              <p className="mt-1.5 text-sm text-fog-300">{verdict.detail}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Composite IR signal"
                value={(verdict.composite * 100).toFixed(0)}
                unit="%"
                tone={tone as "low" | "mod" | "high"}
              />
              <Stat label="Tier 1 signs detected" value={verdict.positives.filter((p) => p.tier === 1).length} />
              <Stat label="Body site" value={BODY_SITES.find((s) => s.id === site)?.label ?? site} />
            </div>
            <Meter value={verdict.composite} tone={(tone as "low" | "mod" | "high") ?? "brand"} />

            {verdict.positives.length > 0 && (
              <ul className="space-y-1.5">
                {verdict.positives.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 text-sm text-fog-200">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span>
                      <strong className="font-medium">{p.label}</strong>{" "}
                      <span className="text-fog-400">
                        (Tier {p.tier}, {(p.score * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {verdict.investigations.length > 0 && (
              <div className="rounded-xl border border-brand-500/25 bg-brand-500/[0.05] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
                  Suggested clinician-directed work-up
                </p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {verdict.investigations.map((i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] text-fog-200">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Note tone="warn">
              This is a screening prompt, not a diagnosis. Cutaneous markers are suggestive of insulin
              resistance but neither sensitive nor specific enough to diagnose or exclude diabetes. Only a
              blood test can do that. Please see a doctor.
            </Note>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  downloadJson(`dtz-metabolic-${stamp()}.json`, {
                    platform: "Diabetic Type Zero",
                    module: "metabolic-skin-scan",
                    createdAt: new Date().toISOString(),
                    site,
                    ageBand,
                    roi,
                    features: analysis?.feats,
                    signs,
                    clinicianLabels: confirm,
                    verdict: { ...verdict, positives: verdict.positives.map((p) => p.id) },
                    cnn: cnn
                      ? {
                          available: cnn.available,
                          backend: cnn.backend,
                          latencyMs: cnn.latencyMs,
                          embeddingDim: cnn.embeddingDim,
                          topK: cnn.topK,
                        }
                      : null,
                    notes,
                  })
                }
              >
                Export labelled case (JSON)
              </Button>
              <Button variant="subtle" onClick={() => { setSrc(null); setConfirm({}); setNotes(""); }}>
                Start a new case
              </Button>
            </div>
          </div>
        )}
      </Station>
    </div>
  );
}
