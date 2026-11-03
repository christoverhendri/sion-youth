"use client";

import { useEffect, useMemo, useState } from "react";
import { Donut, HBar, TrendBars } from "@/components/charts";
import { Av, Panel, PanelHead, Seg } from "@/components/sion";
import { Empty, Loading, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { fetchAll, loadKehadiran, trenKehadiran, type Kehadiran } from "@/lib/data";
import type { GdgGroup, Jemaat, Pelayanan } from "@/lib/types";
import { addMonths, countBy, firstOfMonth, fmtDate, fmtMonth, jenjang } from "@/lib/utils";

type AbsenGdg = { id: string; nama: string; gdg_group_id: string; absen_beruntun: number; total_sesi: number; total_hadir: number };
type Tab = "kehadiran" | "jemaat" | "pelayanan";

export default function AnalisisPage() {
  const [jemaat, setJemaat] = useState<Jemaat[] | null>(null);
  const [pel, setPel] = useState<Pelayanan[]>([]);
  const [groups, setGroups] = useState<GdgGroup[]>([]);
  const [absenGdg, setAbsenGdg] = useState<AbsenGdg[]>([]);
  const [keh, setKeh] = useState<Kehadiran>({ sesi: [], hadir: [] });
  const [bulan, setBulan] = useState(firstOfMonth());
  const [tab, setTab] = useState<Tab>("kehadiran");

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
    const tren = trenKehadiran(keh, false);

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
      tren12: tren.slice(-12),
      rata: tren.length ? Math.round(tren.reduce((s, t) => s + t.value, 0) / tren.length) : 0,
      puncak: tren.length ? Math.max(...tren.map((t) => t.value)) : 0,
    };
  }, [jemaat, pel, keh]);

  const absenList = useMemo(
    () =>
      absenGdg
        .filter((x) => x.absen_beruntun >= 2)
        .sort((x, y) => y.absen_beruntun - x.absen_beruntun)
        .map((x) => ({ ...x, grup: groups.find((g) => g.id === x.gdg_group_id)?.nama ?? "Tanpa grup" })),
    [absenGdg, groups],
  );

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
      <PageHeader
        eyebrow="Analisis"
        title="Membaca pertumbuhan."
        sub={`Berdasarkan ${a.aktif.length} jemaat aktif, diperbarui setiap kali absensi disimpan.`}
        action={
          <Seg<Tab>
            label="Bagian analisis"
            value={tab}
            onChange={setTab}
            options={[
              { value: "kehadiran", label: "Kehadiran" },
              { value: "jemaat", label: "Jemaat" },
              { value: "pelayanan", label: "Pelayanan" },
            ]}
          />
        }
      />

      {tab === "kehadiran" && (
        <div key="k" className="s-pane space-y-6">
          <Panel>
            <PanelHead
              title="Kehadiran"
              accent="ibadah"
              sub={`${a.tren12.length} ibadah Sion terakhir · arahkan kursor ke batang`}
              action={
                <div className="flex gap-7">
                  <div>
                    <div className="text-[13px] text-muted">Rata-rata</div>
                    <div className="text-[26px] font-extrabold tabular-nums">{a.rata}</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-muted">Tertinggi</div>
                    <div className="text-[26px] font-extrabold tabular-nums text-primary">{a.puncak}</div>
                  </div>
                </div>
              }
            />
            <TrendBars data={a.tren12} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHead title="Sering tidak datang" accent="GDG" sub="Absen 2× atau lebih berturut-turut di grupnya" />
              {absenList.length === 0 ? (
                <Empty>Semua rajin datang GDG.</Empty>
              ) : (
                <div className="max-h-[420px] overflow-y-auto px-[14px]">
                  {absenList.map((x, i) => (
                    <div key={x.id} className="s-row">
                      <Av nama={x.nama} i={i} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{x.nama}</div>
                        <div className="s-sub">{x.grup}</div>
                      </div>
                      <span className={x.absen_beruntun >= 3 ? "s-chip bad" : "s-chip gold"}>{x.absen_beruntun}× absen</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHead title="Retensi" accent="jemaat baru" sub="Yang bergabung tiap bulan dan masih hadir di 4 ibadah terakhir" />
              {a.retensi.map((r, i) => {
                const pct = r.baru ? Math.round((r.tetap / r.baru) * 100) : 0;
                return (
                  <div key={r.bulan} className="s-hb" style={{ gridTemplateColumns: "110px minmax(0,1fr) 70px" }}>
                    <span className="lbl">{fmtMonth(r.bulan)}</span>
                    <span className="s-track">
                      <i style={{ width: `${Math.max(2, pct)}%`, animationDelay: `${0.15 + i * 0.07}s` }} />
                    </span>
                    <span className="v">{r.baru ? `${r.tetap}/${r.baru}` : "—"}</span>
                  </div>
                );
              })}
            </Panel>
          </div>
        </div>
      )}

      {tab === "jemaat" && (
        <div key="j" className="s-pane space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHead title="Proporsi" accent="jenjang" sub="Jemaat aktif" />
              <Donut data={a.jenjang} />
            </Panel>
            <Panel>
              <PanelHead title="Sebaran" accent="domisili" sub="Untuk lokasi GDG atau nebeng bareng" />
              <HBar data={a.kecamatan} max={8} />
            </Panel>
            <Panel>
              <PanelHead title="Kenal Sion" accent="dari mana" sub="Channel paling efektif, sepanjang waktu" />
              <HBar data={a.sumber} max={8} />
            </Panel>
            <Panel>
              <PanelHead title="Top" accent="pengajak" sub="Paling banyak mengajak teman baru" />
              {a.inviter.length === 0 ? (
                <Empty>Belum ada data.</Empty>
              ) : (
                <div className="px-[14px]">
                  {a.inviter.slice(0, 6).map((t, i) => (
                    <div key={t.name} className="s-row">
                      <span className="w-[22px] font-extrabold text-primary">{i + 1}</span>
                      <Av nama={t.name} i={i} />
                      <div className="min-w-0 flex-1 truncate font-bold">{t.name}</div>
                      <span className="s-chip gold">{t.value} orang</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel className="lg:col-span-2">
              <PanelHead title="Kuliah dalam vs" accent="luar negeri" sub="Semua jemaat berstatus Kuliah, termasuk yang nonaktif" />
              <div className="grid items-center gap-6 lg:grid-cols-2">
                <Donut data={a.kuliah} label="mahasiswa" />
                {a.kuliahLuar.length > 0 && (
                  <div className="flex flex-wrap gap-2.5">
                    {a.kuliahLuar.map((j) => (
                      <span key={j.id} className="s-tag">
                        {j.nama} {j.kota_studi && <b>{j.kota_studi}</b>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHead
              title="Jemaat"
              accent="baru"
              sub="Siapa yang bergabung, kenal Sion dari mana, dan diajak siapa"
              action={
                <label className="s-search !h-11 !flex-none !px-4">
                  <span className="sr-only">Pilih bulan</span>
                  <select className="bg-transparent text-sm font-semibold outline-none" value={bulan} onChange={(e) => setBulan(e.target.value)}>
                    {bulanOpsi.map((m) => (
                      <option key={m} value={m} className="bg-surface-solid">
                        {fmtMonth(m)}
                      </option>
                    ))}
                  </select>
                </label>
              }
            />
            {baruBulan.length === 0 ? (
              <Empty>Tidak ada jemaat baru di {fmtMonth(bulan)}.</Empty>
            ) : (
              <div className="grid gap-8 lg:grid-cols-5">
                <div className="-mx-2 overflow-x-auto lg:col-span-3">
                  <table className="s-tbl">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Jenjang</th>
                        <th>Kenal dari</th>
                        <th>Diajak oleh</th>
                        <th>Bergabung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baruBulan.map((j, i) => (
                        <tr key={j.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <Av nama={j.nama} i={i} size={34} />
                              <span className="whitespace-nowrap font-bold">{j.nama}</span>
                            </div>
                          </td>
                          <td>
                            <span className="s-chip">{jenjang(j)}</span>
                          </td>
                          <td className="whitespace-nowrap text-muted">{j.sumber_info ?? "—"}</td>
                          <td className="whitespace-nowrap text-muted">{j.diajak_oleh_nama ?? "—"}</td>
                          <td className="whitespace-nowrap text-muted">{fmtDate(j.tanggal_bergabung, { year: undefined })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="lg:col-span-2">
                  <div className="mb-2 text-[13px] font-bold text-muted">Sumber bulan ini</div>
                  <HBar data={countBy(baruBulan, (j) => j.sumber_info ?? "Belum diisi")} />
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      {tab === "pelayanan" && (
        <div key="p" className="s-pane space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHead title="Kemampuan" accent="penatalayan" sub="Yang sudah bisa melayani di bidang ini" />
              <HBar data={a.bisa} />
            </Panel>
            <Panel>
              <PanelHead title="Mau belajar" accent="pelayanan" sub="Acuan topik training dan workshop" />
              <HBar data={a.mauBelajar} />
            </Panel>
          </div>

          <Panel>
            <PanelHead title="Hobi" accent="jemaat" sub="Acuan memilih kegiatan Sion Fun Activity Day" />
            {a.hobi.length === 0 ? (
              <Empty>Belum ada data.</Empty>
            ) : (
              <div className="stagger flex flex-wrap gap-2.5">
                {a.hobi.map((h) => (
                  <span key={h.name} className="s-tag">
                    {h.name} <b>{h.value}</b>
                  </span>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead
              title="Kandidat"
              accent="penatalayan"
              sub={`Sudah bisa melayani dan hadir ≥ 75% di ${a.nSesi || 8} ibadah terakhir: siap diajak melayani`}
            />
            {a.kandidat.length === 0 ? (
              <Empty>Belum ada data yang cukup (butuh data minat pelayanan dan absensi).</Empty>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(
                  a.kandidat.reduce<Record<string, typeof a.kandidat>>((m, k) => {
                    (m[k.bidang] ??= []).push(k);
                    return m;
                  }, {}),
                ).map(([bidang, list]) => (
                  <div key={bidang} className="s-pick">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{bidang}</span>
                      <span className="s-chip gold">{list.length} orang</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {list.map((k, i) => (
                        <span key={k.jemaat_id} className="inline-flex items-center gap-2 text-sm font-semibold">
                          <Av nama={k.j.nama} i={i} size={28} />
                          {k.j.nama}
                          <span className="text-xs text-muted">
                            {k.hadir}/{a.nSesi}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
