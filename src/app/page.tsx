"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shell";
import { ErrorText } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/supabase/env";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setBusy(false);
    if (error) return setError("Username atau password salah.");
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="login">
      {/* Layar pembuka: logo tergambar lalu bar emas terisi */}
      <div className="intro" aria-hidden style={{ animationDelay: "1.1s" }}>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#c6a15b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 6 L54 18 L54 46 L32 58 L10 46 L10 18 Z" />
          <path d="M32 18 C40 26 42 32 38 40 C36 44 28 44 26 40 C24 35 28 32 32 28 C30 34 34 36 35 33" />
        </svg>
        <div className="bar">
          <i />
        </div>
      </div>

      {/* Sisi visual: bola emas / navy / baja melayang, pita emas berkilau, judul muncul kata per kata */}
      <section className="login-art">
        <div aria-hidden>
          <div className="login-disc" />
          <div className="login-disc n" />
          <div className="login-disc s" />
          <svg className="login-ribbon" viewBox="0 0 800 900" preserveAspectRatio="none">
            <path className="rb" d="M-20 700 C 160 640, 260 380, 420 420 S 640 700, 820 260" />
            <path className="gl" d="M-20 700 C 160 640, 260 380, 420 420 S 640 700, 820 260" />
          </svg>
        </div>
        <div className="relative">
          <div className="eyebrow word-in [animation-delay:1.3s]">Sion Youth</div>
          <h1 className="login-big">
            <span className="word-in [animation-delay:1.4s]">Datang,</span>
            <br />
            <span className="word-in [animation-delay:1.52s]">bertumbuh</span>
            <br />
            <span className="accent-serif word-in [animation-delay:1.64s]">bersama.</span>
          </h1>
        </div>
      </section>

      {/* Form */}
      <section className="login-side">
        <form onSubmit={submit} className="glass login-form">
          <div className="flex items-center gap-2.5">
            <Logo className="h-[34px] w-[34px]" />
            <b className="tracking-[0.22em]">SION</b>
          </div>
          <h2 className="mt-7 text-[30px] font-semibold tracking-[-0.02em]">
            Selamat <span className="accent-serif">datang</span>
          </h2>
          <p className="mt-1 text-sm text-muted">Masuk untuk pengurus, penatalayan, dan GDG leader</p>

          <div className="mt-7 flex flex-col gap-4">
            <label className="login-field">
              Username
              <input
                className="login-input"
                autoCapitalize="none"
                autoComplete="username"
                placeholder="mis. andre"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="login-field">
              Password
              <span className="relative block">
                <input
                  className="login-input pr-14"
                  type={lihat ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setLihat(!lihat)}
                  aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute right-1.5 top-[3px] grid h-11 w-11 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
          </div>

          <div className="mt-4">
            <ErrorText>{error}</ErrorText>
          </div>

          <button type="submit" disabled={busy} className="btn-gold pressable group mt-3 inline-flex h-14 w-full items-center justify-center gap-3 rounded-full text-[15px] font-bold disabled:opacity-60">
            {busy ? "Masuk…" : "Masuk"}
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-black/10 transition-transform duration-300 [transition-timing-function:var(--spring)] group-hover:translate-x-1 group-hover:-rotate-45">
              <ArrowRight size={16} strokeWidth={2.4} />
            </span>
          </button>
          <p className="mt-5 text-center text-[13px] text-muted">Lupa password? Hubungi pengurus.</p>
          <p className="mt-1 text-center text-[13px] text-muted">
            Jemaat baru?{" "}
            <a href="/daftar" className="font-semibold text-primary underline-offset-4 hover:underline">
              Isi form pendaftaran
            </a>
          </p>
        </form>
      </section>
    </div>
  );
}
