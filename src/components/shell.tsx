"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { useMe } from "./role";
import { ThemeToggle } from "./theme";

const ALL: Role[] = ["pengurus", "penatalayan", "gdg_leader"];
const NAV: { href: string; label: string; icon: typeof Users; roles: Role[] }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["pengurus"] },
  { href: "/jemaat", label: "Data Jemaat", icon: Users, roles: ["pengurus"] },
  { href: "/absensi", label: "Absensi Ibadah", icon: ClipboardCheck, roles: ALL },
  { href: "/gdg", label: "Grup GDG", icon: UsersRound, roles: ["pengurus", "gdg_leader"] },
  { href: "/analisis", label: "Analisis", icon: BarChart3, roles: ["pengurus"] },
  { href: "/kalender", label: "Kalender", icon: CalendarDays, roles: ["pengurus"] },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, roles: ["pengurus"] },
];
const ROLE_LABEL: Record<Role, string> = { pengurus: "Pengurus", penatalayan: "Penatalayan", gdg_leader: "GDG Leader" };

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6d8dff] to-[#3a4fd8] shadow-[0_6px_20px_-6px_rgba(79,124,255,0.8)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M12 3v18M6 9h12" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-wide">SION</div>
        <div className="text-[11px] tracking-[0.2em] text-muted">YOUTH</div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(me.role));

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active
                ? "border border-line-strong bg-tint/[0.07] font-medium text-ink"
                : "border border-transparent text-muted hover:bg-tint/[0.04] hover:text-ink",
            )}
          >
            <Icon size={18} className={active ? "text-primary" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const userBox = (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-[#8b5cf6] text-sm font-bold uppercase">
        {(me.full_name ?? me.username).slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{me.full_name ?? me.username}</div>
        <div className="text-[11px] text-muted">{ROLE_LABEL[me.role]}</div>
      </div>
      <ThemeToggle className="rounded-lg p-1.5 text-muted hover:bg-tint/10 hover:text-ink" />
      <button onClick={logout} title="Keluar" className="rounded-lg p-1.5 text-muted hover:bg-tint/10 hover:text-ink">
        <LogOut size={16} />
      </button>
    </div>
  );

  return (
    <div className="app-glow min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-sidebar p-4 backdrop-blur-xl lg:flex">
        <div className="mb-8 mt-2">
          <Logo />
        </div>
        {nav}
        {userBox}
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-sidebar px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo />
        <div className="flex gap-2">
          <ThemeToggle />
          <button onClick={() => setOpen(true)} className="rounded-lg border border-line p-2">
            <Menu size={18} />
          </button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface-solid p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="p-1 text-muted">
                <X size={18} />
              </button>
            </div>
            {nav}
            {userBox}
          </aside>
        </div>
      )}

      <main className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
