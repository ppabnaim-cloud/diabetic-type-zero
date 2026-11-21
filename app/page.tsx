"use client";

import { useEffect, useState } from "react";
import Disclaimer, { Mark } from "@/components/Disclaimer";
import InfectionModule from "@/components/InfectionModule";
import MetabolicModule from "@/components/MetabolicModule";
import ProgressionModule from "@/components/ProgressionModule";
import { Pill, cx } from "@/components/ui";
import { loadCnn } from "@/lib/cnn";
import type { ModuleId } from "@/lib/types";

const TABS: { id: ModuleId; n: string; name: string; blurb: string; prefix: string }[] = [
  {
    id: "metabolic",
    n: "01",
    name: "Metabolic Skin Scan",
    blurb: "Early signs of insulin resistance, pre-diabetes and young-onset type 2 diabetes",
    prefix: "m1",
  },
  {
    id: "infection",
    n: "02",
    name: "Foot Ulcer Infection",
    blurb: "Early detection of an infected diabetic foot ulcer, to prevent amputation",
    prefix: "m2",
  },
  {
    id: "progression",
    n: "03",
    name: "Healing Tracker",
    blurb: "Granulation and slough change between two visits",
    prefix: "m3",
  },
];

const STATIONS = [
  { k: "a", label: "Capture" },
  { k: "b", label: "Deep learning" },
  { k: "c", label: "Labels" },
  { k: "d", label: "Result" },
];

type ModelState = "loading" | "ready" | "failed";

export default function Page() {
  const [accepted, setAccepted] = useState(false);
  const [tab, setTab] = useState<ModuleId>("metabolic");
  const [model, setModel] = useState<ModelState>("loading");

  useEffect(() => {
    if (accepted) window.scrollTo({ top: 0 });
  }, [tab, accepted]);

  const active = TABS.find((t) => t.id === tab)!;

  /*
   * Warm the backbone the moment the disclaimer is accepted. The ImageNet
   * weights are about 14 MB; fetching them lazily on the first demo click
   * means the first result of a session waits on the network, which on a
   * congested venue connection is the worst possible moment. Starting here
   * overlaps the download with the user choosing an image.
   */
  const accept = () => {
    setAccepted(true);
    loadCnn().then(
      () => setModel("ready"),
      () => setModel("failed")
    );
  };

  if (!accepted) return <Disclaimer onAccept={accept} />;

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-line bg-ink-900/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Mark size={34} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-fog-100">
              Diabetic Type Zero
            </h1>
            <p className="hidden truncate text-[11px] text-fog-400 sm:block">
              Image-based early detection across the diabetes course
            </p>
          </div>
          <Pill
            tone={model === "ready" ? "brand" : model === "failed" ? "neutral" : "neutral"}
            className="hidden sm:inline-flex"
          >
            <span
              className={cx(
                "h-1.5 w-1.5 rounded-full",
                model === "ready"
                  ? "bg-brand-400"
                  : model === "failed"
                    ? "bg-fog-400"
                    : "animate-pulse bg-amber-400"
              )}
            />
            {model === "ready" ? "Model ready" : model === "failed" ? "Analyser only" : "Loading model"}
          </Pill>
          <Pill tone="warn">Prototype · not for clinical use</Pill>
        </div>

        <nav className="mx-auto max-w-5xl px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cx(
                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                  tab === t.id
                    ? "border-brand-500/60 bg-brand-500/10"
                    : "border-line bg-ink-800/60 hover:border-ink-500"
                )}
              >
                <span
                  className={cx(
                    "num text-[10px] font-bold",
                    tab === t.id ? "text-brand-400" : "text-fog-400"
                  )}
                >
                  {t.n}
                </span>
                <p
                  className={cx(
                    "text-[12.5px] font-semibold leading-tight sm:text-sm",
                    tab === t.id ? "text-fog-100" : "text-fog-300"
                  )}
                >
                  {t.name}
                </p>
                <p className="mt-0.5 hidden text-[10.5px] leading-tight text-fog-400 md:block">{t.blurb}</p>
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <p className="text-xs text-fog-400">Journey:</p>
          {STATIONS.map((s, i) => (
            <span key={s.k} className="flex items-center gap-2">
              <a
                href={`#${active.prefix}-${s.k}`}
                className="rounded-lg border border-line bg-ink-800/60 px-2.5 py-1 text-[11px] text-fog-300 transition-colors hover:border-brand-500/50 hover:text-brand-300"
              >
                <span className="num font-bold text-fog-400">{s.k.toUpperCase()}</span> · {s.label}
              </a>
              {i < STATIONS.length - 1 && <span className="text-fog-400">→</span>}
            </span>
          ))}
        </div>

        {tab === "metabolic" && <MetabolicModule />}
        {tab === "infection" && <InfectionModule />}
        {tab === "progression" && <ProgressionModule />}

        <footer className="mt-10 border-t border-line pt-5 text-[11px] leading-relaxed text-fog-400">
          <p>
            <strong className="text-fog-300">Diabetic Type Zero</strong> — a research prototype for
            image-based early detection at both ends of the diabetes course: undiagnosed insulin resistance
            in the young, and the infected foot ulcer that leads to amputation. Everything runs in your
            browser; no image leaves this device.
          </p>
          <p className="mt-2">
            Not a medical device. No regulatory clearance. Not validated for clinical use. If you are
            concerned about a wound or about your own risk of diabetes, please see a doctor.
          </p>
        </footer>
      </main>
    </div>
  );
}
