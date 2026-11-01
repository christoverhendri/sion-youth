"use client";

import { ArrowLeft, CheckCircle2, Download, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/role";
import { Badge, Button, Card, CardTitle, Empty, Field, Loading, PageHeader, Stat } from "@/components/ui";
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
      <Link href="/absensi" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Absensi
      </Link>
      <PageHeader
        title="Laporan Absensi Ibadah"
        sub="Rekap per minggu dan per jemaat. Export ke CSV untuk dibuka di Excel / Google Sheets."
        action={
          <Button variant="primary" onClick={exportCsv} disabled={!sesi || !r.sion.length}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESET.map((p) => (
              <Button key={p.k} size="sm" onClick={() => setDari(dariPreset(p.k))}>
                {p.label}
              </Button>
            ))}
          </div>
          <Field label="Dari">
            <input type="date" className="field w-auto" value={dari} onChange={(e) => setDari(e.target.value)} />
          </Field>
          <Field label="Sampai">
            <input type="date" className="field w-auto" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </Field>
        </div>
      </Card>

      {!sesi ? (
        <Loading />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Ibadah Sion" value={r.sion.length} sub={`${sesi.length - r.sion.length} minggu gabung/libur`} />
            <Stat label="Rata-rata hadir" value={r.rata} sub="jemaat terdata per ibadah" />
            <Stat label="Total tamu" value={r.tamu} />
            <Stat
              label="Belum disimpan"
              value={r.belum}
              sub={r.belum ? "minggu yang absensinya belum dikunci" : "semua sudah tersimpan"}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <Card className="p-0 lg:col-span-2">
              <div className="p-5 pb-2">
                <CardTitle sub="Klik tanggal untuk membuka absensinya">Per minggu</CardTitle>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-solid">
                    <tr className="text-left text-xs text-muted">
                      <th className="px-5 py-2 font-medium">Tanggal</th>
                      <th className="px-3 py-2 text-right font-medium">Hadir</th>
                      <th className="px-3 py-2 text-right font-medium">Tamu</th>
                      <th className="px-5 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sesi].reverse().map((s) => (
                      <tr key={s.id} className="border-t border-line">
                        <td className="whitespace-nowrap px-5 py-2.5">
                          <Link href={`/absensi?tanggal=${s.tanggal}`} className="hover:text-primary">
                            {fmtDate(s.tanggal)}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">
                          {s.status === "sion" ? (r.perSesi.get(s.id) ?? 0) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted">{s.status === "sion" ? s.jumlah_tamu : "-"}</td>
                        <td className="px-5 py-2.5">
                          {s.status !== "sion" ? (
                            <Badge>{s.status === "gabung" ? "Gabung umum" : "Libur"}</Badge>
                          ) : s.disimpan_at ? (
                            <span className="inline-flex items-center gap-1 text-xs text-success" title={s.disimpan_nama ?? ""}>
                              <CheckCircle2 size={13} /> Tersimpan
                            </span>
                          ) : s.tanggal <= isoDate(new Date()) ? (
                            <Badge color="yellow">Belum disimpan</Badge>
                          ) : (
                            <span className="text-xs text-faint">Akan datang</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-0 lg:col-span-3">
              <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-2">
                <CardTitle sub={`Dari ${r.sion.length} ibadah Sion di periode ini`}>Per jemaat</CardTitle>
                <div className="relative w-56">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input className="field py-1.5 pl-9 text-xs" placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-solid">
                    <tr className="text-left text-xs text-muted">
                      <th className="px-5 py-2 font-medium">Nama</th>
                      <th className="px-3 py-2 font-medium">Jenjang</th>
                      <th className="px-5 py-2 font-medium">Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((j) => {
                      const pct = r.sion.length ? Math.round((j.n / r.sion.length) * 100) : 0;
                      return (
                        <tr key={j.id} className="border-t border-line">
                          <td className="px-5 py-2.5">
                            {j.nama}
                            {j.status === "nonaktif" && <span className="ml-2 text-xs text-faint">nonaktif</span>}
                          </td>
                          <td className="px-3 py-2.5 text-muted">{jenjang(j)}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-tint/10">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    pct >= 75 ? "bg-success" : pct >= 40 ? "bg-primary" : "bg-warning",
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted">
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
            </Card>
          </div>
        </>
      )}
    </>
  );
}
