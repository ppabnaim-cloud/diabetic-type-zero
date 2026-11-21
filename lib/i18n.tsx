"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ms";

/**
 * Bilingual strings, English and Bahasa Melayu.
 *
 * Patient-facing and navigational text is fully translated. Technical and
 * clinical detail — the sign taxonomy, feature names, ImageNet class labels —
 * stays in English, which is how these terms are used in Malaysian clinical
 * practice and avoids inventing Malay coinages for them.
 */
const EN = {
  appName: "Diabetic Type Zero",
  tagline: "Image-based early detection across the diabetes course",
  prototypeBadge: "Prototype · not for clinical use",
  modelReady: "Model ready",
  modelLoading: "Loading model",
  modelFailed: "Analyser only",
  language: "Language",

  tabConcept: "The Case",
  tabConceptBlurb: "The problem, the solution and how this gets deployed",
  tabMetabolic: "Metabolic Skin Scan",
  tabMetabolicBlurb: "Early signs of insulin resistance, pre-diabetes and young-onset type 2 diabetes",
  tabInfection: "Foot Ulcer Infection",
  tabInfectionBlurb: "Early detection of an infected diabetic foot ulcer, to prevent amputation",
  tabProgression: "Healing Tracker",
  tabProgressionBlurb: "Granulation and slough change between two visits",

  journey: "Journey",
  stA: "Capture",
  stB: "Deep learning",
  stC: "Labels",
  stD: "Result",

  takePhoto: "Take photo",
  uploadImage: "Upload image",
  clear: "Clear",
  resetRoi: "Reset ROI",
  wholeImage: "Whole image",
  roiHint: "Drag on the image to set the region of interest — the lesion or the wound bed only.",
  noImage: "No image selected",
  noImageHint: "Take a photo, upload a file, or pick one of the demo images below.",
  demoImages: "Demo images",
  demoBadge: "Real clinical photographs",
  startNew: "Start a new case",
  exportCase: "Export labelled case (JSON)",
  selectFirst: "Select an image at Station A first.",
  completeFirst: "Complete Stations A–C to see the result.",
  clinicianNote: "Clinician note (optional)",
  noIdentifiers: "No patient identifiers.",
  seeDoctor: "please go and see a doctor",

  disclaimerHeading: "Please read before you continue",
  disclaimerAck:
    "I understand this is an unvalidated prototype that does not diagnose, and I will not capture any patient-identifiable information.",
  disclaimerContinue: "I understand — continue",
} as const;

const MS: Record<keyof typeof EN, string> = {
  appName: "Diabetic Type Zero",
  tagline: "Pengesanan awal berasaskan imej sepanjang perjalanan penyakit diabetes",
  prototypeBadge: "Prototaip · bukan untuk kegunaan klinikal",
  modelReady: "Model sedia",
  modelLoading: "Memuatkan model",
  modelFailed: "Penganalisis sahaja",
  language: "Bahasa",

  tabConcept: "Konsep",
  tabConceptBlurb: "Masalah, penyelesaian dan pelan pelaksanaan",
  tabMetabolic: "Imbasan Kulit Metabolik",
  tabMetabolicBlurb:
    "Tanda awal rintangan insulin, pra-diabetes dan diabetes jenis 2 bermula muda",
  tabInfection: "Jangkitan Ulser Kaki",
  tabInfectionBlurb:
    "Pengesanan awal ulser kaki diabetik yang berjangkit, untuk mencegah pembedahan potong anggota",
  tabProgression: "Penjejak Penyembuhan",
  tabProgressionBlurb: "Perubahan tisu granulasi dan slough antara dua lawatan",

  journey: "Perjalanan",
  stA: "Ambil imej",
  stB: "Pembelajaran mendalam",
  stC: "Pelabelan",
  stD: "Keputusan",

  takePhoto: "Ambil gambar",
  uploadImage: "Muat naik imej",
  clear: "Kosongkan",
  resetRoi: "Set semula ROI",
  wholeImage: "Seluruh imej",
  roiHint:
    "Seret pada imej untuk menetapkan kawasan tumpuan — hanya lesi atau dasar luka sahaja.",
  noImage: "Tiada imej dipilih",
  noImageHint: "Ambil gambar, muat naik fail, atau pilih salah satu imej demo di bawah.",
  demoImages: "Imej demo",
  demoBadge: "Gambar klinikal sebenar",
  startNew: "Mulakan kes baharu",
  exportCase: "Eksport kes berlabel (JSON)",
  selectFirst: "Pilih imej di Stesen A terlebih dahulu.",
  completeFirst: "Lengkapkan Stesen A–C untuk melihat keputusan.",
  clinicianNote: "Catatan klinikal (pilihan)",
  noIdentifiers: "Tiada maklumat pengenalan pesakit.",
  seeDoctor: "sila berjumpa doktor",

  disclaimerHeading: "Sila baca sebelum meneruskan",
  disclaimerAck:
    "Saya faham ini adalah prototaip yang belum disahkan dan tidak membuat diagnosis, dan saya tidak akan merakam sebarang maklumat yang boleh mengenal pasti pesakit.",
  disclaimerContinue: "Saya faham — teruskan",
};

export type StringKey = keyof typeof EN;
const DICT: Record<Lang, Record<StringKey, string>> = { en: EN, ms: MS };

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
}

const LangCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => EN[k] });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dtz-lang");
      if (saved === "ms" || saved === "en") setLangState(saved);
    } catch {
      /* private browsing, blocked storage — English is a fine default */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("dtz-lang", l);
    } catch {
      /* ignore */
    }
  };

  return (
    <LangCtx.Provider value={{ lang, setLang, t: (k) => DICT[lang][k] ?? EN[k] }}>
      {children}
    </LangCtx.Provider>
  );
}

export function useLang(): Ctx {
  return useContext(LangCtx);
}

/** Pick one of two already-written strings by the active language. */
export function pick(lang: Lang, en: string, ms: string): string {
  return lang === "ms" ? ms : en;
}
