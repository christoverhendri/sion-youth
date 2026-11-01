"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { emptyDraft, JemaatFields, draftToRow, type JemaatDraft } from "@/components/jemaat-form";
import { ThemeToggle } from "@/components/theme";
import { Button, ErrorText } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function DaftarPage() {
  const [d, setD] = useState<JemaatDraft>(emptyDraft);
  const [setuju, setSetuju] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await createClient().rpc("daftar_jemaat", {
      p: {
        ...draftToRow(d),
        persetujuan_data: setuju,
        pelayanan: Object.entries(d.pelayanan).map(([bidang, level]) => ({ bidang, level })),
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setDone(true);
    window.scrollTo({ top: 0 });
  }

  if (done)
    return (
      <div className="app-glow grid min-h-screen place-items-center p-4">
        <div className="glass max-w-md rounded-3xl p-10 text-center">
          <CheckCircle2 className="mx-auto mb-4 text-success" size={48} />
          <h1 className="text-xl font-bold">Terima kasih! 🙌</h1>
          <p className="mt-2 text-sm text-muted">
            Data kamu sudah tersimpan. Selamat bergabung di keluarga Sion Youth, sampai ketemu hari Minggu!
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setD(emptyDraft);
              setSetuju(false);
              setDone(false);
            }}
          >
            Isi untuk orang lain
          </Button>
        </div>
      </div>
    );

  return (
    <div className="app-glow min-h-screen px-4 py-10">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <form onSubmit={submit} className="glass mx-auto max-w-2xl space-y-8 rounded-3xl p-6 sm:p-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sion Youth</p>
          <h1 className="mt-2 text-2xl font-bold">Form Data Jemaat</h1>
          <p className="mt-1 text-sm text-muted">
            Isi data di bawah ya. Data ini hanya dipakai pengurus Sion Youth untuk pelayanan & komunikasi.
          </p>
        </div>

        <JemaatFields value={d} onChange={setD} publicForm />

        <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#4f7cff]"
            checked={setuju}
            onChange={(e) => setSetuju(e.target.checked)}
            required
          />
          <span className="text-muted">
            Saya setuju data ini disimpan dan dipakai oleh pengurus Sion Youth untuk keperluan pelayanan. Untuk
            jemaat SD/SMP, formulir ini diisi atau disetujui oleh orang tua/wali.
          </span>
        </label>

        <ErrorText>{error}</ErrorText>
        <Button variant="primary" className="w-full" disabled={busy}>
          {busy ? "Mengirim…" : "Kirim"}
        </Button>
      </form>
    </div>
  );
}
