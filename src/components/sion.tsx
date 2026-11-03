"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Inisial dua huruf dari nama */
export function inisial(nama: string) {
  return nama
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Avatar inisial; warna bergilir emas → baja → ivory seperti desain */
export function Av({ nama, i = 0, size, className }: { nama: string; i?: number; size?: number; className?: string }) {
  const v = ["", "b", "c"][Math.abs(i) % 3];
  return (
    <span
      className={cn("s-av", v, className)}
      style={size ? { width: size, height: size, fontSize: Math.round(size * 0.32) } : undefined}
      aria-hidden
    >
      {inisial(nama)}
    </span>
  );
}

/** Panel kaca besar dengan radius 30px */
export function Panel({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section className={cn("glass s-panel", className)} style={style}>
      {children}
    </section>
  );
}

/** Judul panel: kata aksen ditulis serif miring emas, mis. title="Ulang" accent="tahun" */
export function PanelHead({
  title,
  accent,
  sub,
  action,
  className,
}: {
  title: string;
  accent?: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-[18px] flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="s-h2">
          {title}
          {accent && (
            <>
              {" "}
              <span className="accent-serif">{accent}</span>
            </>
          )}
        </h2>
        {sub && <p className="s-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Tautan kecil emas dengan panah yang bergeser saat disorot */
export function More({ href, children, onClick }: { href?: string; children: React.ReactNode; onClick?: () => void }) {
  const isi = (
    <>
      {children} <ArrowRight size={14} strokeWidth={2.4} />
    </>
  );
  if (href)
    return (
      <Link href={href} className="s-more">
        {isi}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className="s-more">
      {isi}
    </button>
  );
}

/** Segmented control: pilihan aktif jadi kapsul emas */
export function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
  small,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  label: string;
  small?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("s-seg", small && "sm", className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && <span className="count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Centang kotak emas (ikon centang tergambar) */
export function CheckIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}
