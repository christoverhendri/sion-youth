"use client";

import { Bell, ChevronDown, ClipboardCheck, LogOut, Menu, PartyPopper, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { useMe } from "./role";
import { ThemeSwitch } from "./theme";

type Icon = typeof Bell;
type NavLink = { href: string; label: string; roles: Role[]; aktif: (path: string) => boolean };
type NavGroup = {
  label: string;
  roles: Role[];
  aktif: (path: string) => boolean;
  children: (NavLink & { icon: Icon; desc: string })[];
};

const ALL: Role[] = ["pengurus", "penatalayan", "gdg_leader"];
const NAV: (NavLink | NavGroup)[] = [
  { href: "/", label: "Dashboard", roles: ["pengurus"], aktif: (p) => p === "/" },
  { href: "/jemaat", label: "Jemaat", roles: ["pengurus"], aktif: (p) => p.startsWith("/jemaat") },
  {
    label: "Absensi",
    roles: ALL,
    aktif: (p) => p.startsWith("/absensi"),
    children: [
      {
        href: "/absensi",
        label: "Ibadah",
        desc: "Absensi ibadah Minggu",
        icon: ClipboardCheck,
        roles: ALL,
        aktif: (p) => p === "/absensi" || p.startsWith("/absensi/laporan"),
      },
      {
        href: "/absensi/event",
        label: "Event",
        desc: "Fun Day, retreat, acara khusus",
        icon: PartyPopper,
        roles: ALL,
        aktif: (p) => p.startsWith("/absensi/event"),
      },
    ],
  },
  { href: "/gdg", label: "Grup GDG", roles: ["pengurus", "gdg_leader"], aktif: (p) => p.startsWith("/gdg") },
  { href: "/analisis", label: "Analisis", roles: ["pengurus"], aktif: (p) => p.startsWith("/analisis") },
  { href: "/kalender", label: "Kalender", roles: ["pengurus"], aktif: (p) => p.startsWith("/kalender") },
];
const ROLE_LABEL: Record<Role, string> = { pengurus: "Pengurus", penatalayan: "Penatalayan", gdg_leader: "GDG Leader" };

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className ?? "h-[30px] w-[30px]"} fill="none" stroke="#c6a15b" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M32 6 L54 18 L54 46 L32 58 L10 46 L10 18 Z" />
      <path d="M32 18 C40 26 42 32 38 40 C36 44 28 44 26 40 C24 35 28 32 32 28" />
    </svg>
  );
}

/** Menu yang terbuka saat disorot (desktop) atau diklik, dan tertutup saat klik di luar / Esc */
function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const klik = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", klik);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", klik);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const hover = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setOpen(true),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setOpen(false),
  };
  return [open, setOpen, ref, hover] as const;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const path = usePathname();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);
  const [absOpen, setAbsOpen, absRef, absHover] = useMenu();
  const [akunOpen, setAkunOpen, akunRef, akunHover] = useMenu();
  const items = NAV.filter((n) => n.roles.includes(me.role));
  const nama = me.full_name ?? me.username;

  // Pindah halaman: semua menu tertutup
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setSheet(false);
    setAbsOpen(false);
    setAkunOpen(false);
  }

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-[18px]">
        <nav aria-label="Menu utama" className="navpill relative mx-auto flex max-w-[1160px] items-center gap-3 rounded-full py-2 pl-[18px] pr-2">
          <Link href={me.role === "pengurus" ? "/" : "/absensi"} className="group mr-2 flex shrink-0 items-center gap-2.5" aria-label="Sion Youth, ke beranda">
            <span className="transition-transform duration-500 [transition-timing-function:var(--spring)] group-hover:-rotate-[30deg] group-hover:scale-110">
              <Logo />
            </span>
            <span className="text-sm font-extrabold tracking-[0.22em]">SION</span>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
            {items.map((n) => {
              if (!("children" in n)) {
                return (
                  <Link key={n.href} href={n.href} className="navlink" data-on={n.aktif(path) || undefined} aria-current={n.aktif(path) ? "page" : undefined}>
                    {n.label}
                  </Link>
                );
              }
              const anak = n.children.filter((c) => c.roles.includes(me.role));
              return (
                <div key={n.label} ref={absRef} className="relative" {...absHover}>
                  <button
                    type="button"
                    className="navlink"
                    data-on={n.aktif(path) || undefined}
                    aria-expanded={absOpen}
                    aria-haspopup="menu"
                    onClick={() => setAbsOpen(!absOpen)}
                  >
                    {n.label}
                    <ChevronDown size={14} strokeWidth={2.4} className="chev" />
                  </button>
                  {/* jembatan tak terlihat supaya kursor bisa turun ke menu tanpa menutupnya */}
                  <div className="absolute inset-x-0 top-full h-3" aria-hidden />
                  <div className="navmenu left-1/2 -ml-[120px] origin-top" data-open={absOpen || undefined} role="menu">
                    {anak.map((c) => {
                      const SubIcon = c.icon;
                      return (
                        <Link key={c.href} href={c.href} role="menuitem" aria-current={c.aktif(path) ? "page" : undefined}>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-gold/35 bg-gold/10 text-gold-hi">
                            <SubIcon size={16} />
                          </span>
                          <span>
                            {c.label}
                            <span className="block text-xs font-medium text-muted">{c.desc}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Notifikasi"
              className="pressable relative hidden h-10 w-10 place-items-center rounded-full border border-line text-muted hover:border-gold/50 hover:text-ink sm:grid"
            >
              <Bell size={17} />
              <span className="ping-dot absolute right-[10px] top-[9px] h-[7px] w-[7px] rounded-full bg-gold" />
            </button>
            <ThemeSwitch />
            <button
              type="button"
              onClick={() => setSheet(!sheet)}
              aria-label={sheet ? "Tutup menu" : "Buka menu"}
              aria-expanded={sheet}
              className="pressable grid h-10 w-10 place-items-center rounded-full border border-line text-ink hover:border-gold/50 lg:hidden"
            >
              {sheet ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div ref={akunRef} className="relative" {...akunHover}>
              <button
                type="button"
                onClick={() => setAkunOpen(!akunOpen)}
                aria-label="Akun dan pengaturan"
                aria-expanded={akunOpen}
                aria-haspopup="menu"
                className="pressable grid h-11 w-11 place-items-center rounded-full border border-gold/50 p-[3px]"
              >
                <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-gold-hi to-gold text-xs font-bold uppercase text-navy">
                  {nama.slice(0, 2)}
                </span>
              </button>
              <div className="absolute inset-x-0 top-full h-3" aria-hidden />
              <div className="navmenu right-0 origin-top-right" data-open={akunOpen || undefined} role="menu">
                <div className="px-3 pb-2 pt-2.5">
                  <div className="truncate text-sm font-bold">{nama}</div>
                  <div className="text-xs text-muted">{ROLE_LABEL[me.role]}</div>
                </div>
                <div className="mx-1 my-1.5 border-t border-line" />
                {me.role === "pengurus" && (
                  <Link href="/pengaturan" role="menuitem" aria-current={path.startsWith("/pengaturan") ? "page" : undefined}>
                    <Settings size={16} className="text-muted" /> Pengaturan
                  </Link>
                )}
                <button type="button" role="menuitem" onClick={logout}>
                  <LogOut size={16} className="text-muted" /> Keluar
                </button>
              </div>
            </div>
          </div>

          {sheet && (
            <div className="navsheet absolute inset-x-0 top-[calc(100%+10px)] rounded-[26px] border border-line bg-[var(--nav-pop)] p-2.5 shadow-pop backdrop-blur-2xl lg:hidden">
              {items.flatMap((n) => ("children" in n ? n.children.filter((c) => c.roles.includes(me.role)) : [n])).map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={n.aktif(path) ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center rounded-2xl px-4 font-semibold transition-colors hover:bg-surface-2",
                    n.aktif(path) && "bg-surface-2 text-primary",
                  )}
                >
                  {"desc" in n ? `Absensi ${n.label}` : n.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </header>

      <main className="px-4 pb-16 pt-10 sm:px-6 lg:pt-14">
        {/* key = path: setiap pindah halaman, konten masuk lagi dengan animasi bertahap */}
        <div key={path} className="page-enter mx-auto max-w-[1160px]">
          {children}
        </div>
      </main>
    </div>
  );
}
