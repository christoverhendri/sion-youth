"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CountUp } from "./effects";
import { cn } from "@/lib/utils";

export function Card({ className, children, tilt }: { className?: string; children: React.ReactNode; tilt?: boolean }) {
  return (
    <div data-tilt={tilt || undefined} className={cn("glass rounded-[26px] p-5 sm:p-7", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  action,
  sub,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[17px] font-bold">{children}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  action,
  eyebrow,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
        <h1 className="text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[52px]">
          <AccentTitle text={title} />
        </h1>
        {sub && <p className="mt-3 max-w-2xl text-[15px] text-muted sm:text-base">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
    </div>
  );
}

/** Kata terakhir judul ditulis serif miring emas, seperti "grows" di referensi desain */
export function AccentTitle({ text }: { text: string }) {
  const i = text.lastIndexOf(" ");
  if (i < 0) return <span className="accent-serif">{text}</span>;
  return (
    <>
      {text.slice(0, i + 1)}
      <span className="accent-serif">{text.slice(i + 1)}</span>
    </>
  );
}

type BtnProps =React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
};

export function Button({ variant = "ghost", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "pressable inline-flex items-center justify-center gap-2 rounded-full font-medium disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "min-h-9 px-4 py-1.5 text-xs" : "min-h-11 px-5 py-2 text-sm",
        variant === "primary" && "btn-gold font-semibold",
        variant === "ghost" && "btn-ghost",
        variant === "danger" && "border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15",
        variant === "success" && "border border-success/25 bg-success/10 text-success hover:bg-success/15",
        className,
      )}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "ghost",
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "success";
  className?: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(
        "pressable inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium",
        variant === "primary" && "btn-gold font-semibold",
        variant === "ghost" && "btn-ghost",
        variant === "success" && "border border-success/25 bg-success/10 text-success hover:bg-success/15",
        className,
      )}
    >
      {children}
    </a>
  );
}

const BADGE: Record<string, string> = {
  blue: "bg-steel/15 text-badge-blue",
  green: "bg-gold/15 text-primary",
  yellow: "bg-warning/14 text-warning",
  red: "bg-danger/12 text-danger",
  gray: "bg-tint/[0.06] text-muted",
  purple: "bg-badge-purple/14 text-badge-purple",
};

export function Badge({ color = "gray", children }: { color?: keyof typeof BADGE | string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        BADGE[color] ?? BADGE.gray,
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  // Dipasang di <body>: kartu kaca (backdrop-filter) & kartu 3D (transform) akan
  // membuat position: fixed menempel ke kartu, bukan ke layar.
  const isi = (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="anim-scrim fixed inset-0 bg-[#03060c]/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "anim-pop relative w-full rounded-[30px] border border-line bg-[var(--nav-pop)] p-6 shadow-pop backdrop-blur-2xl sm:p-8",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="pressable grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:border-gold/50 hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
  return typeof document === "undefined" ? isi : createPortal(isi, document.body);
}

export function Stat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Card tilt className="group p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 text-[13px] font-semibold text-muted">
        {label}
        {icon && (
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-gold/30 bg-gold/10 text-gold-hi shadow-[0_0_18px_-6px_rgba(198,161,91,0.7)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-4 text-[38px] font-bold leading-none tracking-[-0.03em] tabular-nums">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[22px] bg-surface-2 px-6 py-10 text-center text-sm text-muted">{children}</div>;
}

export function Loading() {
  return (
    <div className="anim-scrim grid min-h-[50vh] place-items-center content-center gap-5 p-16 text-sm" role="status">
      <div className="loader" aria-hidden>
        <span />
        <span />
        <span className="orbit" />
        <span className="orbit inner" />
        <span className="core" />
      </div>
      <span className="shimmer-text font-medium tracking-wide">Memuat…</span>
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      {children}
    </p>
  );
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button"
            key={o}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              "pressable min-h-8 rounded-full px-3.5 py-1.5 text-xs font-medium",
              on
                ? "bg-gold/15 text-ink shadow-[inset_0_0_0_1px_rgba(198,161,91,0.55),0_4px_14px_-6px_rgba(198,161,91,0.6)]"
                : "border border-line bg-surface-2 text-muted hover:border-gold/40 hover:text-ink",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
