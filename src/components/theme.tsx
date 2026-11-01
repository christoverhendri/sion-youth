"use client";

import { useId, useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "@/lib/theme-script";

export type Theme = "dark" | "light";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark",
  );
}

function terapkan(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // mode privat / storage diblokir: tema tetap berlaku untuk sesi ini
  }
}

/**
 * Ganti tema dengan efek lingkaran yang menyebar dari titik klik (View Transitions API).
 * Browser yang belum mendukung, atau pengguna yang memilih "kurangi animasi", langsung berganti.
 */
export function setTheme(t: Theme, dari?: { x: number; y: number }) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce || !dari) return terapkan(t);

  const r = Math.hypot(Math.max(dari.x, innerWidth - dari.x), Math.max(dari.y, innerHeight - dari.y));
  const vt = document.startViewTransition(() => terapkan(t));
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${dari.x}px ${dari.y}px)`, `circle(${r}px at ${dari.x}px ${dari.y}px)`] },
      { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}

/** Ikon matahari ↔ bulan: sinar berputar & mengecil, bulatan membesar lalu "digigit" jadi bulan sabit */
function SunMoon({ dark }: { dark: boolean }) {
  const id = useId();
  // Di mode gelap tampil matahari (klik = jadi terang); di mode terang tampil bulan.
  const sun = dark;
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden className="overflow-visible">
      <mask id={id}>
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <circle
          className="theme-anim"
          style={{ transform: sun ? "translate(10px, -10px)" : "translate(0, 0)" }}
          cx="17"
          cy="7"
          r="7"
          fill="black"
        />
      </mask>
      <circle
        className="theme-anim"
        style={{ transform: sun ? "scale(0.55)" : "scale(1)", transformOrigin: "12px 12px" }}
        cx="12"
        cy="12"
        r="9"
        fill="currentColor"
        mask={`url(#${id})`}
      />
      <g
        className="theme-anim"
        style={{
          transformOrigin: "12px 12px",
          transform: sun ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0)",
          opacity: sun ? 1 : 0,
        }}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line key={a} x1="12" y1="1.5" x2="12" y2="3.5" transform={`rotate(${a} 12 12)`} />
        ))}
      </g>
    </svg>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        setTheme(dark ? "light" : "dark", { x: b.left + b.width / 2, y: b.top + b.height / 2 });
      }}
      title={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      aria-label="Ganti tema"
      className={
        className ?? "rounded-lg border border-line p-2 text-muted transition hover:bg-tint/10 hover:text-ink"
      }
    >
      <span className={dark ? "text-[#fbbf24]" : "text-[#6366f1]"}>
        <SunMoon dark={dark} />
      </span>
    </button>
  );
}
