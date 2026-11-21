# Demo image credits and provenance

The images in this directory are **real clinical photographs**, not generated
images. They are included so that the prototype can be demonstrated on genuine
clinical appearances rather than on synthetic approximations.

## Status

These are third-party clinical photographs obtained from publicly accessible
sources on the internet for the purpose of demonstrating a non-commercial
research prototype at a hackathon.

**Publicly accessible is not the same as licensed for redistribution.** Before
this project is used beyond that demonstration — published, promoted, deployed
for real users, or submitted for funding or publication — every image here must
be either:

1. replaced with images carrying an explicit redistribution licence
   (for example Wikimedia Commons CC-BY or CC-BY-SA, with attribution recorded
   below), or
2. replaced with the project's own patient images, held under documented
   consent for publication, or
3. removed, leaving the application upload-only.

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
| | | | |

Fill this table in as images are confirmed.
