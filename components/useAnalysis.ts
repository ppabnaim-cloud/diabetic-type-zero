"use client";

import { useEffect, useState } from "react";
import { analyseRoi, inferCnn, prepare, type Prepared, type RoiAnalysis } from "@/lib/pipeline";
import type { CnnResult, Roi } from "@/lib/types";

export interface AnalysisState {
  prepared: Prepared | null;
  analysis: RoiAnalysis | null;
  cnn: CnnResult | null;
  cnnRunning: boolean;
  preparing: boolean;
  error: string | null;
}

/** Decode + classify on image change; recompute ROI-dependent results on ROI change. */
export function useAnalysis(src: string | null, roi: Roi, withFeatures = true): AnalysisState {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [analysis, setAnalysis] = useState<RoiAnalysis | null>(null);
  const [cnn, setCnn] = useState<CnnResult | null>(null);
  const [cnnRunning, setCnnRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setPrepared(null);
      setAnalysis(null);
      setCnn(null);
      setError(null);
      return;
    }
    let alive = true;
    setPreparing(true);
    setError(null);
    setCnn(null);
    prepare(src)
      .then((p) => {
        if (!alive) return;
        setPrepared(p);
        setPreparing(false);
        setCnnRunning(true);
        inferCnn(p)
          .then((r) => alive && setCnn(r))
          .finally(() => alive && setCnnRunning(false));
      })
      .catch((e) => {
        if (!alive) return;
        setPreparing(false);
        setPrepared(null);
        setError(e instanceof Error ? e.message : "Could not process that image");
      });
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    if (!prepared) {
      setAnalysis(null);
      return;
    }
    try {
      setAnalysis(analyseRoi(prepared, roi, withFeatures));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    }
  }, [prepared, roi, withFeatures]);

  return { prepared, analysis, cnn, cnnRunning, preparing, error };
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
