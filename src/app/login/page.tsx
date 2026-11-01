"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorText, Field } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/supabase/env";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="app-glow grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-5 rounded-3xl p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#6d8dff] to-[#3a4fd8] shadow-[0_8px_30px_-6px_rgba(79,124,255,0.8)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M12 3v18M6 9h12" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Sion Youth</h1>
          <p className="mt-1 text-sm text-muted">Masuk untuk pengurus & penatalayan</p>
        </div>
        <Field label="Username">
          <input
            className="field"
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button variant="primary" className="w-full" disabled={busy}>
          <LogIn size={16} /> {busy ? "Masuk…" : "Masuk"}
        </Button>
        <p className="text-center text-xs text-faint">
          Jemaat baru?{" "}
          <a href="/daftar" className="text-primary hover:underline">
            Isi form pendaftaran
          </a>
        </p>
      </form>
    </div>
  );
}
