"use client";

import { cosine, skinPixelFraction } from "./cv";
import type { CnnResult } from "./types";

/** MobileNetV2, ImageNet weights, 1.0 depth multiplier, 224x224 input. */
export const MODEL_SPEC = {
  architecture: "MobileNetV2",
  weights: "ImageNet (ILSVRC-2012, 1 000 classes, 1.28 M images)",
  alpha: 1.0,
  input: "224 x 224 x 3",
  pooledFeatureDim: 1280,
  params: "≈ 3.5 M (backbone frozen)",
  runtime: "TensorFlow.js — runs entirely in the browser; no image leaves the device",
};

/*
 * Weight sources, tried in order.
 *
 * @tensorflow-models/mobilenet resolves v2 weights from tfhub.dev by default,
 * which Google has sunset and now redirects. Pinning the long-lived TFJS
 * bucket first avoids depending on that redirect; the tfhub path and the v1
 * backbone remain as fallbacks so the module still loads if either source is
 * unreachable on a given network.
 */
const SOURCES: { label: string; dim: number; opts: Record<string, unknown> }[] = [
  {
    label: "MobileNetV2 1.0 224 (tfjs-models bucket)",
    dim: 1280,
    opts: {
      version: 2,
      alpha: 1.0,
      modelUrl: "https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json",
    },
  },
  { label: "MobileNetV2 1.0 224 (default source)", dim: 1280, opts: { version: 2, alpha: 1.0 } },
  { label: "MobileNetV1 1.0 224 (fallback)", dim: 1024, opts: { version: 1, alpha: 1.0 } },
];

let variantLabel = "";
export function cnnVariant(): string {
  return variantLabel;
}

type AnyModel = {
  infer: (x: HTMLImageElement | HTMLCanvasElement, embedding?: boolean) => { data: () => Promise<Float32Array>; dispose: () => void };
  classify: (x: HTMLImageElement | HTMLCanvasElement, k?: number) => Promise<{ className: string; probability: number }[]>;
};

let model: AnyModel | null = null;
let backendName = "";
let loading: Promise<AnyModel> | null = null;

/** ImageNet classes that plausibly fire on a clinical skin or wound close-up. */
const CLINICAL_HINT = [
  "band aid", "bandage", "nipple", "skin", "mask", "sock", "sandal", "clog", "shoe",
  "bathing cap", "face powder", "lotion", "sunscreen", "hair spray", "cucumber",
  "bolete", "mushroom", "coral fungus", "jellyfish", "sea slug", "conch", "snail",
  "pomegranate", "fig", "strawberry", "jackfruit", "custard apple", "meat loaf",
  "hot pot", "mashed potato", "bagel", "pretzel", "dough", "burrito",
];

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000}s`)), ms);
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

export async function loadCnn(timeoutMs = 30000): Promise<AnyModel> {
  if (model) return model;
  if (loading) return loading;
  loading = withTimeout(
    (async () => {
      const tf = await import("@tensorflow/tfjs");
      const mobilenet = await import("@tensorflow-models/mobilenet");
      try {
        await tf.setBackend("webgl");
        await tf.ready();
      } catch {
        await tf.setBackend("cpu");
        await tf.ready();
      }
      backendName = tf.getBackend();

      let lastErr: unknown = null;
      for (const src of SOURCES) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const m = (await mobilenet.load(src.opts as any)) as unknown as AnyModel;
          variantLabel = src.label;
          model = m;
          return m;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("no MobileNet weight source reachable");
    })(),
    timeoutMs,
    "MobileNetV2 load"
  );
  try {
    return await loading;
  } catch (e) {
    loading = null;
    throw e;
  }
}

export function cnnBackend(): string {
  return backendName;
}

/**
 * Run the frozen ImageNet backbone over the image and return the 1280-d pooled
 * feature vector plus the top ImageNet activations.
 *
 * The embedding is the real output of real transfer-learning features. There is
 * no trained diagnostic head in this prototype — the classification head would
 * be fitted on a labelled clinical dataset, and the scoring shown in the app
 * comes from the morphometric analyser, not from this vector.
 */
export async function runCnn(
  el: HTMLImageElement | HTMLCanvasElement,
  imageData?: ImageData
): Promise<CnnResult> {
  const skin = imageData ? skinPixelFraction(imageData) : undefined;
  try {
    const m = await loadCnn();
    const t0 = performance.now();
    const tensor = m.infer(el, true);
    const embedding = await tensor.data();
    tensor.dispose();
    const topK = await m.classify(el, 5);
    const latencyMs = performance.now() - t0;

    const hinted = topK.some((p) =>
      CLINICAL_HINT.some((h) => p.className.toLowerCase().includes(h))
    );
    const plausible = (skin ?? 0) > 0.22 || hinted;

    return {
      available: true,
      backend: backendName,
      variant: variantLabel,
      latencyMs,
      embedding,
      embeddingDim: embedding.length,
      topK,
      plausibleClinicalImage: plausible,
      skinPixelFraction: skin,
    };
  } catch (e) {
    return {
      available: false,
      error: e instanceof Error ? e.message : String(e),
      skinPixelFraction: skin,
      plausibleClinicalImage: (skin ?? 0) > 0.22,
    };
  }
}

export function embeddingSimilarity(a?: Float32Array, b?: Float32Array): number | undefined {
  if (!a || !b) return undefined;
  return cosine(a, b);
}
