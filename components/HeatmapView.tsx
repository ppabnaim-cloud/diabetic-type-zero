"use client";

import { useEffect, useRef, useState } from "react";
import { TISSUE_COLOUR, TISSUE_LABEL } from "@/lib/tissue";
import { TISSUE_CLASSES, type Roi, type TissueMap } from "@/lib/types";
import { Pill, cx } from "./ui";

/** Perceptually ordered colour ramp for the infection-concern field. */
function concernColour(t: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0.0, [13, 24, 41]],
    [0.3, [27, 94, 112]],
    [0.55, [214, 178, 58]],
    [0.78, [232, 118, 44]],
    [1.0, [229, 46, 46]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t <= p1) {
      const k = (t - p0) / Math.max(1e-6, p1 - p0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return stops[stops.length - 1][1];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export type HeatMode = "tissue" | "infection";

export default function HeatmapView({
  img,
  roi,
  map,
  mode,
  onMode,
  showModes = true,
  height = 280,
}: {
  img: HTMLImageElement | null;
  roi: Roi;
  map: TissueMap | null;
  mode: HeatMode;
  onMode?: (m: HeatMode) => void;
  showModes?: boolean;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [opacity, setOpacity] = useState(0.62);

  useEffect(() => {
    const c = ref.current;
    if (!c || !img || !map) return;
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const cropW = Math.max(1, Math.round(roi.w * sw));
    const cropH = Math.max(1, Math.round(roi.h * sh));

    const scale = Math.min(720 / cropW, 720 / cropH, 3);
    c.width = Math.max(1, Math.round(cropW * scale));
    c.height = Math.max(1, Math.round(cropH * scale));

    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, roi.x * sw, roi.y * sh, cropW, cropH, 0, 0, c.width, c.height);

    // Render the label grid into an offscreen canvas, then scale it up smoothly.
    const off = document.createElement("canvas");
    off.width = map.gw;
    off.height = map.gh;
    const octx = off.getContext("2d")!;
    const id = octx.createImageData(map.gw, map.gh);
    for (let i = 0; i < map.gw * map.gh; i++) {
      let rgb: [number, number, number];
      let a = 255;
      if (mode === "tissue") {
        const cls = TISSUE_CLASSES[map.cls[i]];
        rgb = hexToRgb(TISSUE_COLOUR[cls]);
        if (cls === "background") a = 40;
      } else {
        const t = Math.min(1, Math.max(0, map.infection[i]));
        rgb = concernColour(t);
        a = Math.round(70 + 185 * t);
      }
      const p = i * 4;
      id.data[p] = rgb[0];
      id.data[p + 1] = rgb[1];
      id.data[p + 2] = rgb[2];
      id.data[p + 3] = a;
    }
    octx.putImageData(id, 0, 0);

    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = mode === "infection";
    ctx.drawImage(off, 0, 0, c.width, c.height);
    ctx.globalAlpha = 1;
  }, [img, roi, map, mode, opacity]);

  const present =
    map && mode === "tissue"
      ? TISSUE_CLASSES.filter((cls) => {
          const i = TISSUE_CLASSES.indexOf(cls);
          return map.cls.some((v) => v === i);
        })
      : [];

  return (
    <div className="space-y-3">
      {showModes && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-ink-900 p-0.5">
            {(["tissue", "infection"] as HeatMode[]).map((m) => (
              <button
                key={m}
                onClick={() => onMode?.(m)}
                className={cx(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === m ? "bg-brand-500 text-ink-900" : "text-fog-300 hover:text-fog-100"
                )}
              >
                {m === "tissue" ? "Tissue classes" : "Concern heatmap"}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-[11px] text-fog-400">
            Overlay
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-1 w-24 cursor-pointer accent-brand-400"
            />
          </label>
        </div>
      )}

      <div
        className="grid place-items-center overflow-hidden rounded-xl border border-line bg-ink-900"
        style={{ minHeight: height }}
      >
        <canvas ref={ref} className="max-h-full w-auto max-w-full" style={{ maxHeight: height }} />
      </div>

      {mode === "tissue" ? (
        <div className="flex flex-wrap gap-1.5">
          {present
            .filter((c) => c !== "background")
            .map((cls) => (
              <Pill key={cls}>
                <span
                  className="h-2 w-2 rounded-sm border border-white/20"
                  style={{ background: TISSUE_COLOUR[cls] }}
                />
                {TISSUE_LABEL[cls]}
              </Pill>
            ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-[10.5px] text-fog-400">Low concern</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, rgb(13,24,41), rgb(27,94,112) 30%, rgb(214,178,58) 55%, rgb(232,118,44) 78%, rgb(229,46,46))",
            }}
          />
          <span className="text-[10.5px] text-fog-400">High concern</span>
        </div>
      )}
    </div>
  );
}
