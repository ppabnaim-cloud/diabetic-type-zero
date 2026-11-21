"use client";

import { MODEL_SPEC } from "@/lib/cnn";
import type { CnnResult } from "@/lib/types";
import { Note, Pill, Spinner, Stat } from "./ui";

export default function CnnPanel({
  cnn,
  running,
  analyserMs,
  extra,
}: {
  cnn: CnnResult | null;
  running: boolean;
  analyserMs?: number;
  extra?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-ink-900/50 p-3.5">
          <p className="text-[10.5px] uppercase tracking-wider text-fog-400">Backbone</p>
          <p className="mt-1 text-sm font-semibold text-fog-100">{MODEL_SPEC.architecture}</p>
          <dl className="mt-2.5 space-y-1 text-[11.5px]">
            {[
              ["Pre-training", MODEL_SPEC.weights],
              ["Input", MODEL_SPEC.input],
              ["Pooled features", cnn?.embeddingDim ? `${cnn.embeddingDim}-d` : `${MODEL_SPEC.pooledFeatureDim}-d`],
              ["Parameters", MODEL_SPEC.params],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-24 shrink-0 text-fog-400">{k}</dt>
                <dd className="min-w-0 flex-1 text-fog-200">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-ink-900/50 p-3.5">
          <p className="text-[10.5px] uppercase tracking-wider text-fog-400">Inference</p>
          {running ? (
            <div className="mt-3">
              <Spinner label="Loading ImageNet weights and running the backbone…" />
            </div>
          ) : cnn?.available ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Pill tone="brand">backend: {cnn.backend}</Pill>
                <Pill>{cnn.latencyMs?.toFixed(0)} ms</Pill>
                <Pill>{cnn.embeddingDim}-d embedding</Pill>
              </div>
              {cnn.variant && <p className="mt-1.5 text-[10.5px] text-fog-400">{cnn.variant}</p>}
              <p className="mt-2.5 text-[10.5px] uppercase tracking-wider text-fog-400">
                Top ImageNet activations
              </p>
              <ul className="mt-1.5 space-y-1">
                {cnn.topK?.slice(0, 3).map((p) => (
                  <li key={p.className} className="flex items-center gap-2 text-[11.5px]">
                    <span className="min-w-0 flex-1 truncate text-fog-300">{p.className}</span>
                    <span className="num text-fog-100">{(p.probability * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-2">
              <Note tone="warn">
                CNN backbone unavailable{cnn?.error ? ` (${cnn.error})` : ""}. The morphometric analyser below
                ran normally and all results remain valid — the backbone weights are fetched over the network
                on first use.
              </Note>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Analyser"
          value={analyserMs !== undefined ? analyserMs.toFixed(0) : "—"}
          unit="ms"
          hint="pixel-wise pass"
        />
        <Stat
          label="Skin / tissue pixels"
          value={cnn?.skinPixelFraction !== undefined ? (cnn.skinPixelFraction * 100).toFixed(0) : "—"}
          unit="%"
          hint="input sanity check"
        />
        <Stat
          label="Plausible clinical image"
          value={cnn ? (cnn.plausibleClinicalImage ? "Yes" : "Doubtful") : "—"}
          tone={cnn && !cnn.plausibleClinicalImage ? "mod" : undefined}
        />
        <Stat label="Processing" value="On-device" hint="no upload" tone="brand" />
      </div>

      {cnn && cnn.plausibleClinicalImage === false && (
        <Note tone="warn">
          This image does not look like a close-up of skin or a wound. The result below is unlikely to mean
          anything — re-take the photograph filling the frame with the lesion.
        </Note>
      )}

      {extra}

      <Note>
        <strong className="text-fog-200">How to read this.</strong> The MobileNetV2 backbone is genuine
        ImageNet transfer learning and runs here in full, producing the {MODEL_SPEC.pooledFeatureDim}-d feature
        vector a diagnostic head would consume. That head is <em>not</em> trained in this prototype — there is
        no labelled clinical dataset behind it yet. The scores you see come from the deterministic
        morphometric and colourimetric analyser, which is fully specified in the repository. The embedding is
        used for the input sanity check and, in the progression module, for measuring visual change between
        two photographs.
      </Note>
    </div>
  );
}
