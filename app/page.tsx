"use client";

import { useEffect, useState } from "react";
import ConceptSection from "@/components/ConceptSection";
import Disclaimer, { Mark } from "@/components/Disclaimer";
import InfectionModule from "@/components/InfectionModule";
import MetabolicModule from "@/components/MetabolicModule";
import ProgressionModule from "@/components/ProgressionModule";
import { Pill, cx } from "@/components/ui";
import { loadCnn } from "@/lib/cnn";
import { LangProvider, useLang, type Lang, type StringKey } from "@/lib/i18n";
import type { ModuleId } from "@/lib/types";

type TabId = ModuleId | "concept";

const TABS: {
  id: TabId;
  n: string;
  nameKey: StringKey;
  blurbKey: StringKey;
  prefix: string;
}[] = [
  { id: "concept", n: "00", nameKey: "tabConcept", blurbKey: "tabConceptBlurb", prefix: "c" },
  { id: "metabolic", n: "01", nameKey: "tabMetabolic", blurbKey: "tabMetabolicBlurb", prefix: "m1" },
  { id: "infection", n: "02", nameKey: "tabInfection", blurbKey: "tabInfectionBlurb", prefix: "m2" },
  { id: "progression", n: "03", nameKey: "tabProgression", blurbKey: "tabProgressionBlurb", prefix: "m3" },
];

const STATIONS: { k: string; key: StringKey }[] = [
  { k: "a", key: "stA" },
  { k: "b", key: "stB" },
  { k: "c", key: "stC" },
  { k: "d", key: "stD" },
];

type ModelState = "loading" | "ready" | "failed";

function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex rounded-lg border border-line bg-ink-900 p-0.5" role="group" aria-label="Language">
      {(["en", "ms"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cx(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors",
            lang === l ? "bg-brand-500 text-ink-900" : "text-fog-400 hover:text-fog-100"
          )}
        >
          {l === "en" ? "EN" : "BM"}
        </button>
      ))}
    </div>
  );
}

function App() {
  const { t } = useLang();
  const [accepted, setAccepted] = useState(false);
  const [tab, setTab] = useState<TabId>("concept");
  const [model, setModel] = useState<ModelState>("loading");

  useEffect(() => {
    if (accepted) window.scrollTo({ top: 0 });
  }, [tab, accepted]);

  const active = TABS.find((x) => x.id === tab)!;

  /*
   * Warm the backbone the moment the disclaimer is accepted. The ImageNet
   * weights are about 14 MB; fetching them lazily on the first demo click
   * puts that wait at the worst possible moment during a demonstration.
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
              {t("appName")}
            </h1>
            <p className="hidden truncate text-[11px] text-fog-400 sm:block">{t("tagline")}</p>
          </div>
          <LanguageToggle />
          <Pill tone="neutral" className="hidden lg:inline-flex">
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
            {model === "ready" ? t("modelReady") : model === "failed" ? t("modelFailed") : t("modelLoading")}
          </Pill>
          <Pill tone="warn" className="hidden sm:inline-flex">
            {t("prototypeBadge")}
          </Pill>
        </div>

        <nav className="mx-auto max-w-5xl px-4 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {TABS.map((x) => (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                className={cx(
                  "rounded-xl border px-2.5 py-2.5 text-left transition-colors sm:px-3",
                  tab === x.id
                    ? "border-brand-500/60 bg-brand-500/10"
                    : "border-line bg-ink-800/60 hover:border-ink-500"
                )}
              >
                <span className={cx("num text-[10px] font-bold", tab === x.id ? "text-brand-400" : "text-fog-400")}>
                  {x.n}
                </span>
                <p
                  className={cx(
                    "text-[11.5px] font-semibold leading-tight sm:text-[13px]",
                    tab === x.id ? "text-fog-100" : "text-fog-300"
                  )}
                >
                  {t(x.nameKey)}
                </p>
                <p className="mt-0.5 hidden text-[10.5px] leading-tight text-fog-400 lg:block">
                  {t(x.blurbKey)}
                </p>
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5">
        {tab !== "concept" && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="text-xs text-fog-400">{t("journey")}:</p>
            {STATIONS.map((s, i) => (
              <span key={s.k} className="flex items-center gap-2">
                <a
                  href={`#${active.prefix}-${s.k}`}
                  className="rounded-lg border border-line bg-ink-800/60 px-2.5 py-1 text-[11px] text-fog-300 transition-colors hover:border-brand-500/50 hover:text-brand-300"
                >
                  <span className="num font-bold text-fog-400">{s.k.toUpperCase()}</span> · {t(s.key)}
                </a>
                {i < STATIONS.length - 1 && <span className="text-fog-400">→</span>}
              </span>
            ))}
          </div>
        )}

        {tab === "concept" && <ConceptSection />}
        {tab === "metabolic" && <MetabolicModule />}
        {tab === "infection" && <InfectionModule />}
        {tab === "progression" && <ProgressionModule />}

        <footer className="mt-10 border-t border-line pt-5 text-[11px] leading-relaxed text-fog-400">
          <p>
            <strong className="text-fog-300">Diabetic Type Zero</strong> — {t("tagline")}.
          </p>
          <p className="mt-2">
            Not a medical device. No regulatory clearance. Not validated for clinical use. All analysis runs
            in your browser; no image leaves this device. If you are concerned about a wound or about your
            own risk of diabetes, please see a doctor.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <LangProvider>
      <App />
    </LangProvider>
  );
}
