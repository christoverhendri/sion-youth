"use client";

import { useEffect, useRef, useState } from "react";

/** Latar animasi: bola cahaya emas/navy/baja yang melayang pelan, pita emas, butiran halus. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <svg className="ribbon absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="pita" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c6a15b" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ead096" stopOpacity="0.9" />
            <stop offset="1" stopColor="#c6a15b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-40 760 C 320 620, 520 900, 820 640 S 1300 300, 1500 360" stroke="url(#pita)" strokeWidth="1.4" />
        <path
          d="M-40 820 C 360 700, 560 940, 880 700 S 1320 420, 1500 460"
          stroke="url(#pita)"
          strokeWidth="0.8"
          style={{ animationDelay: "-6s", opacity: 0.5 }}
        />
        <path className="gleam" d="M-40 760 C 320 620, 520 900, 820 640 S 1300 300, 1500 360" />
        <path
          className="gleam"
          d="M-40 820 C 360 700, 560 940, 880 700 S 1320 420, 1500 460"
          style={{ animationDuration: "13s", animationDelay: "-5s" }}
        />
      </svg>
      <div className="dots" />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}

/**
 * Efek pointer global (satu listener untuk seluruh app):
 * - kartu .glass: sorotan emas mengikuti kursor (--mx/--my)
 * - elemen [data-tilt]: miring 3D sesuai posisi kursor (--rx/--ry)
 */
export function PointerEffects() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tilted: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;

    const lepas = () => {
      if (!tilted) return;
      tilted.style.setProperty("--rx", "0deg");
      tilted.style.setProperty("--ry", "0deg");
      tilted.removeAttribute("data-tilting");
      tilted = null;
    };

    const jalankan = () => {
      frame = 0;
      const e = last;
      if (!e || !(e.target instanceof Element)) return;
      const kartu = e.target.closest<HTMLElement>(".glass");
      if (kartu) {
        const r = kartu.getBoundingClientRect();
        kartu.style.setProperty("--mx", `${e.clientX - r.left}px`);
        kartu.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      if (reduce) return;
      const t = e.target.closest<HTMLElement>("[data-tilt]");
      if (t !== tilted) lepas();
      if (!t) return;
      tilted = t;
      const r = t.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      t.setAttribute("data-tilting", "");
      t.style.setProperty("--rx", `${(-py * 10).toFixed(2)}deg`);
      t.style.setProperty("--ry", `${(px * 12).toFixed(2)}deg`);
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!frame) frame = requestAnimationFrame(jalankan);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", lepas);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", lepas);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

/** Angka yang menghitung naik dari 0 saat pertama tampil */
export function CountUp({ value, ms = 900 }: { value: number; ms?: number }) {
  const [n, setN] = useState(0);
  const dari = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dari.current = value;
      setN(value);
      return;
    }
    const awal = dari.current;
    const t0 = performance.now();
    let id = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(awal + (value - awal) * e);
      setN(v);
      dari.current = v;
      if (p < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [value, ms]);
  return <>{n}</>;
}
