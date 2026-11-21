# Demo image credits and provenance

The images in this directory are **real clinical photographs**, not generated
images. They are included so that the prototype can be demonstrated on genuine
clinical appearances rather than on synthetic approximations.

## Status

Images fall into two groups.

**Openly licensed (Wikimedia Commons).** The infection-module images carry an
explicit redistribution licence and are attributed in the table below. Any
reuse must preserve that attribution; the CC BY-SA image additionally requires
that derivatives be shared under the same licence.

**Contributed clinical photographs.** The metabolic-module images and the
healing series were supplied by the project owner. They have been cropped to
remove ears, hair, ward backgrounds and surgical drapes, and re-encoded so that
EXIF metadata is discarded. Before this project goes beyond hackathon
demonstration — published, promoted, deployed to real users, or submitted for
funding or publication — the provenance and consent basis of every contributed
image must be documented here, or the image replaced with an openly licensed
equivalent or the project's own consented patient images.

## No patient-identifiable information

No image in this directory may contain a face, a name, an IC or MyKad number, a
hospital registration number, a wristband, a ward board, or any other
identifier. Crop before committing, and strip EXIF metadata — phone photographs
carry GPS coordinates and device identifiers by default:

```bash
exiftool -all= -overwrite_original public/demo/*.jpg
```

## Attribution

| File | Source | Licence | Attribution |
|------|--------|---------|-------------|
| `m2-dfu-necrotic.jpg` | [Diabetic foot ulceration.jpg](https://commons.wikimedia.org/wiki/File%3ADiabetic_foot_ulceration.jpg) | CC BY-SA 3.0 | Milorad Dimic MD, Niš, Serbia |
| `m2-dfu-granulating.jpg` | [Neuropathic heel ulcer diabetic.jpg](https://commons.wikimedia.org/wiki/File%3ANeuropathic_heel_ulcer_diabetic.jpg) | CC BY 3.0 | Jonathan Moore |
| `m2-dfu-gangrene.jpg` | [Dry gangrene 4th toe.jpg](https://commons.wikimedia.org/wiki/File%3ADry_gangrene_4th_toe.jpg) | CC BY-SA 3.0 | see source page |
| `m1-acanthosis-neck.jpg` | Contributed by project owner | To be documented | — |
| `m1-acanthosis-neck-2.jpg` | Contributed by project owner | To be documented | — |
| `m1-acanthosis-axilla.jpg` | Contributed by project owner | To be documented | — |
| `m1-skin-tags-neck.jpg` | Contributed by project owner | To be documented | — |
| `m1-normal-skin.jpg` | Contributed by project owner | To be documented | — |
| `m2-dfu-clean.jpg` | Contributed by project owner | To be documented | — |
| `m3-visit1.jpg` | Contributed by project owner | To be documented | — |
| `m3-visit2.jpg` | Contributed by project owner | To be documented | — |

The "to be documented" rows are the outstanding action before any wider
release. They are listed explicitly rather than left blank so that the gap is
visible rather than forgotten.
