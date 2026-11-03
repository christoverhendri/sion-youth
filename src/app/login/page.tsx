"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shell";
import { ThemeSwitch } from "@/components/theme";
import { Button, ErrorText, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/supabase/env";

// Palet desain sebagai objek: emas, navy, ivory, baja
const CAKRAM = [
  { warna: "linear-gradient(135deg,#ead096,#c6a15b 55%,#9c7a3a)", tebal: "#7d6130" },
  { warna: "linear-gradient(135deg,#3a4c6b,#26354d 60%,#1a2638)", tebal: "#131c2b" },
  { warna: "linear-gradient(135deg,#ffffff,#faf8f3 60%,#e4dfd3)", tebal: "#bdb6a6" },
  { warna: "linear-gradient(135deg,#c2cde0,#99a7bd 60%,#7a889f)", tebal: "#5f6b80" },
];

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
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Layar pembuka: logo tergambar lalu bar emas terisi */}
      <div className="intro" aria-hidden>
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#c6a15b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 6 L54 18 L54 46 L32 58 L10 46 L10 18 Z" />
          <path d="M32 18 C40 26 42 32 38 40 C36 44 28 44 26 40 C24 35 28 32 32 28 C30 34 34 36 35 33" />
        </svg>
        <div className="bar">
          <i />
        </div>
      </div>

      <div className="fixed right-4 top-4 z-10">
        <ThemeSwitch />
      </div>

      {/* Sisi visual */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_10px_2px_rgba(198,161,91,0.8)]" />
          <span className="eyebrow">Sion Youth</span>
        </div>
        <div className="discs mx-auto grid place-items-center py-10" aria-hidden>
          {CAKRAM.map((c, i) => (
            <div key={i} className="disc-wrap" style={{ marginTop: i ? -96 : 0 }}>
              <div
                className="disc"
                style={{
                  background: c.warna,
                  boxShadow: `0 10px 0 ${c.tebal}, 0 30px 40px -10px rgba(0,0,0,0.55)`,
                }}
              />
            </div>
          ))}
        </div>
        <h2 className="text-[64px] font-semibold leading-none tracking-[-0.04em]">
          <span className="word-in [animation-delay:1.45s]">Datang,</span>
          <br />
          <span className="word-in [animation-delay:1.57s]">bertumbuh</span>
          <br />
          <span className="accent-serif word-in [animation-delay:1.69s]">bersama.</span>
        </h2>
      </div>

      {/* Form */}
      <div className="grid place-items-center p-4">
        <form
          onSubmit={submit}
          className="glass anim-pop w-full max-w-[420px] space-y-5 rounded-[32px] p-7 [animation-delay:1.5s] sm:p-10"
          style={{ animationFillMode: "backwards" }}
        >
          <div className="mb-7">
            <div className="mb-7 flex items-center gap-2.5">
              <Logo className="h-[34px] w-[34px]" />
              <span className="text-sm font-extrabold tracking-[0.22em]">SION</span>
            </div>
            <h1 className="text-[30px] font-semibold">
              Selamat <span className="accent-serif">datang</span>
            </h1>
            <p className="mt-2 text-[15px] text-muted">Masuk untuk pengurus, penatalayan, dan GDG leader</p>
          </div>
          <Field label="Username">
            <input
              className="field min-h-12"
              autoCapitalize="none"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <span className="relative block">
              <input
                className="field min-h-12 pr-14"
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
                className="pressable absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink"
              >
                {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </Field>
          <ErrorText>{error}</ErrorText>
          <Button variant="primary" className="min-h-[54px] w-full text-[15px]" disabled={busy}>
            {busy ? "Masuk…" : "Masuk"} <ArrowRight size={16} />
          </Button>
          <p className="pt-1 text-center text-[13px] text-muted">
            Jemaat baru?{" "}
            <a href="/daftar" className="font-semibold text-primary underline-offset-4 hover:underline">
              Isi form pendaftaran
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
