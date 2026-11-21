"use client";

import type { ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "low" | "mod" | "high" | "warn";
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-ink-700 text-fog-300",
    brand: "border-brand-500/40 bg-brand-500/10 text-brand-300",
    low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    mod: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    high: "border-red-500/40 bg-red-500/10 text-red-300",
    warn: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "subtle" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const variants = {
    primary:
      "bg-brand-500 text-ink-900 hover:bg-brand-400 border-transparent font-semibold shadow-lg shadow-brand-500/20",
    ghost: "bg-ink-700 text-fog-100 hover:bg-ink-600 border-line",
    subtle: "bg-transparent text-fog-300 hover:text-fog-100 hover:bg-ink-700 border-transparent",
    danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25 border-red-500/30",
  } as const;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

export function Station({
  letter,
  title,
  subtitle,
  state = "idle",
  children,
  id,
}: {
  letter: string;
  title: string;
  subtitle?: string;
  state?: "idle" | "active" | "done" | "locked";
  children: ReactNode;
  id?: string;
}) {
  const ring =
    state === "done"
      ? "border-brand-500/45"
      : state === "active"
        ? "border-brand-500/70 shadow-[0_0_0_1px_rgba(45,212,191,0.25)]"
        : "border-line";
  const badge =
    state === "done"
      ? "bg-brand-500 text-ink-900 border-transparent"
      : state === "active"
        ? "bg-brand-500/15 text-brand-300 border-brand-500/50"
        : "bg-ink-700 text-fog-400 border-line";
  return (
    <section id={id} className={cx("panel scroll-mt-24 transition-colors", ring, state === "locked" && "opacity-55")}>
      <header className="flex items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <span
          className={cx(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-[13px] font-bold",
            badge
          )}
        >
          {state === "done" ? "✓" : letter}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight text-fog-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-snug text-fog-400">{subtitle}</p>}
        </div>
      </header>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: "low" | "mod" | "high" | "brand";
}) {
  const colour =
    tone === "high"
      ? "text-red-300"
      : tone === "mod"
        ? "text-amber-300"
        : tone === "low"
          ? "text-emerald-300"
          : tone === "brand"
            ? "text-brand-300"
            : "text-fog-100";
  return (
    <div className="rounded-xl border border-line bg-ink-900/50 px-3 py-2.5">
      <div className="text-[10.5px] uppercase tracking-wider text-fog-400">{label}</div>
      <div className={cx("num mt-1 text-xl font-semibold leading-none", colour)}>
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-fog-400">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[10.5px] leading-tight text-fog-400">{hint}</div>}
    </div>
  );
}

export function Meter({
  value,
  tone = "brand",
  height = 8,
}: {
  value: number; // 0..1
  tone?: "brand" | "low" | "mod" | "high";
  height?: number;
}) {
  const bg =
    tone === "high" ? "#f87171" : tone === "mod" ? "#fbbf24" : tone === "low" ? "#34d399" : "#2dd4bf";
  return (
    <div className="w-full overflow-hidden rounded-full bg-ink-600" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: bg }}
      />
    </div>
  );
}

export function CompositionBar({
  rows,
}: {
  rows: { label: string; pct: number; colour: string }[];
}) {
  const shown = rows.filter((r) => r.pct > 0.05);
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-lg border border-line bg-ink-900">
        {shown.map((r) => (
          <div
            key={r.label}
            title={`${r.label}: ${r.pct.toFixed(1)}%`}
            style={{ width: `${r.pct}%`, background: r.colour }}
            className="h-full transition-[width] duration-500"
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/15"
              style={{ background: r.colour }}
            />
            <dt className="min-w-0 flex-1 truncate text-fog-300">{r.label}</dt>
            <dd className="num font-semibold text-fog-100">{r.pct.toFixed(1)}%</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Note({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "info" }) {
  const tones = {
    neutral: "border-line bg-ink-900/50 text-fog-300",
    warn: "border-amber-500/30 bg-amber-500/[0.07] text-amber-200/90",
    info: "border-brand-500/25 bg-brand-500/[0.06] text-brand-300/90",
  } as const;
  return (
    <div className={cx("rounded-xl border px-3.5 py-3 text-xs leading-relaxed", tones[tone])}>{children}</div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-fog-300">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-400" />
      {label}
    </span>
  );
}
