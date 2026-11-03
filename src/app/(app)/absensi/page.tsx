"use client";

import { CalendarOff, ChevronLeft, ChevronRight, Church, FileBarChart, Minus, Plus, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/role";
import { Av, CheckIcon, Panel, Seg } from "@/components/sion";
import { SimpanBar } from "@/components/simpan-bar";
import { TambahCepat } from "@/components/tambah-cepat";
import { Button, ErrorText, Loading, PageHeader } from "@/components/ui";
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
  const [lihat, setLihat] = useState<"semua" | "belum" | "hadir">("semua");
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
    return (rows ?? []).filter(
      (r) =>
        (!jen || r.status_akademik === jen) &&
        (!s || r.nama.toLowerCase().includes(s)) &&
        (lihat === "semua" || (lihat === "hadir") === r.hadir),
    );
  }, [rows, q, jen, lihat]);
  const total = rows?.length ?? 0;
  const jumlahHadir = (rows ?? []).filter((r) => r.hadir).length;
  const isFuture = tanggal > isoDate(new Date());
  const terkunci = !!sesi?.disimpan_at;
  const C = 2 * Math.PI * 70;

  return (
    <>
      <PageHeader
        eyebrow="Absensi Ibadah"
        title={`Minggu, ${fmtDate(tanggal, { month: "long", year: undefined })}`}
        sub={terkunci ? "Absensi minggu ini sudah disimpan." : "Ketuk nama untuk menandai hadir. Centangan tersimpan otomatis sebagai draf."}
        action={
          <>
            <div className="glass flex items-center gap-1 rounded-full p-[5px]">
              <button aria-label="Minggu sebelumnya" className="pressable grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setTanggal(geser(tanggal, -1))}>
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() => setTanggal(mingguIni())}
                className="min-w-[130px] px-2 text-center text-sm font-bold"
                title="Kembali ke minggu ini"
              >
                {tanggal === mingguIni() ? "Minggu ini" : tanggal < mingguIni() ? "Minggu lalu" : "Minggu depan"}
              </button>
              <button aria-label="Minggu berikutnya" className="pressable grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setTanggal(geser(tanggal, 1))}>
                <ChevronRight size={17} />
              </button>
            </div>
            {pengurus && (
              <Link href="/absensi/laporan" className="btn-ghost pressable inline-flex min-h-[46px] items-center gap-2 rounded-full px-5 text-sm font-semibold backdrop-blur-xl">
                <FileBarChart size={16} /> Laporan
              </Link>
            )}
          </>
        }
      />

      {isFuture && (
        <div className="mb-5">
          <span className="s-chip gold">Tanggal belum lewat</span>
        </div>
      )}

      <ErrorText>{error}</ErrorText>

      {!sesi || !rows ? (
        <Loading />
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <section className="min-w-0 flex-[999_1_560px]">
            {sesi.status !== "sion" ? (
              <Panel className="py-16 text-center">
                <span className="s-ico mx-auto h-16 w-16 rounded-[20px]">
                  {sesi.status === "gabung" ? <Church size={28} /> : <CalendarOff size={28} />}
                </span>
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                  {sesi.status === "gabung" ? (
                    <>
                      Minggu ini gabung <span className="accent-serif">ibadah umum</span>
                    </>
                  ) : (
                    <>
                      Minggu ini <span className="accent-serif">libur</span>
                    </>
                  )}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  Tidak ada absensi Sion. Minggu ini tidak dihitung di peringatan &quot;lama tidak datang&quot;.
                </p>
                {sesi.catatan && <p className="mt-2 text-sm text-muted">Catatan: {sesi.catatan}</p>}
              </Panel>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="s-search">
                    <Search size={18} className="text-muted" />
                    <span className="sr-only">Cari nama</span>
                    <input placeholder="Ketik nama…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
                  </label>
                  <Seg
                    label="Filter kehadiran"
                    value={lihat}
                    onChange={setLihat}
                    options={[
                      { value: "semua", label: "Semua", count: total },
                      { value: "belum", label: "Belum hadir", count: total - jumlahHadir },
                      { value: "hadir", label: "Hadir", count: jumlahHadir },
                    ]}
                  />
                </div>
                <Seg
                  small
                  className="mt-3"
                  label="Filter jenjang"
                  value={jen}
                  onChange={setJen}
                  options={[{ value: "", label: "Semua jenjang" }, ...STATUS_AKADEMIK.map((s) => ({ value: s as string, label: s }))]}
                />

                <Panel className="mt-4 !p-3.5">
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {filtered.map((r, i) => (
                      <div key={r.id} className="s-prow" data-on={r.hadir || undefined} style={{ opacity: terkunci && !r.hadir ? 0.5 : 1 }}>
                        <Av nama={r.nama} i={i} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold">{r.nama}</div>
                          <div className="text-xs text-muted">{r.status_akademik}</div>
                        </div>
                        <button
                          type="button"
                          className="s-chk"
                          onClick={() => toggle(r)}
                          disabled={terkunci}
                          aria-pressed={r.hadir}
                          aria-label={`${r.hadir ? "Batalkan hadir" : "Tandai hadir"} ${r.nama}`}
                        >
                          <CheckIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                  {filtered.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted">
                      Nama tidak ditemukan.{" "}
                      <button className="s-more" onClick={() => setTambah(true)}>
                        Tambah sebagai jemaat baru
                      </button>
                    </p>
                  )}
                </Panel>

                <SimpanBar
                  disimpanAt={sesi.disimpan_at}
                  disimpanNama={sesi.disimpan_nama}
                  jumlah={jumlahHadir}
                  tamu={sesi.jumlah_tamu}
                  busy={busy}
                  onSimpan={() => simpan(true)}
                  onBuka={() => simpan(false)}
                />
              </>
            )}
          </section>

          <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-[18px] lg:max-w-[300px]">
            {sesi.status === "sion" && (
              <>
                <Panel className="text-center">
                  <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={`${jumlahHadir} dari ${total} jemaat hadir`} className="mx-auto block">
                    <defs>
                      <linearGradient id="ring-absen" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0" stopColor="#F3DDA8" />
                        <stop offset="1" stopColor="#C6A15B" />
                      </linearGradient>
                    </defs>
                    <circle cx="90" cy="90" r="70" fill="none" stroke="var(--surface-2)" strokeWidth="12" />
                    <circle
                      cx="90"
                      cy="90"
                      r="70"
                      fill="none"
                      stroke="url(#ring-absen)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${total ? (jumlahHadir / total) * C : 0} ${C}`}
                      transform="rotate(-90 90 90)"
                      style={{ transition: "stroke-dasharray .8s var(--spring)", filter: "drop-shadow(0 0 8px rgba(227,198,138,0.5))" }}
                    />
                    <text x="90" y="92" textAnchor="middle" fontWeight="800" fontSize="40" fill="var(--text)">
                      {jumlahHadir}
                    </text>
                    <text x="90" y="116" textAnchor="middle" fontWeight="600" fontSize="12" fill="var(--muted)">
                      dari {total} jemaat
                    </text>
                  </svg>
                </Panel>

                <Panel className="!p-6">
                  <div className="font-bold">Tamu / pengunjung</div>
                  <div className="s-sub">Yang belum punya data jemaat</div>
                  <div className="glass mt-4 flex items-center justify-between rounded-full p-[5px]">
                    <button
                      type="button"
                      aria-label="Kurangi tamu"
                      disabled={terkunci}
                      onClick={() => setTamu(sesi.jumlah_tamu - 1)}
                      className="pressable grid h-11 w-11 place-items-center rounded-full bg-surface-2 hover:bg-gold/20 disabled:opacity-40"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-[22px] font-extrabold tabular-nums" aria-live="polite">
                      {sesi.jumlah_tamu}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah tamu"
                      disabled={terkunci}
                      onClick={() => setTamu(sesi.jumlah_tamu + 1)}
                      className="pressable grid h-11 w-11 place-items-center rounded-full bg-surface-2 hover:bg-gold/20 disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <Button variant="primary" className="mt-4 w-full" disabled={terkunci} onClick={() => setTambah(true)}>
                    <UserPlus size={16} /> Jemaat baru datang
                  </Button>
                </Panel>
              </>
            )}

            {pengurus && (
              <Panel className="!p-6">
                <div className="font-bold">Status ibadah</div>
                <div className="s-sub">Hanya pengurus</div>
                <div className="mt-4 flex flex-col gap-2">
                  {STATUS_SESI.map((s) => (
                    <button key={s.v} type="button" className={cn("s-pick !p-3.5")} data-on={sesi.status === s.v || undefined} onClick={() => setStatus(s.v)}>
                      <div className="text-sm font-bold">{s.label}</div>
                      <div className="text-xs text-muted">{s.desc}</div>
                    </button>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className="mb-2 block text-[13px] font-bold text-muted">Catatan</span>
                  <textarea
                    key={sesi.id}
                    rows={3}
                    className="field rounded-2xl"
                    placeholder="Mis. gabung karena Paskah"
                    defaultValue={sesi.catatan ?? ""}
                    onBlur={(e) => setCatatan(e.target.value)}
                  />
                </label>
              </Panel>
            )}
          </aside>
        </div>
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
