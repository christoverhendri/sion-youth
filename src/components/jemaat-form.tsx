"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_AKADEMIK, type Jemaat, type Opsi, type Pelayanan, type StatusAkademik } from "@/lib/types";
import { cn, hpTampil } from "@/lib/utils";
import { Chips, Field } from "./ui";

export type JemaatDraft = {
  nama: string;
  jenis_kelamin: "" | "L" | "P";
  tanggal_lahir: string;
  no_hp: string;
  no_hp_ortu: string;
  alamat: string;
  kecamatan: string;
  status_akademik: StatusAkademik;
  kelas: string; // kelas di dalam jenjang (SD 1-6, SMP 1-3, SMA 1-3)
  institusi: string;
  lokasi_studi: "" | "Dalam Negeri" | "Luar Negeri";
  kota_studi: string;
  hobi: string[];
  sumber_info: string;
  diajak_oleh_nama: string;
  catatan: string;
  pelayanan: Record<string, "bisa" | "mau_belajar">;
};

export const emptyDraft: JemaatDraft = {
  nama: "",
  jenis_kelamin: "",
  tanggal_lahir: "",
  no_hp: "",
  no_hp_ortu: "",
  alamat: "",
  kecamatan: "",
  status_akademik: "SMA",
  kelas: "",
  institusi: "",
  lokasi_studi: "",
  kota_studi: "",
  hobi: [],
  sumber_info: "",
  diajak_oleh_nama: "",
  catatan: "",
  pelayanan: {},
};

const OFFSET: Partial<Record<StatusAkademik, number>> = { SD: 0, SMP: 6, SMA: 9 };
const MAX_KELAS: Partial<Record<StatusAkademik, number>> = { SD: 6, SMP: 3, SMA: 3 };

/** Kelas di database disimpan 1-12; di form ditampilkan per jenjang */
export function kelasKeDb(status: StatusAkademik, kelas: string) {
  if (!kelas || OFFSET[status] === undefined) return null;
  return Number(kelas) + OFFSET[status]!;
}

export function draftFromJemaat(j: Jemaat, pel: Pelayanan[]): JemaatDraft {
  const off = OFFSET[j.status_akademik];
  return {
    nama: j.nama,
    jenis_kelamin: j.jenis_kelamin ?? "",
    tanggal_lahir: j.tanggal_lahir ?? "",
    no_hp: j.no_hp ? hpTampil(j.no_hp) : "",
    no_hp_ortu: j.no_hp_ortu ? hpTampil(j.no_hp_ortu) : "",
    alamat: j.alamat ?? "",
    kecamatan: j.kecamatan ?? "",
    status_akademik: j.status_akademik,
    kelas: j.kelas && off !== undefined ? String(j.kelas - off) : "",
    institusi: j.institusi ?? "",
    lokasi_studi: j.lokasi_studi ?? "",
    kota_studi: j.kota_studi ?? "",
    hobi: j.hobi ?? [],
    sumber_info: j.sumber_info ?? "",
    diajak_oleh_nama: j.diajak_oleh_nama ?? "",
    catatan: j.catatan ?? "",
    pelayanan: Object.fromEntries(pel.map((p) => [p.bidang, p.level])),
  };
}

/** Kolom tabel jemaat dari draft (tanpa pelayanan) */
export function draftToRow(d: JemaatDraft) {
  const nul = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    nama: d.nama.trim(),
    jenis_kelamin: d.jenis_kelamin || null,
    tanggal_lahir: d.tanggal_lahir || null,
    no_hp: nul(d.no_hp),
    no_hp_ortu: nul(d.no_hp_ortu),
    alamat: nul(d.alamat),
    kecamatan: nul(d.kecamatan),
    status_akademik: d.status_akademik,
    kelas: kelasKeDb(d.status_akademik, d.kelas),
    institusi: nul(d.institusi),
    lokasi_studi: d.status_akademik === "Kuliah" ? d.lokasi_studi || null : null,
    kota_studi: nul(d.kota_studi),
    hobi: d.hobi,
    sumber_info: nul(d.sumber_info),
    diajak_oleh_nama: nul(d.diajak_oleh_nama),
    catatan: nul(d.catatan),
  };
}

export function useOpsi() {
  const [opsi, setOpsi] = useState<Opsi[]>([]);
  useEffect(() => {
    createClient()
      .from("opsi")
      .select("*")
      .order("urutan")
      .then(({ data }) => setOpsi((data as Opsi[]) ?? []));
  }, []);
  const by = (t: Opsi["tipe"]) => opsi.filter((o) => o.tipe === t).map((o) => o.label);
  return { hobi: by("hobi"), sumber: by("sumber"), bidang: by("bidang") };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{title}</legend>
      {children}
    </fieldset>
  );
}

export function JemaatFields({
  value: d,
  onChange,
  publicForm,
}: {
  value: JemaatDraft;
  onChange: (d: JemaatDraft) => void;
  publicForm?: boolean;
}) {
  const opsi = useOpsi();
  const set = <K extends keyof JemaatDraft>(k: K, v: JemaatDraft[K]) => onChange({ ...d, [k]: v });
  const pelajar = ["SD", "SMP", "SMA"].includes(d.status_akademik);
  const isSD = d.status_akademik === "SD" || d.status_akademik === "SMP";
  const lainnyaSumber = d.sumber_info && !opsi.sumber.includes(d.sumber_info);

  return (
    <div className="space-y-8">
      <Section title="Data diri">
        <Field label="Nama lengkap *">
          <input className="field" value={d.nama} onChange={(e) => set("nama", e.target.value)} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis kelamin">
            <select
              className="field"
              value={d.jenis_kelamin}
              onChange={(e) => set("jenis_kelamin", e.target.value as JemaatDraft["jenis_kelamin"])}
            >
              <option value="">-</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </Field>
          <Field label={publicForm ? "Tanggal lahir *" : "Tanggal lahir"}>
            <input
              className="field"
              type="date"
              value={d.tanggal_lahir}
              onChange={(e) => set("tanggal_lahir", e.target.value)}
              required={publicForm}
            />
          </Field>
          <Field label={publicForm ? "No. WhatsApp *" : "No. WhatsApp"} hint="Contoh: 0812xxxx">
            <input
              className="field"
              inputMode="tel"
              value={d.no_hp}
              onChange={(e) => set("no_hp", e.target.value)}
              required={publicForm && !isSD}
            />
          </Field>
          <Field label="No. WhatsApp orang tua / wali" hint={isSD ? "Wajib untuk SD/SMP" : "Opsional"}>
            <input
              className="field"
              inputMode="tel"
              value={d.no_hp_ortu}
              onChange={(e) => set("no_hp_ortu", e.target.value)}
              required={publicForm && isSD}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Alamat" className="sm:col-span-2">
            <input className="field" value={d.alamat} onChange={(e) => set("alamat", e.target.value)} />
          </Field>
          <Field label="Kecamatan">
            <input className="field" value={d.kecamatan} onChange={(e) => set("kecamatan", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Pendidikan / pekerjaan">
        <Field label="Status sekarang *">
          <div className="grid grid-cols-5 gap-2">
            {STATUS_AKADEMIK.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => onChange({ ...d, status_akademik: s, kelas: "" })}
                className={cn(
                  "rounded-xl border py-2 text-sm transition",
                  d.status_akademik === s
                    ? "border-primary bg-primary/20 font-medium text-ink"
                    : "border-line bg-surface text-muted hover:text-ink",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          {pelajar && (
            <Field label="Kelas">
              <select className="field" value={d.kelas} onChange={(e) => set("kelas", e.target.value)}>
                <option value="">-</option>
                {Array.from({ length: MAX_KELAS[d.status_akademik]! }, (_, i) => (
                  <option key={i} value={i + 1}>
                    Kelas {i + 1 + OFFSET[d.status_akademik]!}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field
            label={pelajar ? "Nama sekolah" : d.status_akademik === "Kuliah" ? "Nama kampus" : "Tempat kerja"}
            className={pelajar ? "sm:col-span-2" : "sm:col-span-3"}
          >
            <input className="field" value={d.institusi} onChange={(e) => set("institusi", e.target.value)} />
          </Field>
        </div>
        {d.status_akademik === "Kuliah" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Lokasi kuliah">
              <select
                className="field"
                value={d.lokasi_studi}
                onChange={(e) => set("lokasi_studi", e.target.value as JemaatDraft["lokasi_studi"])}
              >
                <option value="">-</option>
                <option>Dalam Negeri</option>
                <option>Luar Negeri</option>
              </select>
            </Field>
            <Field label="Kota / negara">
              <input className="field" value={d.kota_studi} onChange={(e) => set("kota_studi", e.target.value)} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Minat">
        <Field label="Hobi (boleh pilih lebih dari satu)">
          <Chips options={opsi.hobi} value={d.hobi} onChange={(v) => set("hobi", v)} />
        </Field>
        <Field label="Minat pelayanan">
          <PelayananMatrix bidang={opsi.bidang} value={d.pelayanan} onChange={(v) => set("pelayanan", v)} />
        </Field>
      </Section>

      <Section title="Kenal Sion">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kenal Sion dari mana?">
            <select
              className="field"
              value={lainnyaSumber ? "__lain" : d.sumber_info}
              onChange={(e) => set("sumber_info", e.target.value === "__lain" ? " " : e.target.value)}
            >
              <option value="">-</option>
              {opsi.sumber.map((s) => (
                <option key={s}>{s}</option>
              ))}
              <option value="__lain">Lainnya…</option>
            </select>
          </Field>
          <Field label="Diajak oleh siapa?" hint="Nama teman / keluarga yang mengajak">
            <input
              className="field"
              value={d.diajak_oleh_nama}
              onChange={(e) => set("diajak_oleh_nama", e.target.value)}
            />
          </Field>
        </div>
        {lainnyaSumber && (
          <Field label="Sebutkan">
            <input
              className="field"
              value={d.sumber_info.trim()}
              onChange={(e) => set("sumber_info", e.target.value || " ")}
            />
          </Field>
        )}
        {!publicForm && (
          <Field label="Catatan pengurus">
            <textarea className="field" rows={2} value={d.catatan} onChange={(e) => set("catatan", e.target.value)} />
          </Field>
        )}
      </Section>
    </div>
  );
}

const LEVELS = [
  { v: "bisa", label: "Sudah bisa" },
  { v: "mau_belajar", label: "Mau belajar" },
  { v: "", label: "Tidak" },
] as const;

export function PelayananMatrix({
  bidang,
  value,
  onChange,
}: {
  bidang: string[];
  value: Record<string, "bisa" | "mau_belajar">;
  onChange: (v: Record<string, "bisa" | "mau_belajar">) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {bidang.map((b, i) => (
        <div
          key={b}
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 px-3 py-2",
            i % 2 ? "bg-tint/[0.015]" : "bg-tint/[0.035]",
          )}
        >
          <span className="text-sm">{b}</span>
          <div className="flex gap-1">
            {LEVELS.map((l) => {
              const cur = value[b] ?? "";
              const on = cur === l.v;
              return (
                <button
                  type="button"
                  key={l.v}
                  onClick={() => {
                    const next = { ...value };
                    if (l.v) next[b] = l.v;
                    else delete next[b];
                    onChange(next);
                  }}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs transition",
                    on
                      ? l.v === "bisa"
                        ? "bg-success/20 text-success"
                        : l.v === "mau_belajar"
                          ? "bg-warning/20 text-warning"
                          : "bg-tint/10 text-ink"
                      : "text-faint hover:text-ink",
                  )}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
