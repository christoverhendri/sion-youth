"use client";

import { Check, ChevronLeft, ChevronRight, FileBarChart, Minus, Plus, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/role";
import { SimpanBar } from "@/components/simpan-bar";
import { TambahCepat } from "@/components/tambah-cepat";
import { Badge, Button, Card, ErrorText, Field, Loading, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { STATUS_AKADEMIK, type IbadahSession, type StatusAkademik } from "@/lib/types";
import { cn, fmtDate, isoDate, mingguIni, parseDate } from "@/lib/utils";

type Row = { id: string; nama: string; status_akademik: StatusAkademik; hadir: boolean };

const STATUS_SESI = [
  { v: "sion", label: "Ibadah Sion", desc: "Ada absensi" },
  { v: "gabung", label: "Gabung Umum", desc: "Tidak ada absensi" },
  { v: "libur", label: "Libur / Batal", desc: "Tidak ada absensi" },
] as const;

function geser(tgl: string, minggu: number) {
  const d = parseDate(tgl);
  d.setDate(d.getDate() + 7 * minggu);
  return isoDate(d);
}

export default function AbsensiPage() {
  const me = useMe();
  const pengurus = me.role === "pengurus";
  const [tanggal, setTanggal] = useState(mingguIni());
  const [sesi, setSesi] = useState<IbadahSession | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [jen, setJen] = useState("");
  const [tambah, setTambah] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Dibuka dari laporan: /absensi?tanggal=2026-10-18
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tanggal");
    if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) setTanggal(t);
  }, []);

  const load = useCallback(async () => {
    const sb = createClient();
    setRows(null);
    setError("");
    await sb.rpc("ensure_ibadah_sessions", { p_dari: tanggal, p_sampai: tanggal });
    const { data: s } = await sb.from("ibadah_sessions").select("*").eq("tanggal", tanggal).single();
    setSesi(s as IbadahSession);
    if (s) {
      const { data, error } = await sb.rpc("absensi_list", { p_session: s.id });
      if (error) setError(error.message);
      setRows((data as Row[]) ?? []);
    }
  }, [tanggal]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(r: Row) {
    if (!sesi || sesi.disimpan_at) return;
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, hadir: !x.hadir } : x)) ?? null);
    const { error } = await createClient().rpc("set_hadir", {
      p_session: sesi.id,
      p_jemaat: r.id,
      p_hadir: !r.hadir,
    });
    if (error) {
      setError(error.message);
      setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, hadir: r.hadir } : x)) ?? null);
    }
  }

  async function simpan(p: boolean) {
    if (!sesi) return;
    setBusy(true);
    const { error } = await createClient().rpc("simpan_absensi_ibadah", { p_session: sesi.id, p_simpan: p });
    setBusy(false);
    if (error) return setError(error.message);
    const { data } = await createClient().from("ibadah_sessions").select("*").eq("id", sesi.id).single();
    setSesi(data as IbadahSession);
  }

  async function setStatus(status: IbadahSession["status"]) {
    if (!sesi) return;
    await createClient().from("ibadah_sessions").update({ status }).eq("id", sesi.id);
    setSesi({ ...sesi, status });
  }

  async function setCatatan(catatan: string) {
    if (!sesi) return;
    await createClient().from("ibadah_sessions").update({ catatan: catatan || null }).eq("id", sesi.id);
  }

  async function setTamu(n: number) {
    if (!sesi) return;
    const jumlah = Math.max(0, n);
    setSesi({ ...sesi, jumlah_tamu: jumlah });
    await createClient().rpc("set_jumlah_tamu", { p_session: sesi.id, p_jumlah: jumlah });
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (!jen || r.status_akademik === jen) && (!s || r.nama.toLowerCase().includes(s)));
  }, [rows, q, jen]);
  const jumlahHadir = (rows ?? []).filter((r) => r.hadir).length;
  const isFuture = tanggal > isoDate(new Date());

  return (
    <>
      <PageHeader
        title="Absensi Ibadah"
        sub="Centang jemaat yang hadir, lalu klik Simpan absensi."
        action={
          pengurus && (
            <Link
              href="/absensi/laporan"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-tint/10"
            >
              <FileBarChart size={16} /> Laporan absensi
            </Link>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="glass flex items-center gap-1 rounded-xl p-1">
          <button className="rounded-lg p-2 hover:bg-tint/10" onClick={() => setTanggal(geser(tanggal, -1))}>
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[180px] px-2 text-center text-sm font-medium">
            Minggu, {fmtDate(tanggal, { month: "long" })}
          </div>
          <button className="rounded-lg p-2 hover:bg-tint/10" onClick={() => setTanggal(geser(tanggal, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
        {tanggal !== mingguIni() && (
          <Button size="sm" onClick={() => setTanggal(mingguIni())}>
            Minggu ini
          </Button>
        )}
        {isFuture && <Badge color="yellow">Tanggal belum lewat</Badge>}
      </div>

      {pengurus && sesi && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted">Status ibadah minggu ini (hanya pengurus)</div>
              <div className="flex flex-wrap gap-2">
                {STATUS_SESI.map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setStatus(s.v)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition",
                      sesi.status === s.v
                        ? "border-primary bg-primary/15 text-ink"
                        : "border-line bg-surface text-muted hover:text-ink",
                    )}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-[11px] opacity-70">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Catatan" className="min-w-[220px] flex-1">
              <input
                key={sesi.id}
                className="field"
                placeholder="Mis. gabung karena Paskah"
                defaultValue={sesi.catatan ?? ""}
                onBlur={(e) => setCatatan(e.target.value)}
              />
            </Field>
          </div>
        </Card>
      )}

      <ErrorText>{error}</ErrorText>

      {!sesi || !rows ? (
        <Loading />
      ) : sesi.status !== "sion" ? (
        <Card className="py-14 text-center">
          <div className="text-4xl">{sesi.status === "gabung" ? "⛪" : "🌴"}</div>
          <p className="mt-3 text-lg font-semibold">
            {sesi.status === "gabung" ? "Minggu ini gabung ibadah umum" : "Minggu ini libur"}
          </p>
          <p className="mt-1 text-sm text-muted">
            Tidak ada absensi Sion. Minggu ini tidak dihitung di peringatan &quot;lama tidak datang&quot;.
          </p>
          {sesi.catatan && <p className="mt-2 text-sm text-muted">Catatan: {sesi.catatan}</p>}
        </Card>
      ) : (
        <>
          {sesi.disimpan_at && (
            <SimpanBar
              disimpanAt={sesi.disimpan_at}
              disimpanNama={sesi.disimpan_nama}
              jumlah={jumlahHadir}
              busy={busy}
              onSimpan={() => simpan(true)}
              onBuka={() => simpan(false)}
            />
          )}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs text-muted">Jemaat hadir</div>
              <div className="mt-1 text-3xl font-bold">
                {jumlahHadir}
                <span className="text-base font-normal text-muted"> / {rows.length}</span>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted">Tamu / pengunjung (tanpa data)</div>
              <div className="mt-1 flex items-center gap-3">
                <Button size="sm" disabled={!!sesi.disimpan_at} onClick={() => setTamu(sesi.jumlah_tamu - 1)}>
                  <Minus size={14} />
                </Button>
                <span className="w-10 text-center text-3xl font-bold">{sesi.jumlah_tamu}</span>
                <Button size="sm" disabled={!!sesi.disimpan_at} onClick={() => setTamu(sesi.jumlah_tamu + 1)}>
                  <Plus size={14} />
                </Button>
              </div>
            </Card>
            <Card className="flex items-center p-4">
              <Button variant="primary" className="w-full" disabled={!!sesi.disimpan_at} onClick={() => setTambah(true)}>
                <UserPlus size={16} /> Jemaat baru datang
              </Button>
            </Card>
          </div>

          <Card className="p-0">
            <div className="flex flex-wrap gap-3 border-b border-line p-4">
              <div className="relative min-w-[200px] flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="field pl-9"
                  placeholder="Ketik nama…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  autoFocus
                />
              </div>
              <select className="field w-auto" value={jen} onChange={(e) => setJen(e.target.value)}>
                <option value="">Semua</option>
                {STATUS_AKADEMIK.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => toggle(r)}
                  disabled={!!sesi.disimpan_at}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition active:scale-[0.98]",
                    r.hadir
                      ? "border-success/40 bg-success/10"
                      : "border-line bg-surface hover:border-line-strong",
                    sesi.disimpan_at && "cursor-default active:scale-100",
                    sesi.disimpan_at && !r.hadir && "opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-md border",
                      r.hadir ? "border-success bg-success text-[#052e1f]" : "border-line-strong",
                    )}
                  >
                    {r.hadir && <Check size={15} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{r.nama}</span>
                  <span className="text-[11px] text-faint">{r.status_akademik}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm text-muted">
                  Nama tidak ditemukan.{" "}
                  <button className="text-primary hover:underline" onClick={() => setTambah(true)}>
                    Tambah sebagai jemaat baru
                  </button>
                </p>
              )}
            </div>
          </Card>
          {!sesi.disimpan_at && (
            <SimpanBar
              disimpanAt={null}
              disimpanNama={null}
              jumlah={jumlahHadir}
              busy={busy}
              onSimpan={() => simpan(true)}
              onBuka={() => simpan(false)}
            />
          )}
        </>
      )}

      <TambahCepat
        open={tambah}
        namaAwal={q}
        tambah={async (v) => {
          const { error } = await createClient().rpc("tambah_jemaat_cepat", {
            p_nama: v.nama,
            p_hp: v.hp,
            p_status: v.status,
            p_session: sesi?.id ?? null,
          });
          return error?.message ?? null;
        }}
        onClose={() => setTambah(false)}
        onSaved={() => {
          setQ("");
          load();
        }}
      />
    </>
  );
}
