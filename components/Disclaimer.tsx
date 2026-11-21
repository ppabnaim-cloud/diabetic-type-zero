"use client";

import { useState } from "react";
import { Button } from "./ui";

const POINTS: { title: string; body: string }[] = [
  {
    title: "This is a prototype under ongoing validation",
    body: "Diabetic Type Zero is a research prototype built for demonstration. Its models have not been validated on a prospective clinical cohort, have no regulatory clearance, and are not a medical device.",
  },
  {
    title: "It is a clinical support tool, not a diagnosis",
    body: "Every output is a prompt to look harder, not a conclusion. Confirmation of any diagnosis still requires assessment by a doctor, together with blood tests, examination and — where relevant — imaging and microbiology.",
  },
  {
    title: "Do not photograph patient identifiers",
    body: "Never include a patient's name, IC or MyKad number, hospital registration number, ward board, wristband or face in any image. Frame the lesion or the wound only.",
  },
  {
    title: "Images stay on this device",
    body: "All analysis runs in your browser. No image is uploaded, transmitted or stored on any server. Exported case files are written to your own device only.",
  },
  {
    title: "If you are worried, go and see a doctor",
    body: "An infected diabetic foot can deteriorate within hours. Fever, spreading redness, severe pain, a black or malodorous wound, or feeling systemically unwell are reasons to seek care the same day — regardless of anything this app says.",
  },
];

export default function Disclaimer({ onAccept }: { onAccept: () => void }) {
  const [ack, setAck] = useState(false);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-900/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-dvh max-w-2xl items-center px-4 py-8">
        <div className="panel w-full overflow-hidden">
          <header className="border-b border-line px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <Mark />
              <div>
                <h1 className="text-lg font-semibold leading-tight text-fog-100">Diabetic Type Zero</h1>
                <p className="text-xs text-fog-400">
                  Image-based early detection across the diabetes course
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-4 px-5 py-5 sm:px-6">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-amber-300">
              Please read before you continue
            </p>
            <ul className="space-y-3.5">
              {POINTS.map((p, i) => (
                <li key={p.title} className="flex gap-3">
                  <span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-amber-500/35 bg-amber-500/10 text-[11px] font-bold text-amber-300">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-medium leading-snug text-fog-100">{p.title}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-fog-300">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <footer className="space-y-3.5 border-t border-line bg-ink-900/50 px-5 py-5 sm:px-6">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-400"
              />
              <span className="text-[12.5px] leading-snug text-fog-200">
                I understand this is an unvalidated prototype that does not diagnose, and I will not capture
                any patient-identifiable information.
              </span>
            </label>
            <Button variant="primary" disabled={!ack} onClick={onAccept} className="w-full">
              I understand — continue
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
}

export function Mark({ size = 38 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl border border-brand-500/35 bg-gradient-to-br from-brand-500/25 to-ink-700"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8.2" stroke="#2dd4bf" strokeWidth="1.8" />
        <path d="M3 12h4l2-4 3 8 2.2-5 1.8 3h5" stroke="#5eead4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
