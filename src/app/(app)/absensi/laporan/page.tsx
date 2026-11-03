"use client";

import { ArrowLeft, CheckCircle2, Download, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/role";
import { CountUp } from "@/components/effects";
import { Av } from "@/components/sion";
import { Button, Empty, Loading, PageHeader } from "@/components/ui";
import { fetchAll } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import type { IbadahSession, Jemaat } from "@/lib/types";
import { cn, fmtDate, isoDate, jenjang } from "@/lib/utils";

type J = Pick<Jemaat, "id" | "nama" | "status_akademik" | "kelas" | "status">;

const PRESET = [
  { k: "1", label: "1 bulan" },
  { k: "3", label: "3 bulan" },
  { k: "6", label: "6 bulan" },
  { k: "tahun", label: "Tahun ini" },
] as const;

function dariPreset(k: string) {
  const now = new Date();
  if (k === "tahun") return `${now.getFullYear()}-01-01`;
  const d = new Date(now.getFullYear(), now.getMonth() - Number(k) + 1, 1);
  return isoDate(d);
}

export default function LaporanPage() {
  const me = useMe();
  const [dari, setDari] = useState(dariPreset("3"));
  const [sampai, setSampai] = useState(isoDate(new Date()));
  const [sesi, setSesi] = useState<IbadahSession[] | null>(null);
  const [hadir, setHadir] = useState<{ session_id: string; jemaat_id: string }[]>([]);
  const [jemaat, setJemaat] = useState<J[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (me.role !== "pengurus") return;
    const sb = createClient();
    setSesi(null);
    (async () => {
      const { data: s } = await sb
        .from("ibadah_sessions")
        .select("*")
        .gte("tanggal", dari)
        .lte("tanggal", sampai)
        .order("tanggal");
      const ss = (s as IbadahSession[]) ?? [];
      const ids = ss.map((x) => x.id);
      const [h, j] = await Promise.all([
        ids.length
          ? fetchAll<{ session_id: string; jemaat_id: string }>((a, b) =>
              sb.from("ibadah_attendance").select("session_id, jemaat_id").in("session_id", ids).range(a, b),
            )
          : Promise.resolve([]),
        sb.from("jemaat").select("id, nama, status_akademik, kelas, status").order("nama"),
      ]);
      setHadir(h);
      setJemaat((j.data as J[]) ?? []);
      setSesi(ss);
    })();
  }, [dari, sampai, me.role]);

  const r = useMemo(() => {
    const ss = sesi ?? [];
    const sion = ss.filter((s) => s.status === "sion" && s.tanggal <= isoDate(new Date()));
    const perSesi = new Map<string, number>();
    const perJemaat = new Map<string, Set<string>>();
    for (const h of hadir) {
      perSesi.set(h.session_id, (perSesi.get(h.session_id) ?? 0) + 1);
      if (!perJemaat.has(h.jemaat_id)) perJemaat.set(h.jemaat_id, new Set());
      perJemaat.get(h.jemaat_id)!.add(h.session_id);
    }
    const totalHadir = sion.reduce((t, s) => t + (perSesi.get(s.id) ?? 0), 0);
    return {
      sion,
      perSesi,
      perJemaat,
      rata: sion.length ? Math.round(totalHadir / sion.length) : 0,
      tamu: sion.reduce((t, s) => t + s.jumlah_tamu, 0),
      belum: sion.filter((s) => !s.disimpan_at).length,
    };
  }, [sesi, hadir]);

  const daftar = useMemo(() => {
    const s = q.trim().toLowerCase();
    return jemaat
      .map((j) => ({ ...j, n: r.perJemaat.get(j.id)?.size ?? 0 }))
      .filter((j) => (j.status === "aktif" || j.n > 0) && (!s || j.nama.toLowerCase().includes(s)))
      .sort((a, b) => b.n - a.n || a.nama.localeCompare(b.nama));
  }, [jemaat, r, q]);

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["No", "Nama", "Jenjang", ...r.sion.map((s) => s.tanggal), "Total", "%"];
    const lines = [head.map(esc).join(",")];
    daftar.forEach((j, i) => {
      const set = r.perJemaat.get(j.id);
      lines.push(
        [
          i + 1,
          j.nama,
          jenjang(j),
          ...r.sion.map((s) => (set?.has(s.id) ? 1 : "")),
          j.n,
          r.sion.length ? Math.round((j.n / r.sion.length) * 100) : 0,
        ]
          .map(esc)
          .join(","),
      );
    });
    lines.push(["", "TOTAL JEMAAT", "", ...r.sion.map((s) => r.perSesi.get(s.id) ?? 0), "", ""].map(esc).join(","));
    lines.push(["", "TAMU", "", ...r.sion.map((s) => s.jumlah_tamu), "", ""].map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `absensi-sion-${dari}-sd-${sampai}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (me.role !== "pengurus") return <Empty>Laporan absensi khusus pengurus.</Empty>;

  return (
    <>
      <Link href="/absensi" className="group mb-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} className="transition-transform duration-300 [transition-timing-function:var(--spring)] group-hover:-translate-x-1" /> Absensi
      </Link>
      <PageHeader
        eyebrow="Laporan Absensi"
        title="Rekap per minggu"
        sub="Rekap per minggu dan per jemaat. Export ke CSV untuk dibuka di Excel / Google Sheets."
        action={
          <Button variant="primary" onClick={exportCsv} disabled={!sesi || !r.sion.length} className="min-h-[46px] px-6">
            <Download size={16} /> Export CSV
          </Button>
        }
      />

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <div className="s-seg" role="group" aria-label="Periode cepat">
          {PRESET.map((p) => (
            <button key={p.k} type="button" aria-pressed={dari === dariPreset(p.k)} onClick={() => setDari(dariPreset(p.k))}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="glass flex flex-wrap items-center gap-2 rounded-full py-1.5 pl-5 pr-2">
          <label className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            Dari
            <input type="date" className="bg-transparent text-sm font-semibold text-ink outline-none" value={dari} onChange={(e) => setDari(e.target.value)} />
          </label>
          <span className="text-muted">→</span>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            Sampai
            <input type="date" className="bg-transparent text-sm font-semibold text-ink outline-none" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </label>
        </div>
      </section>

      {!sesi ? (
        <Loading />
      ) : (
        <>
          <section className="glass s-stats mb-6" aria-label="Ringkasan">
            <div className="s-stat">
              <div className="l">Ibadah Sion</div>
              <div className="n">
                <CountUp value={r.sion.length} />
              </div>
              <div className="s">{sesi.length - r.sion.length} minggu gabung/libur</div>
            </div>
            <div className="s-stat">
              <div className="l">Rata-rata hadir</div>
              <div className="n">
                <CountUp value={r.rata} />
              </div>
              <div className="s">jemaat terdata per ibadah</div>
            </div>
            <div className="s-stat">
              <div className="l">Total tamu</div>
              <div className="n">
                <CountUp value={r.tamu} />
              </div>
              <div className="s">tanpa data jemaat</div>
            </div>
            <div className="s-stat">
              <div className="l">Belum disimpan</div>
              <div className="n">
                <CountUp value={r.belum} />
              </div>
              <div className={r.belum ? "s text-primary" : "s"}>{r.belum ? "minggu belum dikunci" : "semua sudah tersimpan"}</div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            <section className="glass overflow-hidden rounded-[28px] lg:col-span-2">
              <div className="px-6 pb-1 pt-[22px]">
                <h2 className="s-h2">
                  Per <span className="accent-serif">minggu</span>
                </h2>
                <p className="s-sub">Klik tanggal untuk membuka absensinya</p>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="s-tbl">
                  <thead className="sticky top-0 z-10 bg-surface-solid">
                    <tr>
                      <th>Tanggal</th>
                      <th className="!text-right">Hadir</th>
                      <th className="!text-right">Tamu</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sesi].reverse().map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap">
                          <Link href={`/absensi?tanggal=${s.tanggal}`} className="font-bold hover:text-primary">
                            {fmtDate(s.tanggal)}
                          </Link>
                        </td>
                        <td className="text-right font-extrabold tabular-nums">{s.status === "sion" ? (r.perSesi.get(s.id) ?? 0) : "—"}</td>
                        <td className="text-right text-muted tabular-nums">{s.status === "sion" ? s.jumlah_tamu : "—"}</td>
                        <td>
                          {s.status !== "sion" ? (
                            <span className="s-chip">{s.status === "gabung" ? "Gabung umum" : "Libur"}</span>
                          ) : s.disimpan_at ? (
                            <span className="s-chip gold" title={s.disimpan_nama ?? ""}>
                              <CheckCircle2 size={12} /> Tersimpan
                            </span>
                          ) : s.tanggal <= isoDate(new Date()) ? (
                            <span className="s-chip bad">Belum disimpan</span>
                          ) : (
                            <span className="s-chip">Akan datang</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass overflow-hidden rounded-[28px] lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-3 pt-[22px]">
                <div>
                  <h2 className="s-h2">
                    Per <span className="accent-serif">jemaat</span>
                  </h2>
                  <p className="s-sub">Dari {r.sion.length} ibadah Sion di periode ini</p>
                </div>
                <label className="s-search !h-11 !flex-[0_1_240px]">
                  <Search size={16} className="text-muted" />
                  <span className="sr-only">Cari nama</span>
                  <input placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} />
                </label>
              </div>
              {daftar.length === 0 ? (
                <div className="px-6 pb-6">
                  <Empty>Tidak ada jemaat yang cocok.</Empty>
                </div>
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="s-tbl">
                    <thead className="sticky top-0 z-10 bg-surface-solid">
                      <tr>
                        <th>Nama</th>
                        <th>Jenjang</th>
                        <th>Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daftar.map((j, i) => {
                        const pct = r.sion.length ? Math.round((j.n / r.sion.length) * 100) : 0;
                        return (
                          <tr key={j.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <Av nama={j.nama} i={i} size={34} />
                                <span className="font-bold">{j.nama}</span>
                                {j.status === "nonaktif" && <span className="s-chip">nonaktif</span>}
                              </div>
                            </td>
                            <td>
                              <span className="s-chip whitespace-nowrap">{jenjang(j)}</span>
                            </td>
                            <td>
                              <div className="flex min-w-[170px] items-center gap-3">
                                <span className="s-track flex-1">
                                  <i style={{ width: `${Math.max(2, pct)}%`, animationDelay: `${Math.min(i, 20) * 0.03}s` }} />
                                </span>
                                <span className={cn("w-[72px] text-right text-xs font-bold tabular-nums", pct < 40 && "text-danger")}>
                                  {j.n}/{r.sion.length} · {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
