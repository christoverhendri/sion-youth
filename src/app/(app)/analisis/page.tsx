"use client";

import { useEffect, useMemo, useState } from "react";
import { Donut, HBar, SERIES, TrendArea } from "@/components/charts";
import { Badge, Card, CardTitle, Empty, Loading, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { fetchAll, loadKehadiran, trenKehadiran, type Kehadiran } from "@/lib/data";
import type { GdgGroup, Jemaat, Pelayanan } from "@/lib/types";
import { addMonths, countBy, firstOfMonth, fmtDate, fmtMonth, jenjang } from "@/lib/utils";

type AbsenGdg = { id: string; nama: string; gdg_group_id: string; absen_beruntun: number; total_sesi: number; total_hadir: number };

export default function AnalisisPage() {
  const [jemaat, setJemaat] = useState<Jemaat[] | null>(null);
  const [pel, setPel] = useState<Pelayanan[]>([]);
  const [groups, setGroups] = useState<GdgGroup[]>([]);
  const [absenGdg, setAbsenGdg] = useState<AbsenGdg[]>([]);
  const [keh, setKeh] = useState<Kehadiran>({ sesi: [], hadir: [] });
  const [bulan, setBulan] = useState(firstOfMonth());

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from("jemaat").select("*"),
      fetchAll<Pelayanan>((a, b) => sb.from("jemaat_pelayanan").select("*").range(a, b)),
      sb.from("gdg_groups").select("*").order("nama"),
      sb.from("v_absen_gdg").select("id, nama, gdg_group_id, absen_beruntun, total_sesi, total_hadir"),
      loadKehadiran(sb, 26),
    ]).then(([j, p, g, ag, k]) => {
      setJemaat((j.data as Jemaat[]) ?? []);
      setPel(p);
      setGroups((g.data as GdgGroup[]) ?? []);
      setAbsenGdg((ag.data as AbsenGdg[]) ?? []);
      setKeh(k);
    });
  }, []);

  const a = useMemo(() => {
    const all = jemaat ?? [];
    const aktif = all.filter((j) => j.status === "aktif");
    const aktifIds = new Set(aktif.map((j) => j.id));
    const pelAktif = pel.filter((p) => aktifIds.has(p.jemaat_id));

    // Kehadiran 8 sesi terakhir per jemaat
    const last8 = new Set(keh.sesi.slice(-8).map((s) => s.id));
    const hadir8 = new Map<string, number>();
    for (const h of keh.hadir) if (last8.has(h.session_id)) hadir8.set(h.jemaat_id, (hadir8.get(h.jemaat_id) ?? 0) + 1);
    const nSesi = last8.size;

    // Retensi: jemaat baru per bulan (6 bulan terakhir) yang masih hadir di 4 sesi terakhir
    const last4 = new Set(keh.sesi.slice(-4).map((s) => s.id));
    const masihDatang = new Set(keh.hadir.filter((h) => last4.has(h.session_id)).map((h) => h.jemaat_id));
    const retensi = Array.from({ length: 6 }, (_, i) => {
      const m = addMonths(firstOfMonth(), -5 + i);
      const next = addMonths(m, 1);
      const baru = all.filter((j) => j.tanggal_bergabung >= m && j.tanggal_bergabung < next);
      const tetap = baru.filter((j) => j.status === "aktif" && masihDatang.has(j.id)).length;
      return { bulan: m, baru: baru.length, tetap };
    });

    const kandidat = pelAktif
      .filter((p) => p.level === "bisa")
      .map((p) => ({ ...p, j: aktif.find((j) => j.id === p.jemaat_id)!, hadir: hadir8.get(p.jemaat_id) ?? 0 }))
      .filter((x) => nSesi > 0 && x.hadir / nSesi >= 0.75);

    const kuliah = all.filter((j) => j.status_akademik === "Kuliah");

    return {
      aktif,
      hobi: countBy(aktif, (j) => j.hobi),
      bisa: countBy(pelAktif.filter((p) => p.level === "bisa"), (p) => p.bidang),
      mauBelajar: countBy(pelAktif.filter((p) => p.level === "mau_belajar"), (p) => p.bidang),
      kuliah: countBy(kuliah, (j) => j.lokasi_studi ?? "Belum diisi"),
      kuliahLuar: kuliah.filter((j) => j.lokasi_studi === "Luar Negeri"),
      jenjang: ["SD", "SMP", "SMA", "Kuliah", "Kerja"]
        .map((s) => ({ name: s, value: aktif.filter((j) => j.status_akademik === s).length }))
        .filter((x) => x.value > 0),
      sumber: countBy(all, (j) => j.sumber_info),
      inviter: countBy(all, (j) => j.diajak_oleh_nama?.trim().replace(/\b\w/g, (c) => c.toUpperCase())),
      kecamatan: countBy(aktif, (j) => j.kecamatan),
      retensi,
      kandidat,
      nSesi,
    };
  }, [jemaat, pel, keh]);

  const baruBulan = useMemo(() => {
    const next = addMonths(bulan, 1);
    return (jemaat ?? [])
      .filter((j) => j.tanggal_bergabung >= bulan && j.tanggal_bergabung < next)
      .sort((x, y) => x.tanggal_bergabung.localeCompare(y.tanggal_bergabung));
  }, [jemaat, bulan]);

  const bulanOpsi = useMemo(() => Array.from({ length: 12 }, (_, i) => addMonths(firstOfMonth(), -i)), []);

  if (!jemaat) return <Loading />;

  return (
    <>
      <PageHeader title="Analisis" sub={`Berdasarkan ${a.aktif.length} jemaat aktif`} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle sub="Acuan memilih kegiatan Sion Fun Activity Day">Hobi jemaat</CardTitle>
          <HBar data={a.hobi} />
        </Card>

        <Card>
          <CardTitle sub="Jemaat aktif per jenjang">Proporsi SD / SMP / SMA / Kuliah / Kerja</CardTitle>
          <Donut data={a.jenjang} />
        </Card>

        <Card>
          <CardTitle sub="Jumlah jemaat yang sudah bisa melayani di bidang ini">Kemampuan penatalayan</CardTitle>
          <HBar data={a.bisa} color={SERIES[2]} />
        </Card>

        <Card>
          <CardTitle sub="Tertarik tapi belum bisa → acuan topik training / workshop">Mau belajar pelayanan</CardTitle>
          <HBar data={a.mauBelajar} color={SERIES[3]} />
        </Card>

        <Card>
          <CardTitle sub="Semua jemaat berstatus Kuliah (termasuk yang nonaktif)">Kuliah dalam vs luar negeri</CardTitle>
          <Donut data={a.kuliah} />
          {a.kuliahLuar.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.kuliahLuar.map((j) => (
                <Badge key={j.id}>
                  {j.nama}
                  {j.kota_studi && ` · ${j.kota_studi}`}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle sub="Absen 2× atau lebih berturut-turut di GDG grupnya">Sering tidak datang GDG</CardTitle>
          {groups.length === 0 ? (
            <Empty>Belum ada grup GDG.</Empty>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => {
                const list = absenGdg
                  .filter((x) => x.gdg_group_id === g.id && x.absen_beruntun >= 2)
                  .sort((x, y) => y.absen_beruntun - x.absen_beruntun);
                return (
                  <div key={g.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{g.nama}</span>
                      <span className="text-xs text-muted">{list.length} orang</span>
                    </div>
                    {list.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {list.map((x) => (
                          <Badge key={x.id} color={x.absen_beruntun >= 3 ? "red" : "yellow"}>
                            {x.nama} · {x.absen_beruntun}×
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-faint">Semua rajin 👍</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle
            sub="Siapa saja yang bergabung, kenal Sion dari mana, dan diajak siapa"
            action={
              <select className="field w-auto" value={bulan} onChange={(e) => setBulan(e.target.value)}>
                {bulanOpsi.map((m) => (
                  <option key={m} value={m}>
                    {fmtMonth(m)}
                  </option>
                ))}
              </select>
            }
          >
            Jemaat baru
          </CardTitle>
          {baruBulan.length === 0 ? (
            <Empty>Tidak ada jemaat baru di {fmtMonth(bulan)}.</Empty>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="overflow-x-auto lg:col-span-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-medium">Nama</th>
                      <th className="py-2 pr-3 font-medium">Jenjang</th>
                      <th className="py-2 pr-3 font-medium">Kenal dari</th>
                      <th className="py-2 pr-3 font-medium">Diajak oleh</th>
                      <th className="py-2 font-medium">Bergabung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baruBulan.map((j) => (
                      <tr key={j.id} className="border-t border-line">
                        <td className="py-2 pr-3 font-medium">{j.nama}</td>
                        <td className="py-2 pr-3 text-muted">{jenjang(j)}</td>
                        <td className="py-2 pr-3 text-muted">{j.sumber_info ?? "-"}</td>
                        <td className="py-2 pr-3 text-muted">{j.diajak_oleh_nama ?? "-"}</td>
                        <td className="py-2 text-muted">{fmtDate(j.tanggal_bergabung, { year: undefined })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lg:col-span-2">
                <div className="mb-2 text-xs font-medium text-muted">Sumber bulan ini</div>
                <HBar data={countBy(baruBulan, (j) => j.sumber_info ?? "Belum diisi")} />
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle sub="Jemaat terdata yang hadir, 26 ibadah Sion terakhir (minggu gabung/libur tidak dihitung)">
            Tren kehadiran ibadah
          </CardTitle>
          <TrendArea data={trenKehadiran(keh, false)} height={260} />
        </Card>

        <Card>
          <CardTitle sub="Dari jemaat yang bergabung tiap bulan, berapa yang masih hadir di 4 ibadah terakhir">
            Retensi jemaat baru
          </CardTitle>
          <div className="space-y-3">
            {a.retensi.map((r) => {
              const pct = r.baru ? Math.round((r.tetap / r.baru) * 100) : 0;
              return (
                <div key={r.bulan}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted">{fmtMonth(r.bulan)}</span>
                    <span>
                      {r.baru ? (
                        <>
                          <b>{r.tetap}</b>/{r.baru} masih datang <span className="text-muted">({pct}%)</span>
                        </>
                      ) : (
                        <span className="text-faint">tidak ada jemaat baru</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle sub="Total sepanjang waktu, untuk melihat channel yang paling efektif">Kenal Sion dari mana</CardTitle>
          <HBar data={a.sumber} color={SERIES[6]} />
        </Card>

        <Card>
          <CardTitle sub="Yang paling banyak mengajak teman baru, layak diapresiasi 🙌">Top pengajak</CardTitle>
          <HBar data={a.inviter} max={8} color={SERIES[4]} />
        </Card>

        <Card>
          <CardTitle sub="Berguna untuk lokasi GDG atau nebeng bareng">Sebaran domisili (kecamatan)</CardTitle>
          <HBar data={a.kecamatan} max={10} />
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle
            sub={`Sudah bisa melayani + hadir ≥ 75% di ${a.nSesi || 8} ibadah terakhir: siap diajak melayani`}
          >
            Kandidat penatalayan
          </CardTitle>
          {a.kandidat.length === 0 ? (
            <Empty>Belum ada data yang cukup (butuh data minat pelayanan & absensi).</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(
                a.kandidat.reduce<Record<string, typeof a.kandidat>>((m, k) => {
                  (m[k.bidang] ??= []).push(k);
                  return m;
                }, {}),
              ).map(([bidang, list]) => (
                <div key={bidang} className="rounded-xl border border-line bg-surface p-3">
                  <div className="mb-2 text-sm font-medium">{bidang}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((k) => (
                      <Badge key={k.jemaat_id} color="green">
                        {k.j.nama} · {k.hadir}/{a.nSesi}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
