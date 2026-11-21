"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileToDataUrl, DEFAULT_ROI, FULL_ROI } from "@/lib/pipeline";
import { type DemoSpec, renderDemo } from "@/lib/synth";
import type { Roi } from "@/lib/types";
import { Button, Note, Pill, cx } from "./ui";

function clampRoi(r: Roi): Roi {
  const w = Math.min(1, Math.max(0.08, r.w));
  const h = Math.min(1, Math.max(0.08, r.h));
  return {
    w,
    h,
    x: Math.min(1 - w, Math.max(0, r.x)),
    y: Math.min(1 - h, Math.max(0, r.y)),
  };
}

function CameraModal({ onClose, onShot }: { onClose: () => void; onShot: (src: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setErr(
          e instanceof Error && e.name === "NotAllowedError"
            ? "Camera permission was declined. Use “Upload image” instead."
            : "No camera available on this device. Use “Upload image” instead."
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    onShot(c.toDataURL("image/jpeg", 0.92));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/85 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h4 className="text-sm font-semibold">Capture image</h4>
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="bg-ink-900">
          {err ? (
            <div className="p-6">
              <Note tone="warn">{err}</Note>
            </div>
          ) : (
            <video ref={videoRef} playsInline muted className="max-h-[60vh] w-full object-contain" />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-[11px] text-fog-400">
            Frame the lesion or wound only. Keep faces, names and IC numbers out of shot.
          </p>
          <Button variant="primary" onClick={shoot} disabled={!!err}>
            Capture
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ImageStage({
  title,
  src,
  roi,
  onSrc,
  onRoi,
  demos,
  onDemo,
  compact = false,
}: {
  title?: string;
  src: string | null;
  roi: Roi;
  onSrc: (src: string | null) => void;
  onRoi: (roi: Roi) => void;
  demos: DemoSpec[];
  onDemo?: (spec: DemoSpec) => void;
  compact?: boolean;
}) {
  const [cam, setCam] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      const out: Record<string, string> = {};
      for (const d of demos) {
        try {
          out[d.id] = renderDemo(d.id, 128);
        } catch {
          /* ignore */
        }
      }
      if (alive) setThumbs(out);
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [demos]);

  const pick = useCallback(
    async (f: File | null | undefined) => {
      if (!f) return;
      setErr(null);
      if (!f.type.startsWith("image/")) {
        setErr("That file is not an image.");
        return;
      }
      if (f.size > 25 * 1024 * 1024) {
        setErr("That image is larger than 25 MB — please use a smaller one.");
        return;
      }
      try {
        onSrc(await fileToDataUrl(f));
        onRoi(DEFAULT_ROI);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not read that file.");
      }
    },
    [onSrc, onRoi]
  );

  const pointTo = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const liveRoi: Roi | null = drag
    ? clampRoi({
        x: Math.min(drag.x0, drag.x1),
        y: Math.min(drag.y0, drag.y1),
        w: Math.abs(drag.x1 - drag.x0),
        h: Math.abs(drag.y1 - drag.y0),
      })
    : null;

  return (
    <div className="space-y-4">
      {title && <p className="text-xs font-semibold uppercase tracking-wider text-fog-400">{title}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => setCam(true)}>
          Take photo
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          Upload image
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {src && (
          <Button variant="subtle" onClick={() => onSrc(null)}>
            Clear
          </Button>
        )}
      </div>

      {err && <Note tone="warn">{err}</Note>}

      {src ? (
        <div className="space-y-2.5">
          <div
            ref={boxRef}
            className="relative select-none overflow-hidden rounded-xl border border-line bg-ink-900 touch-none"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              const p = pointTo(e);
              setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
            }}
            onPointerMove={(e) => {
              if (!drag) return;
              const p = pointTo(e);
              setDrag({ ...drag, x1: p.x, y1: p.y });
            }}
            onPointerUp={() => {
              if (liveRoi && liveRoi.w > 0.08 && liveRoi.h > 0.08) onRoi(liveRoi);
              setDrag(null);
            }}
            onPointerCancel={() => setDrag(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Selected clinical image"
              className={cx("block w-full object-contain", compact ? "max-h-64" : "max-h-[22rem]")}
              draggable={false}
            />
            {(() => {
              const r = liveRoi ?? roi;
              return (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-ink-900/55" />
                  <div
                    className="pointer-events-none absolute border-2 border-brand-400 shadow-[0_0_0_9999px_rgba(7,11,20,0.0)]"
                    style={{
                      left: `${r.x * 100}%`,
                      top: `${r.y * 100}%`,
                      width: `${r.w * 100}%`,
                      height: `${r.h * 100}%`,
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.5) inset",
                    }}
                  >
                    <div className="absolute inset-0 backdrop-brightness-[1.85]" />
                    <span className="absolute -top-6 left-0 rounded bg-brand-400 px-1.5 py-0.5 text-[10px] font-bold text-ink-900">
                      ROI
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 text-[11px] text-fog-400">
              Drag on the image to set the region of interest — the lesion or the wound bed only.
            </p>
            <Button variant="subtle" onClick={() => onRoi(DEFAULT_ROI)}>
              Reset ROI
            </Button>
            <Button variant="subtle" onClick={() => onRoi(FULL_ROI)}>
              Whole image
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-ink-900/40 px-4 py-8 text-center">
          <p className="text-sm text-fog-300">No image selected</p>
          <p className="mt-1 max-w-sm text-xs text-fog-400">
            Take a photo, upload a file, or pick one of the synthetic demo images below.
          </p>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-fog-400">Demo images</p>
          <Pill>Synthetic · generated on this device</Pill>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {demos.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setErr(null);
                onSrc(renderDemo(d.id, 448));
                onRoi(DEFAULT_ROI);
                onDemo?.(d);
              }}
              className="group overflow-hidden rounded-xl border border-line bg-ink-900/60 text-left transition-colors hover:border-brand-500/60"
            >
              <div className="aspect-square w-full overflow-hidden bg-ink-900">
                {thumbs[d.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[d.id]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-ink-700" />
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-[11.5px] font-medium leading-tight text-fog-100 group-hover:text-brand-300">
                  {d.title}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-tight text-fog-400">{d.note}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {cam && <CameraModal onClose={() => setCam(false)} onShot={(s) => { onSrc(s); onRoi(DEFAULT_ROI); }} />}
    </div>
  );
}
