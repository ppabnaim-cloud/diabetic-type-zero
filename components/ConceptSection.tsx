"use client";

import { useLang } from "@/lib/i18n";
import { Note, Pill, Stat, cx } from "./ui";

/* Long-form pitch content lives here rather than in the flat string table,
   because it is prose rather than interface labels. */

function Section({
  n,
  title,
  lede,
  children,
}: {
  n: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <span className="num mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-brand-500/50 bg-brand-500/15 text-[13px] font-bold text-brand-300">
          {n}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight text-fog-100">{title}</h3>
          {lede && <p className="mt-0.5 text-xs leading-snug text-fog-400">{lede}</p>}
        </div>
      </header>
      <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-fog-200">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

function Phase({
  tag,
  when,
  title,
  items,
  done,
}: {
  tag: string;
  when: string;
  title: string;
  items: string[];
  done?: boolean;
}) {
  return (
    <div
      className={cx(
        "relative rounded-xl border px-4 py-3.5",
        done ? "border-brand-500/45 bg-brand-500/[0.06]" : "border-line bg-ink-900/40"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={done ? "brand" : "neutral"}>{tag}</Pill>
        <span className="text-[11px] text-fog-400">{when}</span>
        {done && <span className="text-[11px] font-semibold text-brand-300">✓ done</span>}
      </div>
      <p className="mt-2 text-[13.5px] font-semibold text-fog-100">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-fog-300">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-fog-400" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ConceptSection() {
  const { lang } = useLang();
  const ms = lang === "ms";

  return (
    <div className="space-y-4">
      <Section
        n="1"
        title={ms ? "Masalah" : "The problem"}
        lede={
          ms
            ? "Kemudaratan diabetes didorong oleh pengesanan lewat di kedua-dua hujung perjalanan penyakit"
            : "Diabetes-related harm is driven by late detection at both ends of the disease course"
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label={ms ? "Risiko ulser kaki seumur hidup" : "Lifetime foot ulcer risk"}
            value="19–34"
            unit="%"
            hint={ms ? "pesakit diabetes" : "of people with diabetes"}
            tone="mod"
          />
          <Stat
            label={ms ? "Amputasi didahului ulser" : "Amputations preceded by an ulcer"}
            value="~85"
            unit="%"
            tone="high"
          />
          <Stat
            label={ms ? "Mortaliti 5 tahun selepas amputasi major" : "5-year mortality after major amputation"}
            value="50–70"
            unit="%"
            tone="high"
          />
        </div>

        <Bullets
          items={
            ms
              ? [
                  "Di hujung awal: rintangan insulin dan diabetes jenis 2 bermula muda boleh senyap selama bertahun-tahun. Menjelang diagnosis, komplikasi mikrovaskular mungkin sudah bermula.",
                  "Di hujung lewat: ulser kaki diabetik yang berjangkit boleh merosot dalam beberapa jam. Kelewatan beberapa hari sahaja menentukan antara debridemen dan amputasi.",
                  "Kedua-dua hujung ini boleh dilihat dengan mata. Tanda kulit rintangan insulin dan dasar luka yang berjangkit adalah diagnosis visual.",
                  "Halangannya bukan sains — tetapi bilangan mata pakar. Pesakit hadir lewat, dan pakar endokrin serta pakar bedah vaskular tidak mencukupi.",
                  "Telefon pintar sudah berada di tangan pesakit dan jururawat komuniti. Kamera itulah penapis pertama yang hilang.",
                ]
              : [
                  "At the early end, insulin resistance and young-onset type 2 diabetes can run silently for years. By the time of diagnosis, microvascular complications may already have started.",
                  "At the late end, an infected diabetic foot ulcer can deteriorate within hours. A delay of days is the difference between debridement and amputation.",
                  "Both ends are visible to the eye. The cutaneous markers of insulin resistance and the appearance of an infected wound bed are visual diagnoses.",
                  "The bottleneck is not the science — it is the number of trained eyes. Patients present late, and there are not enough endocrinologists and vascular surgeons to look sooner.",
                  "A smartphone is already in the patient's hand and the community nurse's pocket. That camera is the missing first filter.",
                ]
          }
        />

        <Note>
          {ms
            ? "Angka di atas adalah anggaran antarabangsa yang mantap (Armstrong et al., NEJM 2017; kesusasteraan IWGDF). Gantikan dengan angka NHMS dan data hospital anda sendiri sebelum pembentangan."
            : "The figures above are well-established international estimates (Armstrong et al., NEJM 2017; the IWGDF literature). Substitute your own NHMS and hospital figures before presenting — local numbers land harder than global ones."}
        </Note>
      </Section>

      <Section
        n="2"
        title={ms ? "Penyelesaian" : "The solution"}
        lede={
          ms
            ? "Satu platform, tiga modul, satu kamera telefon"
            : "One platform, three modules, one phone camera"
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              n: "01",
              t: ms ? "Imbasan Kulit Metabolik" : "Metabolic Skin Scan",
              d: ms
                ? "Mengesan acanthosis nigricans, acrochordon dan finger pebbles — penanda kulit rintangan insulin — lalu menghantar orang muda untuk ujian HbA1c sebelum diabetes bermula."
                : "Detects acanthosis nigricans, acrochordons and finger pebbles — the cutaneous markers of insulin resistance — and sends a young person for an HbA1c before diabetes is established.",
              w: ms ? "Menang: diagnosis bertahun lebih awal" : "Win: diagnosis years earlier",
            },
            {
              n: "02",
              t: ms ? "Jangkitan Ulser Kaki" : "Foot Ulcer Infection",
              d: ms
                ? "Mengukur nanah, gangren basah dan nekrosis sebagai peratusan dasar luka, serta eritema sekeliling luka, lalu mencadangkan gred IWGDF/IDSA."
                : "Measures pus, wet gangrene and necrosis as a share of the wound bed, plus peri-wound erythema, and suggests an IWGDF/IDSA grade.",
              w: ms ? "Menang: rujukan lebih awal, kaki terselamat" : "Win: earlier referral, limb saved",
            },
            {
              n: "03",
              t: ms ? "Penjejak Penyembuhan" : "Healing Tracker",
              d: ms
                ? "Membandingkan dua gambar ulser yang sama dan melaporkan perubahan tisu granulasi dan slough dalam mata peratusan."
                : "Compares two photographs of the same ulcer and reports the change in granulation and slough in percentage points.",
              w: ms ? "Menang: tahu dalam 2 minggu, bukan 2 bulan" : "Win: know in 2 weeks, not 2 months",
            },
          ].map((m) => (
            <div key={m.n} className="rounded-xl border border-line bg-ink-900/40 p-4">
              <span className="num text-[10px] font-bold text-brand-400">{m.n}</span>
              <p className="text-sm font-semibold text-fog-100">{m.t}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-fog-300">{m.d}</p>
              <p className="mt-2.5 text-[11.5px] font-medium text-brand-300">{m.w}</p>
            </div>
          ))}
        </div>

        <Bullets
          items={
            ms
              ? [
                  "Berjalan sepenuhnya dalam pelayar pada peranti. Tiada imej dimuat naik, tiada pelayan, tiada pangkalan data — berfungsi di klinik kesihatan dengan talian yang lemah.",
                  "Oleh kerana tiada imej keluar dari telefon, tiada pemindahan data pesakit untuk ditadbir urus. Ini memendekkan perbualan dengan jawatankunci etika dan ICT.",
                  "Setiap modul menamatkan keputusannya dengan nasihat berjumpa doktor. Ia alat sokongan, bukan pengganti pemeriksaan.",
                ]
              : [
                  "Runs entirely in the browser on the device. No image is uploaded, there is no server and no database — it works in a klinik kesihatan on a poor connection.",
                  "Because no image leaves the phone, there is no patient data transfer to govern. That shortens the conversation with the ethics committee and with ICT considerably.",
                  "Every module ends by telling the user to see a doctor. It is a support tool, not a substitute for examination.",
                ]
          }
        />
      </Section>

      <Section
        n="3"
        title={ms ? "Apa yang benar hari ini" : "What is actually true today"}
        lede={
          ms
            ? "Prototaip yang melebih-lebihkan modelnya lebih teruk daripada yang tidak wujud"
            : "A prototype that overstates its models is worse than one that does not exist"
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">
              {ms ? "Sudah berfungsi" : "Working now"}
            </p>
            <Bullets
              items={
                ms
                  ? [
                      "Tulang belakang MobileNetV2 dengan pemberat ImageNet berjalan penuh dalam pelayar.",
                      "Segmentasi dasar luka setiap piksel, peta haba dan peratusan tisu.",
                      "Penganalisis morfometrik yang setiap ambangnya boleh dibaca dalam repositori.",
                      "Pelabelan manusia dalam gelung dan eksport kes sebagai JSON.",
                    ]
                  : [
                      "A MobileNetV2 backbone with ImageNet weights runs in full, in the browser.",
                      "Per-pixel wound bed segmentation, heatmap and tissue percentages.",
                      "A morphometric analyser whose every threshold is readable in the repository.",
                      "Human-in-the-loop labelling and per-case JSON export.",
                    ]
              }
            />
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              {ms ? "Belum ada" : "Not there yet"}
            </p>
            <Bullets
              items={
                ms
                  ? [
                      "Tiada kepala diagnostik terlatih — belum ada set data klinikal berlabel.",
                      "Tiada pengesahan prospektif, tiada kelulusan pengawalseliaan.",
                      "Ambang ditetapkan daripada prinsip asas, bukan dipadankan kepada data klinikal.",
                      "Prestasi pada pelbagai pencahayaan, kamera dan jenis kulit belum diketahui.",
                    ]
                  : [
                      "No trained diagnostic head — there is no labelled clinical dataset yet.",
                      "No prospective validation and no regulatory clearance.",
                      "Thresholds are set from first principles, not fitted to clinical data.",
                      "Performance across lighting, cameras and skin types is unknown.",
                    ]
              }
            />
          </div>
        </div>

        <Note tone="info">
          {ms ? (
            <>
              <strong className="text-brand-300">Jalan keluarnya terbina dalam produk.</strong> Stesen C
              meminta pengamal mengesahkan atau menolak setiap tanda. Setiap penggunaan rutin menghasilkan
              satu rekod berlabel — vektor ciri, skor model, dan label manusia. Penggunaan itu sendiri
              membina set data latihan yang diperlukan.
            </>
          ) : (
            <>
              <strong className="text-brand-300">The way out is built into the product.</strong> Station C
              asks the clinician to confirm or reject each sign. Every routine use produces one labelled
              record — the feature vector, the model's scores and the human labels. Using it is what builds
              the training set it needs.
            </>
          )}
        </Note>
      </Section>

      <Section
        n="4"
        title={ms ? "Pelan pelaksanaan" : "Implementation plan"}
        lede={ms ? "Daripada prototaip kepada peranti perubatan berdaftar" : "From prototype to registered medical device"}
      >
        <div className="space-y-3">
          <Phase
            done
            tag={ms ? "Fasa 0" : "Phase 0"}
            when={ms ? "Selesai" : "Complete"}
            title={ms ? "Prototaip berfungsi" : "Working prototype"}
            items={
              ms
                ? ["Tiga modul, perjalanan empat stesen, berjalan atas peranti.", "Kod sumber terbuka, setiap ambang boleh diaudit."]
                : ["Three modules, four-station journey, running on-device.", "Open source, every threshold auditable."]
            }
          />
          <Phase
            tag={ms ? "Fasa 1" : "Phase 1"}
            when={ms ? "0–6 bulan" : "0–6 months"}
            title={ms ? "Data dan etika" : "Data and ethics"}
            items={
              ms
                ? [
                    "Pendaftaran NMRR dan kelulusan MREC untuk pengumpulan imej prospektif.",
                    "Kumpul imej daripada klinik kaki diabetik dan klinik endokrin, dengan persetujuan.",
                    "Label piawai emas oleh dua pengamal secara bebas, dengan adjudikasi pihak ketiga.",
                    "Sasaran: beberapa ribu imej berlabel merentas jenis kulit Fitzpatrick III–VI.",
                  ]
                : [
                    "NMRR registration and MREC approval for prospective image collection.",
                    "Collect images from the diabetic foot clinic and the endocrine clinic, with consent.",
                    "Gold-standard labelling by two clinicians independently, with third-party adjudication.",
                    "Target: several thousand labelled images across Fitzpatrick III–VI skin types.",
                  ]
            }
          />
          <Phase
            tag={ms ? "Fasa 2" : "Phase 2"}
            when={ms ? "6–18 bulan" : "6–18 months"}
            title={ms ? "Latih dan sahkan" : "Train and validate"}
            items={
              ms
                ? [
                    "Latih kepala diagnostik di atas tulang belakang yang sudah berjalan hari ini.",
                    "Pengesahan dalaman, kemudian pengesahan luaran di 2–3 hospital KKM yang lain.",
                    "Laporkan sensitiviti, spesifisiti dan kalibrasi berbanding piawai emas pengamal.",
                    "Terbitkan — termasuk jika keputusannya mengecewakan.",
                  ]
                : [
                    "Train the diagnostic head on the backbone that already runs today.",
                    "Internal validation, then external validation at two or three other MOH hospitals.",
                    "Report sensitivity, specificity and calibration against the clinician gold standard.",
                    "Publish it — including if the result is disappointing.",
                  ]
            }
          />
          <Phase
            tag={ms ? "Fasa 3" : "Phase 3"}
            when={ms ? "18–30 bulan" : "18–30 months"}
            title={ms ? "Pengawalseliaan" : "Regulatory"}
            items={
              ms
                ? [
                    "Klasifikasikan sebagai Perisian sebagai Peranti Perubatan di bawah Akta Peranti Perubatan 2012.",
                    "Pendaftaran dengan Pihak Berkuasa Peranti Perubatan (MDA) melalui CAB yang berdaftar.",
                    "Sistem pengurusan kualiti, pengurusan risiko ISO 14971, pengawasan pasca-pasaran.",
                  ]
                : [
                    "Classify as Software as a Medical Device under the Medical Device Act 2012.",
                    "Registration with the Medical Device Authority through a registered conformity assessment body.",
                    "Quality management system, ISO 14971 risk management, post-market surveillance.",
                  ]
            }
          />
          <Phase
            tag={ms ? "Fasa 4" : "Phase 4"}
            when={ms ? "30 bulan +" : "30 months +"}
            title={ms ? "Penggunaan" : "Deployment"}
            items={
              ms
                ? [
                    "Modul 01 di klinik kesihatan, saringan kesihatan sekolah dan universiti, dan farmasi komuniti.",
                    "Modul 02 dan 03 di klinik luka hospital daerah, jururawat kesihatan rumah, dan triaj sebelum rujukan.",
                    "Integrasi dengan sistem rekod kesihatan elektronik KKM.",
                  ]
                : [
                    "Module 01 in klinik kesihatan, school and university health screening, and community pharmacy.",
                    "Modules 02 and 03 in district hospital wound clinics, home-care nursing, and triage before referral.",
                    "Integration with MOH electronic health record systems.",
                  ]
            }
          />
        </div>
      </Section>

      <Section
        n="5"
        title={ms ? "Kes ekonomi" : "The economic case"}
        lede={
          ms
            ? "Satu amputasi yang dielakkan membiayai banyak saringan"
            : "One avoided amputation pays for a great deal of screening"
        }
      >
        <Bullets
          items={
            ms
              ? [
                  "Kos amputasi major bukan sekadar pembedahan: ia termasuk tinggal di wad, rehabilitasi, prostesis, penjagaan jangka panjang, dan kehilangan produktiviti seumur hidup.",
                  "Kos marginal saringan menggunakan alat ini hampir sifar — tiada perkakasan baharu, tiada pelayan, tiada yuran lesen setiap imbasan.",
                  "Oleh itu hujah ekonominya bukan tentang kos alat, tetapi tentang berapa banyak amputasi yang perlu dielakkan untuk membenarkannya. Angka itu kecil.",
                  "Pengesanan awal rintangan insulin pula mengalihkan kos ke hulu: intervensi gaya hidup dan metformin jauh lebih murah daripada dialisis, retinopati dan ulser kaki.",
                ]
              : [
                  "The cost of a major amputation is not the operation: it is the inpatient stay, rehabilitation, the prosthesis, long-term care, and a lifetime of lost productivity.",
                  "The marginal cost of screening with this tool is close to zero — no new hardware, no server, no per-scan licence fee.",
                  "So the economic argument is not about what the tool costs, but about how few amputations must be avoided to justify it. That number is small.",
                  "Early detection of insulin resistance moves cost upstream too: lifestyle intervention and metformin are far cheaper than dialysis, retinopathy and foot ulcers.",
                ]
          }
        />
        <Note tone="warn">
          {ms
            ? "Masukkan kos amputasi sebenar hospital anda dan kadar amputasi tahunan di sini sebelum pembentangan. Angka tempatan yang anda boleh pertahankan jauh lebih meyakinkan daripada anggaran antarabangsa."
            : "Insert your own hospital's amputation cost and annual amputation count here before presenting. A local figure you can defend is far more convincing than an international estimate, and a panel will ask where the number came from."}
        </Note>
      </Section>
    </div>
  );
}
