"use client";

import { GraduationCap, KeyRound, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/role";
import { Badge, Button, Card, CardTitle, ErrorText, Field, Modal, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Opsi } from "@/lib/types";
import { fmtDate } from "@/lib/utils";
import { buatAkun, gantiPassword, hapusAkun, listAkun, type Akun } from "./actions";

const TIPE: { v: Opsi["tipe"]; label: string }[] = [
  { v: "hobi", label: "Pilihan hobi" },
  { v: "bidang", label: "Bidang pelayanan" },
  { v: "sumber", label: "Sumber kenal Sion" },
];

export default function PengaturanPage() {
  return (
    <>
      <PageHeader title="Pengaturan" sub="Akun login, pilihan form, dan kenaikan kelas" />
      <div className="grid gap-5 lg:grid-cols-2">
        <AkunCard />
        <div className="space-y-5">
          <NaikKelasCard />
          <OpsiCard />
        </div>
      </div>
    </>
  );
}

function AkunCard() {
  const me = useMe();
  const [akun, setAkun] = useState<Akun[]>([]);
  const [error, setError] = useState("");
  const [baru, setBaru] = useState(false);
  const [pw, setPw] = useState<Akun | null>(null);

  const load = useCallback(() => {
    listAkun()
      .then(setAkun)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function hapus(a: Akun) {
    if (!confirm(`Hapus akun "${a.username}"?`)) return;
    const r = await hapusAkun(a.id);
    if (r.error) setError(r.error);
    load();
  }

  return (
    <Card>
      <CardTitle
        sub="Pengurus: akses penuh. Penatalayan (usher): hanya halaman absensi."
        action={
          <Button size="sm" variant="primary" onClick={() => setBaru(true)}>
            <Plus size={14} /> Akun baru
          </Button>
        }
      >
        Akun login
      </CardTitle>
      <ErrorText>{error}</ErrorText>
      <ul className="space-y-2">
        {akun.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {a.username}
                <Badge color={a.role === "pengurus" ? "purple" : "blue"}>{a.role}</Badge>
              </div>
              <div className="text-xs text-muted">
                {a.full_name ?? "-"} · login terakhir {a.last_sign_in_at ? fmtDate(a.last_sign_in_at) : "belum pernah"}
              </div>
            </div>
            <Button size="sm" onClick={() => setPw(a)} title="Ganti password">
              <KeyRound size={13} />
            </Button>
            {a.id !== me.id && (
              <Button size="sm" variant="danger" onClick={() => hapus(a)} title="Hapus akun">
                <Trash2 size={13} />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-faint">
        Tips: ganti password akun usher tiap pergantian periode pelayanan. Buat akun pengurus per orang supaya
        perubahan data bisa ditelusuri.
      </p>
      <AkunBaruModal open={baru} onClose={() => setBaru(false)} onSaved={load} />
      <PasswordModal akun={pw} onClose={() => setPw(null)} />
    </Card>
  );
}

function AkunBaruModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ username: "", full_name: "", role: "pengurus" as Akun["role"], password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ username: "", full_name: "", role: "pengurus", password: "" });
      setError("");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await buatAkun(f);
    setBusy(false);
    if (r.error) return setError(r.error);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Akun baru">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Username">
            <input
              className="field"
              autoCapitalize="none"
              value={f.username}
              onChange={(e) => setF({ ...f, username: e.target.value })}
              required
            />
          </Field>
          <Field label="Nama">
            <input className="field" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          </Field>
        </div>
        <Field label="Role">
          <select className="field" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Akun["role"] })}>
            <option value="pengurus">Pengurus (akses penuh)</option>
            <option value="penatalayan">Penatalayan / usher (hanya absensi)</option>
          </select>
        </Field>
        <Field label="Password" hint="Minimal 8 karakter">
          <input
            className="field"
            type="text"
            autoComplete="new-password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            required
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" disabled={busy}>
            Buat akun
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordModal({ akun, onClose }: { akun: Akun | null; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setPw("");
    setError("");
  }, [akun]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!akun) return;
    const r = await gantiPassword(akun.id, pw);
    if (r.error) return setError(r.error);
    onClose();
  }

  return (
    <Modal open={!!akun} onClose={onClose} title={`Ganti password ${akun?.username ?? ""}`}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Password baru" hint="Minimal 8 karakter">
          <input className="field" type="text" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function NaikKelasCard() {
  const [msg, setMsg] = useState("");
  async function run() {
    if (
      !confirm(
        "Naikkan kelas semua pelajar 1 tingkat? Kelas 6 → SMP, kelas 9 → SMA, kelas 12 → Kuliah (ditandai perlu review). Grup GDG ikut menyesuaikan. Jalankan SEKALI per tahun ajaran.",
      )
    )
      return;
    const { data, error } = await createClient().rpc("naik_kelas");
    setMsg(error ? error.message : `${data} jemaat naik kelas.`);
  }
  return (
    <Card>
      <CardTitle sub="Jalankan sekali setahun saat tahun ajaran baru (sekitar Juli)">Kenaikan kelas</CardTitle>
      <Button onClick={run}>
        <GraduationCap size={16} /> Naikkan kelas semua pelajar
      </Button>
      {msg && <p className="mt-3 text-sm text-muted">{msg}</p>}
    </Card>
  );
}

function OpsiCard() {
  const [opsi, setOpsi] = useState<Opsi[]>([]);
  const [baru, setBaru] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    createClient()
      .from("opsi")
      .select("*")
      .order("urutan")
      .then(({ data }) => setOpsi((data as Opsi[]) ?? []));
  }, []);
  useEffect(load, [load]);

  async function tambah(tipe: Opsi["tipe"]) {
    const label = baru[tipe]?.trim();
    if (!label) return;
    const urutan = Math.max(0, ...opsi.filter((o) => o.tipe === tipe).map((o) => o.urutan)) + 1;
    await createClient().from("opsi").insert({ tipe, label, urutan });
    setBaru({ ...baru, [tipe]: "" });
    load();
  }

  async function hapus(o: Opsi) {
    if (!confirm(`Hapus pilihan "${o.label}"? Data jemaat yang sudah memilihnya tidak berubah.`)) return;
    await createClient().from("opsi").delete().eq("id", o.id);
    load();
  }

  return (
    <Card>
      <CardTitle sub="Pilihan yang muncul di form pendaftaran. Pilihan baku = data rapi untuk analisis.">
        Pilihan form
      </CardTitle>
      <div className="space-y-5">
        {TIPE.map((t) => (
          <div key={t.v}>
            <div className="mb-2 text-xs font-medium text-muted">{t.label}</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {opsi
                .filter((o) => o.tipe === t.v)
                .map((o) => (
                  <span
                    key={o.id}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1.5 text-xs"
                  >
                    {o.label}
                    <button onClick={() => hapus(o)} className="rounded-full p-0.5 text-faint hover:bg-white/10 hover:text-danger">
                      <X size={12} />
                    </button>
                  </span>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                className="field py-1.5 text-xs"
                placeholder="Tambah pilihan…"
                value={baru[t.v] ?? ""}
                onChange={(e) => setBaru({ ...baru, [t.v]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && tambah(t.v)}
              />
              <Button size="sm" onClick={() => tambah(t.v)}>
                <Plus size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
