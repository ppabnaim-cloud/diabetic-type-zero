# Diabetic Type Zero

**Image-based early detection at both ends of the diabetes course.**

Diabetes-related harm — loss of quality of life, healthcare cost, mental health burden — is
driven by late detection at two points. At one end, undiagnosed insulin resistance in young
people that quietly progresses to type 2 diabetes. At the other, an infected foot ulcer that
ends in amputation. Both have a visible phenotype. Both are photographable with a phone.

This is a research prototype of a single platform covering three stations of that course.

> **Not a medical device.** No regulatory clearance, no prospective validation, no trained
> diagnostic head. It is a clinical *support* prototype built for demonstration. Every result
> ends in "please see a doctor", and that is not boilerplate — it is the actual intended use.

---

## The three modules

| # | Module | Question it answers |
|---|--------|---------------------|
| 01 | **Metabolic Skin Scan** | Does this skin show the cutaneous markers of insulin resistance, pre-diabetes or young-onset T2DM? |
| 02 | **Foot Ulcer Infection** | Does this diabetic foot ulcer look infected, and on what evidence? |
| 03 | **Healing Tracker** | Between two visits, is this wound granulating or deteriorating, and by how much? |

Each module runs the same four-station journey:

**A — Image acquisition** → **B — Deep learning** → **C — Data labelling** → **D — Result**

---

## How it actually works

This section is deliberately blunt, because a hackathon prototype that overstates its models is
worse than one that does not exist.

### What is real deep learning

A **MobileNetV2** backbone with **ImageNet** weights runs in full, in the browser, via
TensorFlow.js. It produces the genuine 1280-dimensional pooled feature vector that a diagnostic
head would consume, and its top ImageNet activations. It is used for two things that it is
honestly good at:

- **Input sanity checking** — warning you when the photograph is not a skin or wound close-up.
- **Visual change magnitude** in module 03 — cosine distance between the two visits' embeddings,
  a legitimate perceptual change-detection measure.

Weights are loaded from the long-lived `tfjs-models` bucket, with the package default and a
MobileNetV1 backbone as fallbacks, so the module still loads if one source is unreachable.

### What is *not* trained

**There is no trained diagnostic head.** Fitting one needs a labelled clinical dataset, which
this prototype does not have. Saying otherwise would be fiction.

### What produces the scores

A deterministic **morphometric and colourimetric analyser**, fully specified in `lib/`. It is
not a black box, every threshold is readable, and it is genuinely responsive to the image.

**Tissue-bed segmentation** (`lib/tissue.ts`) classifies every pixel into granulation, slough,
necrosis/eschar, purulent, wet gangrene, epithelial/peri-wound or background, using soft
trapezoidal membership functions over hue, saturation, value and a red-dominance index. Labels
are aggregated to a 64-cell grid and majority-filtered. Percentages are reported as a share of
the **wound bed**, not of the frame, so they do not change when you step closer.

Two design decisions matter clinically:

- **Granulation is separated from erythematous skin** by a value ceiling, not just hue.
  Inflamed peri-wound skin is also red and saturated; without that ceiling spreading cellulitis
  scores as granulation and the healing assessment inverts.
- **Peri-wound erythema is measured against the ring's own calmest quartile**, so it survives a
  change of camera or lighting between visits.

**Metabolic features** (`lib/metabolic.ts`) separate pigment from shadow. Shading is
multiplicative in RGB, so it lowers HSV value but leaves saturation untouched; melanin lowers
value *and* raises saturation. Comparing the dark and light quartiles of a blurred value plane
therefore distinguishes a genuine acanthosis nigricans plaque from a skin fold in shadow — the
single largest source of false positives for this sign.

Erythema is measured **within** each image (90th vs 50th percentile of redness), never against
an absolute threshold. Deeply pigmented skin has an intrinsically higher red-to-green ratio, so
any fixed cut-off would systematically over-call erythema in Fitzpatrick V–VI patients. For a
Malaysian cohort this is not a detail.

Body site is applied as an explicit prior: acanthosis nigricans on a shin does not mean what
acanthosis nigricans on a neck means.

### Scoring

| Module | Score |
|--------|-------|
| 01 | Composite = 0.78·max(Tier 1) + 0.30·max(Tier 2) + 0.14·max(Tier 3) + 0.12 if ≥2 Tier 1 signs |
| 02 | 0.34·purulent + 0.30·gangrene + 0.16·necrosis + 0.08·slough + 0.12·peri-wound erythema |
| 03 | Healing index = Δgranulation − 0.8·Δslough − 1.6·Δnecrosis − 1.2·Δpurulent (percentage points) |

Module 02 suggests an IWGDF/IDSA grade, and states plainly that **grade 4 cannot be assessed
from a photograph** — systemic inflammatory response, probe-to-bone, erythema extent in
centimetres, white cell count and CRP all require bedside assessment. Station C collects those
bedside findings separately and never folds them into the image score.

Module 03 reports composition change only. It deliberately does **not** report absolute wound
area: without a ruler or adhesive fiducial marker in frame, pixel area is not comparable
between photographs, and claiming otherwise would be the easiest way to mislead a clinician.

---

## The label taxonomy

### Module 01 — cutaneous markers

**Tier 1 — directly tied to insulin resistance (the core targets)**

| Sign | Appearance | Where to photograph | Stage |
|------|------------|---------------------|-------|
| Acanthosis nigricans | Velvety, thickened, hyperpigmented ("dirty"-looking) skin | Posterior/lateral neck, axillae, groin, knuckles, elbows, knees | IR → pre-diabetes → young-onset T2DM |
| Acrochordons (skin tags) | Small soft pedunculated papules, often alongside AN | Neck, axillae, eyelids | IR, pre-diabetes |
| Finger pebbles / knuckle pads (Huntley's papules) | Grouped tiny papules giving a cobblestone texture | Over knuckles and finger joints | IR, diabetes |

**Tier 2 — metabolic syndrome companions (supporting, less specific):** eruptive xanthomas,
xanthelasma, PCOS-associated signs (hirsutism, androgenic acne).

**Tier 3 — established disease (photographable, weak for early detection):** diabetic
dermopathy, necrobiosis lipoidica, rubeosis faciei.

### Modules 02 and 03 — tissue bed

Granulation · slough/fibrin · necrosis/eschar · purulent/pus · wet gangrene ·
epithelial/peri-wound, each as a percentage of the wound bed, plus a tissue-class map and a
continuous infection-concern heatmap.

---

## Human-in-the-loop labelling

Station C is not a read-only summary. Every candidate sign can be confirmed or rejected, body
site and bedside findings are entered by the clinician, and the result at Station D recomputes
from those corrections. Each case exports as a JSON record containing the feature vector, the
model's scores and the human labels.

That is the path out of the honest limitation above: **routine use generates the labelled
dataset that a diagnostic head needs.**

---

## Demo images

Every demo image is **procedurally generated in the browser from a fixed seed** and watermarked
`SYNTHETIC DEMO — NOT A PATIENT IMAGE`. No patient photograph is bundled, fetched or stored.

The generators produce colourimetry and texture representative of each condition; the analyser
then measures them independently, with no knowledge of which demo was chosen. Tissue
proportions are allocated by inverting the empirical CDF of the generator's centrality field,
so a demo specified as 44% purulent really does contain about that much.

Measured against the specifications, on the current build:

| Demo | Specified | Analyser reports |
|------|-----------|------------------|
| Infected DFU | 44% purulent | 47.3% purulent → *likely infected* |
| Wet gangrene | 34% gangrene | 20.8% gangrene → *likely infected, grade 3* |
| Clean DFU (control) | 84% granulation | 3% infection concern → *no evidence* |
| Healing pair | granulation 26% → 76% | **+52.7 pp** → *good wound healing* |
| Deteriorating pair | granulation 26% → 4% | **−18.8 pp** → *deterioration* |
| Normal skin (control) | no features | **0%** composite, nothing detected |

Synthetic images validate that the pipeline mechanics work. They say nothing about clinical
accuracy, and no claim of clinical accuracy is made anywhere in this repository.

---

## Privacy

All analysis runs in the browser. No image is uploaded, transmitted or stored on any server;
there is no backend. Exported case files are written to the user's own device. The disclaimer
gate, shown on every load, instructs users not to capture names, IC numbers, registration
numbers, wristbands or faces.

---

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build && npm start
```

Deploys to Vercel as a standard Next.js project with no environment variables and no
configuration.

---

## Stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS ·
TensorFlow.js + MobileNetV2. No backend, no database, no API keys.

```
lib/cv.ts          colour space, trapezoidal membership, blur, DoG blob detection
lib/tissue.ts      per-pixel tissue classification, grid aggregation, peri-wound erythema
lib/metabolic.ts   sign taxonomy, feature extraction, site priors, composite scoring
lib/assess.ts      infection and progression verdicts
lib/cnn.ts         MobileNetV2 loading, embeddings, input sanity check
lib/synth.ts       seeded procedural generation of all demo images
lib/pipeline.ts    decode once, classify once, recompute cheaply on ROI change
```

---

## Limitations

- No trained diagnostic head; no prospective validation; no regulatory clearance.
- Thresholds are set from first principles and the synthetic demos, not fitted to clinical data.
- Performance on real photographs across lighting, camera and skin type is **unknown**.
- Absolute wound area is not measured and must not be inferred.
- IWGDF/IDSA grade 4 is undetectable from an image by construction.
- The sign taxonomy covers photographable signs only; most insulin resistance has no skin sign
  at all, so a negative result excludes nothing.

Built for the MIT Diabetes Hackathon, Kuala Lumpur.
