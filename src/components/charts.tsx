"use client";

import { useId, useState } from "react";
import { Empty } from "./ui";

// Palet desain: emas, baja, emas muda, navy, ivory gelap — tanpa hijau
export const PALET = ["#C6A15B", "#99A7BD", "#E3C68A", "#5C6E8C", "#D8CFBF", "#8A6A2C", "#C9D3E2", "#3A4D6E"];

/** Batang horizontal: label | lintasan gradasi baja→emas | nilai. Tumbuh bertahap saat muncul. */
export function HBar({
  data,
  unit,
  max = 12,
}: {
  data: { name: string; value: number }[];
  /** tidak dipakai lagi: semua batang memakai gradasi yang sama seperti desain */
  series?: number;
  unit?: string;
  max?: number;
}) {
  if (!data.length) return <Empty>Belum ada data.</Empty>;
  const rows = data.slice(0, max);
  const top = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.name} className="s-hb" title={`${r.name}: ${r.value}${unit ? ` ${unit}` : ""}`}>
          <span className="lbl">{r.name}</span>
          <span className="s-track">
            <i style={{ width: `${Math.max(2, (r.value / top) * 100)}%`, animationDelay: `${0.15 + i * 0.07}s` }} />
          </span>
          <span className="v">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut cincin dengan total di tengah + legenda kotak dan persentase */
export function Donut({ data, label = "jemaat" }: { data: { name: string; value: number }[]; unit?: string; label?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [aktif, setAktif] = useState<number | null>(null);
  if (!total) return <Empty>Belum ada data.</Empty>;
  const C = 2 * Math.PI * 60;
  const lens = data.map((d) => (d.value / total) * C);
  const seg = data.map((d, i) => {
    const off = lens.slice(0, i).reduce((s, x) => s + x, 0);
    return { ...d, col: PALET[i % PALET.length], dash: `${Math.max(0, lens[i] - 2)} ${C}`, off: -off, pct: Math.round((d.value / total) * 100) };
  });
  const fokus = aktif === null ? null : seg[aktif];
  return (
    <div className="flex flex-wrap items-center gap-7">
      <svg
        className="s-donut shrink-0"
        width="180"
        height="180"
        viewBox="0 0 180 180"
        role="img"
        aria-label={seg.map((s) => `${s.name} ${s.pct}%`).join(", ")}
      >
        <circle cx="90" cy="90" r="60" stroke="var(--surface-2)" strokeWidth="22" />
        {seg.map((s, i) => (
          <circle
            key={s.name}
            cx="90"
            cy="90"
            r="60"
            stroke={s.col}
            strokeWidth={aktif === i ? 26 : 22}
            strokeDasharray={s.dash}
            strokeDashoffset={s.off}
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-width .3s, opacity .3s", opacity: aktif === null || aktif === i ? 1 : 0.35 }}
            onPointerEnter={() => setAktif(i)}
            onPointerLeave={() => setAktif(null)}
          />
        ))}
        <text x="90" y="88" textAnchor="middle" fontSize="30" fontWeight="800" fill="var(--text)">
          {fokus ? fokus.value : total}
        </text>
        <text x="90" y="110" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--muted)">
          {fokus ? fokus.name : label}
        </text>
      </svg>
      <div className="min-w-[160px] flex-1">
        {seg.map((s, i) => (
          <div
            key={s.name}
            className="s-legend cursor-default"
            onPointerEnter={() => setAktif(i)}
            onPointerLeave={() => setAktif(null)}
          >
            <i style={{ background: s.col }} />
            <span className="flex-1">{s.name}</span>
            <span className="text-muted tabular-nums">{s.value}</span>
            <b className="w-10 text-right tabular-nums">{s.pct}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grafik kolom: batang baja, batang terakhir menyala emas; nilai muncul saat disorot */
export function TrendBars({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <Empty>Belum ada data absensi.</Empty>;
  const top = Math.max(...data.map((d) => d.value), 1) * 1.08;
  return (
    <div className="s-cols" role="img" aria-label={`Kehadiran ${data.length} minggu, terakhir ${data.at(-1)!.value} orang`}>
      {data.map((d, i) => {
        const last = i === data.length - 1;
        return (
          <div key={d.name + i} className="s-col">
            <span className={last ? "tip show" : "tip"}>{d.value}</span>
            <span
              className={last ? "b hi" : "b"}
              style={{ height: `${Math.max(4, (d.value / top) * 180)}px`, animationDelay: `${0.2 + i * 0.05}s` }}
            />
            <span className="x">{d.name}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Kurva halus melewati titik-titik (Catmull-Rom → Bezier) */
function kurva(pts: [number, number][]) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : "";
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Tren kehadiran: garis gradasi baja→emas yang tergambar, area emas, titik puncak berdenyut */
export function TrendArea({ data, height = 170 }: { data: { name: string; value: number }[]; height?: number }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <Empty>Belum ada data absensi.</Empty>;
  const W = 320;
  const H = 150;
  const vals = data.map((d) => d.value);
  const lo = Math.min(...vals) * 0.9;
  const hi = Math.max(...vals) * 1.05 || 1;
  const pts: [number, number][] = data.map((d, i) => [
    data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
    H - 12 - ((d.value - lo) / (hi - lo || 1)) * (H - 40),
  ]);
  const line = kurva(pts);
  const tampil = hover ?? data.length - 1;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden className="overflow-visible">
        <defs>
          <linearGradient id={`l${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#99A7BD" />
            <stop offset="1" stopColor="#E3C68A" />
          </linearGradient>
          <linearGradient id={`a${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#C6A15B" stopOpacity="0.38" />
            <stop offset="1" stopColor="#C6A15B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M0 ${H * 0.27} H${W} M0 ${H * 0.53} H${W} M0 ${H * 0.8} H${W}`} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={`url(#a${id})`} className="trend-area" />
        <path d={line} fill="none" stroke={`url(#l${id})`} strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} className="trend-line" />
        {hover !== null && (
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1="0" y2={H} stroke="var(--border-strong)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* Titik puncak (HTML supaya tetap bulat walau SVG diregangkan) */}
      <span
        className="trend-dot pointer-events-none absolute h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[#1a1408] bg-[#F3DDA8]"
        style={{ left: `${(pts[tampil][0] / W) * 100}%`, top: `${(pts[tampil][1] / H) * height}px` }}
      />
      <span
        className="trend-tag pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-primary backdrop-blur-xl"
        style={{ left: `${Math.min(88, Math.max(12, (pts[tampil][0] / W) * 100))}%`, top: `${(pts[tampil][1] / H) * height - 44}px` }}
      >
        {data[tampil].value} hadir · {data[tampil].name}
      </span>
      {/* Area sentuh per titik */}
      <div className="absolute inset-0 flex" onPointerLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <span key={d.name + i} className="h-full flex-1" onPointerEnter={() => setHover(i)} title={`${d.name}: ${d.value}`} />
        ))}
      </div>
      <span className="sr-only">
        Kehadiran terakhir {data.at(-1)!.value} orang ({data.at(-1)!.name})
      </span>
    </div>
  );
}
