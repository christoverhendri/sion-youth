"use client";

import { GraduationCap, KeyRound, ListChecks, Palette, Plus, Trash2, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/role";
import { Av, Panel, PanelHead, Seg } from "@/components/sion";
import { setTheme, useTheme } from "@/components/theme";
import { Button, ErrorText, Field, Modal, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { GdgGroup, Opsi } from "@/lib/types";
import { cn, fmtDate } from "@/lib/utils";
import { buatAkun, gantiPassword, hapusAkun, listAkun, type Akun } from "./actions";

const TIPE: { v: Opsi["tipe"]; label: string }[] = [
  { v: "hobi", label: "Hobi" },
  { v: "bidang", label: "Bidang pelayanan" },
  { v: "sumber", label: "Sumber kenal Sion" },
];

const ROLE: { v: Akun["role"]; label: string; desc: string }[] = [
  { v: "pengurus", label: "Pengurus", desc: "Akses penuh" },
  { v: "gdg_leader", label: "GDG leader", desc: "Absensi + grupnya" },
  { v: "penatalayan", label: "Penatalayan", desc: "Hanya absensi" },
];

const BAGIAN = [
  { v: "akun", label: "Akun & peran", icon: UsersRound },
  { v: "opsi", label: "Pilihan data", icon: ListChecks },
  { v: "kelas", label: "Kenaikan kelas", icon: GraduationCap },
  { v: "tampilan", label: "Tampilan", icon: Palette },
] as const;
type Bagian = (typeof BAGIAN)[number]["v"];

export default function PengaturanPage() {
  const [bagian, setBagian] = useState<Bagian>("akun");
  return (
    <>
      <PageHeader eyebrow="Pengaturan" title="Atur dengan tenang." sub="Akun login, pilihan form, kenaikan kelas, dan tampilan" />
      <div className="flex flex-wrap items-start gap-6">
        <nav aria-label="Bagian pengaturan" className="glass flex min-w-0 flex-[1_1_240px] flex-col gap-1 rounded-[26px] p-2 lg:max-w-[280px]">
          {BAGIAN.map((b) => {
            const Icon = b.icon;
            const on = bagian === b.v;
            return (
              <button
                key={b.v}
                type="button"
                onClick={() => setBagian(b.v)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "pressable flex min-h-[52px] items-center gap-3 rounded-[18px] px-3.5 text-left text-[15px] font-semibold transition-colors",
                  on ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "grid h-[34px] w-[34px] place-items-center rounded-[11px] border transition-colors duration-300",
                    on ? "border-gold bg-gradient-to-b from-[#ebd29c] to-gold text-[#1a1408]" : "border-line",
                  )}
                >
                  <Icon size={16} />
                </span>
                {b.label}
              </button>
            );
          })}
        </nav>
        <div key={bagian} className="s-pane min-w-0 flex-[999_1_560px]">
          {bagian === "akun" && <AkunCard />}
          {bagian === "opsi" && <OpsiCard />}
          {bagian === "kelas" && <NaikKelasCard />}
          {bagian === "tampilan" && <TampilanCard />}
        </div>
      </div>
    </>
  );
}

function TampilanCard() {
  const dark = useTheme() === "dark";
  return (
    <Panel>
      <PanelHead title="Tampilan" sub="Berlaku di perangkat ini" />
      <div className="flex items-center justify-between gap-5 py-[18px]">
        <div>
          <div className="font-bold">Mode gelap</div>
          <div className="s-sub">Atau pakai sakelar matahari / bulan di menu atas</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label="Mode gelap"
          className="s-sw"
          onClick={(e) => setTheme(dark ? "light" : "dark", { x: e.clientX, y: e.clientY })}
        >
          <i />
        </button>
      </div>
      <p className="border-t border-line pt-[18px] text-sm text-muted">
        Animasi otomatis dikurangi kalau pengaturan &quot;Kurangi gerakan&quot; aktif di perangkatmu.
      </p>
    </Panel>
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
    <Panel>
      <PanelHead
        title="Akun &"
        accent="peran"
        sub="Siapa bisa mengakses apa"
        action={
          <Button variant="primary" onClick={() => setBaru(true)}>
            <Plus size={15} /> Akun baru
          </Button>
        }
      />
      <ErrorText>{error}</ErrorText>
      <div className="px-[14px]">
        {akun.map((a, i) => (
          <div key={a.id} className="s-row flex-wrap">
            <Av nama={a.full_name ?? a.username} i={i} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{a.full_name ?? a.username}</div>
              <div className="s-sub">
                @{a.username} · login {a.last_sign_in_at ? fmtDate(a.last_sign_in_at) : "belum pernah"}
              </div>
            </div>
            <span className={a.role === "pengurus" ? "s-chip gold" : "s-chip"}>{ROLE.find((r) => r.v === a.role)?.label ?? a.role}</span>
            <Button size="sm" onClick={() => setPw(a)} title="Ganti password" aria-label={`Ganti password ${a.username}`}>
              <KeyRound size={13} />
            </Button>
            {a.id !== me.id && (
              <Button size="sm" variant="danger" onClick={() => hapus(a)} title="Hapus akun" aria-label={`Hapus akun ${a.username}`}>
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
        Tips: ganti password akun usher tiap pergantian periode pelayanan. Buat akun pengurus per orang supaya perubahan data bisa ditelusuri.
      </p>
      <AkunBaruModal open={baru} onClose={() => setBaru(false)} onSaved={load} />
      <PasswordModal akun={pw} onClose={() => setPw(null)} />
    </Panel>
  );
}


function AkunBaruModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ username: "", full_name: "", role: "pengurus" as Akun["role"], password: "", gdg_group_id: "" });
  const [groups, setGroups] = useState<GdgGroup[]>([]);
  useEffect(() => {
    createClient()
      .from("gdg_groups")
      .select("*")
      .eq("is_active", true)
      .order("nama")
      .then(({ data }) => setGroups((data as GdgGroup[]) ?? []));
  }, []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ username: "", full_name: "", role: "pengurus", password: "", gdg_group_id: "" });
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
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted">Role</span>
          <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Role">
            {ROLE.map((r) => (
              <button
                key={r.v}
                type="button"
                role="radio"
                aria-checked={f.role === r.v}
                data-on={f.role === r.v || undefined}
                onClick={() => setF({ ...f, role: r.v })}
                className="s-pick !p-4"
              >
                <div className="text-sm font-bold">{r.label}</div>
                <div className="text-xs text-muted">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>
        {f.role === "gdg_leader" && (
          <Field label="Grup GDG">
            <select
              className="field"
              value={f.gdg_group_id}
              onChange={(e) => setF({ ...f, gdg_group_id: e.target.value })}
              required
            >
              <option value="">Pilih grup…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama}
                </option>
              ))}
            </select>
          </Field>
        )}
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
    <Panel>
      <PanelHead title="Kenaikan" accent="kelas" sub="Jalankan sekali setahun saat tahun ajaran baru (sekitar Juli)" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["SD 6", "SMP 7"],
          ["SMP 9", "SMA 10"],
          ["SMA 12", "Kuliah"],
        ].map(([a, b]) => (
          <div key={a} className="rounded-[20px] bg-surface-2 p-[18px]">
            <div className="text-[13px] text-muted">Naik tingkat</div>
            <div className="mt-1.5 text-lg font-extrabold">
              {a} <span className="text-primary">→</span> {b}
            </div>
          </div>
        ))}
      </div>
      <p className="s-sub mt-[18px]">
        Semua pelajar naik 1 tingkat. Lulusan SMA ditandai perlu review, dan grup GDG ikut menyesuaikan. Tindakan ini tidak bisa
        dibatalkan otomatis.
      </p>
      <Button className="mt-[18px]" onClick={run}>
        <GraduationCap size={16} /> Naikkan kelas semua pelajar
      </Button>
      {msg && <p className="mt-3 text-sm font-semibold text-primary">{msg}</p>}
    </Panel>
  );
}

function OpsiCard() {
  const [opsi, setOpsi] = useState<Opsi[]>([]);
  const [baru, setBaru] = useState("");
  const [tipe, setTipe] = useState<Opsi["tipe"]>("hobi");

  const load = useCallback(() => {
    createClient()
      .from("opsi")
      .select("*")
      .order("urutan")
      .then(({ data }) => setOpsi((data as Opsi[]) ?? []));
  }, []);
  useEffect(load, [load]);

  async function tambah() {
    const label = baru.trim();
    if (!label) return;
    const urutan = Math.max(0, ...opsi.filter((o) => o.tipe === tipe).map((o) => o.urutan)) + 1;
    await createClient().from("opsi").insert({ tipe, label, urutan });
    setBaru("");
    load();
  }

  async function hapus(o: Opsi) {
    if (!confirm(`Hapus pilihan "${o.label}"? Data jemaat yang sudah memilihnya tidak berubah.`)) return;
    await createClient().from("opsi").delete().eq("id", o.id);
    load();
  }

  const list = opsi.filter((o) => o.tipe === tipe);

  return (
    <Panel>
      <PanelHead title="Pilihan" accent="data" sub="Pilihan yang muncul di form pendaftaran. Pilihan baku = data rapi untuk analisis." />
      <Seg
        className="mb-[18px]"
        label="Jenis pilihan"
        value={tipe}
        onChange={setTipe}
        options={TIPE.map((t) => ({ value: t.v, label: t.label, count: opsi.filter((o) => o.tipe === t.v).length }))}
      />
      <div key={tipe} className="stagger flex flex-wrap gap-2">
        {list.map((o) => (
          <span key={o.id} className="inline-flex h-[38px] items-center gap-1.5 rounded-full border border-line pl-3.5 pr-1.5 text-sm font-semibold">
            {o.label}
            <button
              type="button"
              onClick={() => hapus(o)}
              aria-label={`Hapus ${o.label}`}
              className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-danger/15 hover:text-danger"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        {list.length === 0 && <p className="text-sm text-muted">Belum ada pilihan.</p>}
      </div>
      <label className="s-search mt-[18px] !h-[52px] !pr-1.5">
        <span className="sr-only">Tambah pilihan</span>
        <input placeholder="Tambah pilihan…" value={baru} onChange={(e) => setBaru(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tambah()} />
        <Button variant="primary" size="sm" type="button" onClick={tambah} className="min-h-10 px-4">
          <Plus size={14} /> Tambah
        </Button>
      </label>
    </Panel>
  );
}
