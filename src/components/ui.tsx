"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass rounded-2xl p-5", className)}>{children}</div>;
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
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold">{children}</h3>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
};

export function Button({ variant = "ghost", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
        variant === "primary" &&
          "bg-gradient-to-b from-[#5b86ff] to-primary-2 text-white shadow-[0_8px_24px_-8px_rgba(79,124,255,0.7)] hover:brightness-110",
        variant === "ghost" && "border border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-tint/10",
        variant === "danger" && "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
        variant === "success" && "border border-success/30 bg-success/10 text-success hover:bg-success/20",
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
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
        variant === "primary" && "bg-primary text-white hover:brightness-110",
        variant === "ghost" && "border border-line bg-surface-2 hover:bg-tint/10",
        variant === "success" && "border border-success/30 bg-success/10 text-success hover:bg-success/20",
        className,
      )}
    >
      {children}
    </a>
  );
}

const BADGE: Record<string, string> = {
  blue: "bg-primary/15 text-badge-blue border-primary/25",
  green: "bg-success/12 text-success border-success/25",
  yellow: "bg-warning/12 text-warning border-warning/25",
  red: "bg-danger/12 text-danger border-danger/25",
  gray: "bg-tint/5 text-muted border-line",
  purple: "bg-[#8b5cf6]/15 text-badge-purple border-[#8b5cf6]/25",
};

export function Badge({ color = "gray", children }: { color?: keyof typeof BADGE | string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
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
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
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
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative w-full rounded-2xl border border-line-strong bg-surface-solid p-6 shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-tint/10 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        {label}
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</div>;
}

export function Loading() {
  return <div className="p-10 text-center text-sm text-muted">Memuat…</div>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{children}</p>;
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
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              on ? "border-primary bg-primary/20 text-ink" : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
