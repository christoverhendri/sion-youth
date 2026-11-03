"use client";

import { ArrowRight, CalendarDays, CheckCircle2, CircleDashed, Heart, Network, TrendingUp, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TrendArea } from "@/components/charts";
import { CountUp } from "@/components/effects";
import { FollowUpButton } from "@/components/followup";
import { useMe } from "@/components/role";
import { Av, More, Panel, PanelHead, Seg, inisial } from "@/components/sion";
import { Empty, Loading } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { loadKehadiran, trenKehadiran, type Kehadiran } from "@/lib/data";
import type { AbsenRow, Activity, GdgGroup, GdgSession, IbadahSession, Jemaat } from "@/lib/types";
import {
  ABSEN_KUNING,
  ABSEN_MERAH,
  cn,
  firstOfMonth,
  fmtDate,
  isoDate,
  mingguIni,
  parseDate,
  pesanUltah,
  umur,
} from "@/lib/utils";

export default function DashboardPage() {
  const me = useMe();
  const [jemaat, setJemaat] = useState<Jemaat[] | null>(null);
  const [absen, setAbsen] = useState<AbsenRow[]>([]);
  const [groups, setGroups] = useState<GdgGroup[]>([]);
  const [acts, setActs] = useState<Activity[]>([]);
  const [keh, setKeh] = useState<Kehadiran>({ sesi: [], hadir: [] });
  const [level, setLevel] = useState<"merah" | "semua">("merah");
  const [reload, setReload] = useState(0);
  const [ibadah, setIbadah] = useState<IbadahSession | null>(null);
  const [gdgSesi, setGdgSesi] = useState<GdgSession[]>([]);

  useEffect(() => {
    const sb = createClient();
    const today = isoDate(new Date());
    Promise.all([
      sb.rpc("ensure_gdg_sessions", { p_bulan: firstOfMonth() }),
      sb.rpc("ensure_ibadah_sessions", { p_dari: mingguIni(), p_sampai: mingguIni() }),
    ]).then(() => Promise.all([
      sb.from("jemaat").select("*"),
      sb.from("v_absen_ibadah").select("*").gte("absen_beruntun", ABSEN_KUNING).order("absen_beruntun", { ascending: false }),
      sb.from("gdg_groups").select("*"),
      sb.from("activities").select("*").gte("selesai", today).neq("status", "batal").order("mulai").limit(5),
      loadKehadiran(sb, 12),
      sb.from("ibadah_sessions").select("*").eq("tanggal", mingguIni()).maybeSingle(),
      sb.from("gdg_sessions").select("*").eq("bulan", firstOfMonth()),
    ]).then(([j, a, g, ac, k, ib, gs]) => {
      setIbadah(ib.data as IbadahSession | null);
      setGdgSesi((gs.data as GdgSession[]) ?? []);
      setJemaat((j.data as Jemaat[]) ?? []);
      setAbsen((a.data as AbsenRow[]) ?? []);
      setGroups((g.data as GdgGroup[]) ?? []);
      setActs((ac.data as Activity[]) ?? []);
      setKeh(k);
    }));
  }, [reload]);

  const aktif = useMemo(() => (jemaat ?? []).filter((j) => j.status === "aktif"), [jemaat]);
  const baruBulanIni = aktif.filter((j) => j.tanggal_bergabung >= firstOfMonth()).length;
  const review = (jemaat ?? []).filter((j) => j.perlu_review).length;
  const tren = trenKehadiran(keh, false);
  const terakhir = tren.at(-1);
  const sebelumnya = tren.at(-2);
  const rata = tren.length ? Math.round(tren.reduce((s, t) => s + t.value, 0) / tren.length) : 0;
  const ultah = useMemo(() => {
    const m = new Date().getMonth();
    return aktif
      .filter((j) => j.tanggal_lahir && parseDate(j.tanggal_lahir).getMonth() === m)
      .sort((a, b) => parseDate(a.tanggal_lahir!).getDate() - parseDate(b.tanggal_lahir!).getDate());
  }, [aktif]);
  const merah = absen.filter((a) => a.absen_beruntun >= ABSEN_MERAH);
  const daftarAbsen = level === "semua" ? absen : merah;
  const gname = (id: string | null) => groups.find((g) => g.id === id)?.nama;

  // Laporan GDG bulan ini: grup aktif yang sesinya sudah lewat dan sudah disimpan
  const grupAktif = groups.filter((g) => g.is_active);
  const lapor = grupAktif.map((g) => {
    const s = gdgSesi.find((x) => x.group_id === g.id) ?? null;
    return { g, s, sudah: !!s?.disimpan_at };
  });
  const sudahLapor = lapor.filter((x) => x.sudah).length;
  const statusIbadah = !ibadah
    ? null
    : ibadah.status !== "sion"
      ? ibadah.status === "gabung"
        ? "Minggu ini gabung ibadah umum"
        : "Minggu ini libur"
      : ibadah.disimpan_at
        ? `Absensi ibadah sudah disimpan ${ibadah.disimpan_nama ?? ""}`
        : "Absensi ibadah minggu ini belum disimpan";

  if (!jemaat) return <Loading />;

  return (
    <>
      <section className="mb-14 flex flex-col items-center pt-6 text-center sm:pt-12">
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 text-[13px] text-muted backdrop-blur-xl">
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-primary">Shalom</span>
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 className="max-w-[900px] text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[72px] lg:text-[82px]">
          <span className="word-in">Pelayanan</span> <span className="word-in [animation-delay:90ms]">yang</span>{" "}
          <span className="accent-serif word-in [animation-delay:180ms]">bertumbuh</span>
          <br />
          <span className="word-in [animation-delay:270ms]">bersama</span> <span className="word-in [animation-delay:360ms]">jemaat.</span>
        </h1>
        <p className="mt-6 max-w-[520px] text-base leading-relaxed text-muted sm:text-lg">
          Halo {(me.full_name ?? me.username).split(" ")[0]}, ini yang perlu kamu tahu hari ini.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/absensi" className="btn-gold pressable group inline-flex min-h-[54px] items-center gap-3 rounded-full pl-7 pr-2.5 text-[15px] font-bold">
            Isi Absensi Minggu Ini
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-black/10 transition-transform duration-300 [transition-timing-function:var(--spring)] group-hover:-rotate-45">
              <ArrowRight size={16} />
            </span>
          </Link>
          <Link href="/jemaat" className="btn-ghost pressable inline-flex min-h-[54px] items-center gap-2 rounded-full px-6 text-[15px] font-semibold backdrop-blur-xl">
            <UserPlus size={17} /> Data Jemaat
          </Link>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-x-7 gap-y-2 text-[13px] text-muted">
          {statusIbadah && (
            <Link href="/absensi" className="inline-flex items-center gap-2 hover:text-ink">
              {ibadah?.disimpan_at || ibadah?.status !== "sion" ? (
                <CheckCircle2 size={15} className="text-gold" />
              ) : (
                <CircleDashed size={15} className="text-gold" />
              )}
              {statusIbadah}
            </Link>
          )}
          {grupAktif.length > 0 && (
            <Link href="/gdg" className="inline-flex items-center gap-2 hover:text-ink">
              <CheckCircle2 size={15} className="text-gold" />
              {sudahLapor} dari {grupAktif.length} GDG sudah lapor
            </Link>
          )}
          {ultah.length > 0 && (
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={15} className="text-gold" />
              {ultah.length} ulang tahun bulan ini
            </span>
          )}
        </div>
      </section>

      {review > 0 && (
        <Link
          href="/jemaat"
          className="glass mx-auto mb-6 flex w-fit max-w-full items-center gap-3 rounded-full py-1.5 pl-1.5 pr-5 text-sm text-muted hover:text-ink"
        >
          <span className="s-chip gold">{review} perlu review</span>
          Data jemaat baru dari form / usher belum dicek pengurus
          <ArrowRight size={14} />
        </Link>
      )}

      <section className="glass s-stats" aria-label="Ringkasan angka">
        <div className="s-stat">
          <div className="l">Jemaat aktif</div>
          <div className="n">
            <CountUp value={aktif.length} />
          </div>
          <div className="s">{jemaat.length - aktif.length} nonaktif</div>
        </div>
        <div className="s-stat">
          <div className="l">Hadir ibadah terakhir</div>
          <div className="n">{terakhir ? <CountUp value={terakhir.value} /> : "—"}</div>
          <div className="s text-primary">
            {terakhir && sebelumnya
              ? `${terakhir.value >= sebelumnya.value ? "↑" : "↓"} ${Math.abs(terakhir.value - sebelumnya.value)} dari minggu sebelumnya`
              : (terakhir?.name ?? "belum ada data")}
          </div>
        </div>
        <div className="s-stat">
          <div className="l">Jemaat baru bulan ini</div>
          <div className="n">
            <CountUp value={baruBulanIni} />
          </div>
          <div className="s">sejak {fmtDate(firstOfMonth(), { year: undefined })}</div>
        </div>
        <div className="s-stat">
          <div className="l">Perlu disapa</div>
          <div className="n">
            <CountUp value={merah.length} />
          </div>
          <div className="s">absen {ABSEN_MERAH}+ minggu</div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3" aria-label="Sorotan">
        {/* Kehadiran */}
        <article data-tilt className="glass s-card group">
          <div className="flex items-center gap-3.5">
            <span className="s-ico">
              <TrendingUp size={20} />
            </span>
            <h2 className="text-[17px] font-bold">Kehadiran ibadah</h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">{tren.length} ibadah Sion terakhir.</p>
          <div className="mt-9">
            <TrendArea data={tren} />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted">Rata-rata {rata} / minggu</span>
            <More href="/analisis">Analisis</More>
          </div>
        </article>

        {/* Perlu disapa */}
        <article data-tilt className="glass s-card group">
          <div className="flex items-center gap-3.5">
            <span className="s-ico">
              <Heart size={20} />
            </span>
            <h2 className="text-[17px] font-bold">Perlu disapa</h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Absen {ABSEN_MERAH} minggu atau lebih. Satu sapaan sering cukup.
          </p>
          <svg className="s-orbit mt-2" viewBox="0 0 240 208" width="100%" height="200" role="img" aria-label={`${merah.length} jemaat perlu disapa`}>
            <circle className="ring" cx="120" cy="104" r="44" />
            <circle className="ring hi" cx="120" cy="104" r="72" />
            <circle className="ring" cx="120" cy="104" r="98" />
            <g className="spin">
              <circle className="sat" cx="192" cy="104" r="4" />
              <circle className="sat" cx="48" cy="104" r="3" />
              <circle className="sat" cx="120" cy="32" r="2.5" />
            </g>
            <g className="spin rev">
              <circle className="sat" cx="120" cy="202" r="3.5" />
              <circle className="sat" cx="51" cy="70" r="2.5" />
              <circle cx="189" cy="140" r="3" fill="#99A7BD" />
            </g>
            <g className="core">
              <rect x="96" y="80" width="48" height="48" rx="15" fill="rgba(198,161,91,0.18)" stroke="rgba(227,198,138,0.7)" />
              <text x="120" y="112" textAnchor="middle" fontWeight="800" fontSize="22" fill="var(--primary)">
                {merah.length}
              </text>
            </g>
          </svg>
          <div className="mt-1 flex items-center justify-between">
            <div className="s-stack">
              {merah.slice(0, 3).map((a, i) => (
                <Av key={a.id} nama={a.nama} i={i} />
              ))}
              {merah.length > 3 && <span className="s-av" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>+{merah.length - 3}</span>}
            </div>
            <More href="#disapa">Lihat daftar</More>
          </div>
        </article>

        {/* Laporan GDG */}
        <article data-tilt className="glass s-card group">
          <div className="flex items-center gap-3.5">
            <span className="s-ico">
              <Network size={20} />
            </span>
            <h2 className="text-[17px] font-bold">Laporan GDG</h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">Absensi GDG bulan ini dari tiap grup, terkumpul di satu tempat.</p>
          <div className="relative mt-2 h-[200px]">
            <svg viewBox="0 0 300 200" width="100%" height="200" preserveAspectRatio="none" aria-hidden className="absolute inset-0">
              {[24, 74, 126, 176].map((y, i) => (
                <path key={y} className="s-flow" d={`M44 ${y} C 130 ${y}, 130 100, 200 100`} style={{ animationDelay: `${-i * 0.4}s` }} />
              ))}
            </svg>
            <div className="absolute left-0 top-0 flex h-[200px] flex-col justify-between">
              {lapor.slice(0, 4).map(({ g, sudah }) => (
                <span key={g.id} className="s-node" data-on={sudah || undefined} title={`${g.nama}: ${sudah ? "sudah lapor" : "belum lapor"}`}>
                  {inisial(g.nama.replace(/^GDG\s+/i, ""))}
                </span>
              ))}
            </div>
            <div className="s-hub absolute right-[6%] top-[56px]">
              <span className="text-[22px] font-extrabold leading-none text-primary">{sudahLapor}</span>
              <span className="mt-1 text-[11px] font-bold text-muted">dari {grupAktif.length}</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted">{grupAktif.length - sudahLapor} grup belum lapor</span>
            <More href="/gdg">Lihat grup</More>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <div id="disapa" className="scroll-mt-28" />
          <PanelHead
            title="Lama tidak"
            accent="datang"
            sub="Hanya menghitung minggu ibadah Sion. Minggu gabung/libur dilewati."
            action={
              <Seg
                small
                label="Batas absen"
                value={level}
                onChange={setLevel}
                options={[
                  { value: "merah", label: `≥ ${ABSEN_MERAH} minggu`, count: merah.length },
                  { value: "semua", label: `≥ ${ABSEN_KUNING} minggu`, count: absen.length },
                ]}
              />
            }
          />
          {daftarAbsen.length === 0 ? (
            <Empty>Tidak ada. Puji Tuhan!</Empty>
          ) : (
            <div className="max-h-[460px] overflow-y-auto px-[14px]">
              {daftarAbsen.map((a, i) => (
                <div key={a.id} className="s-row flex-wrap">
                  <Av nama={a.nama} i={i} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{a.nama}</div>
                    <div className="s-sub">
                      {a.status_akademik}
                      {gname(a.gdg_group_id) && ` · ${gname(a.gdg_group_id)}`} · terakhir hadir{" "}
                      {a.terakhir_hadir ? fmtDate(a.terakhir_hadir) : "belum pernah"}
                    </div>
                    {a.terakhir_followup && <div className="mt-0.5 text-[11px] font-semibold text-primary">✓ disapa {fmtDate(a.terakhir_followup)}</div>}
                  </div>
                  <span className={cn("s-chip", a.absen_beruntun >= ABSEN_MERAH ? "bad" : "gold")}>{a.absen_beruntun}× absen</span>
                  <FollowUpButton jemaat={a} label="Sapa" onLogged={() => setReload((x) => x + 1)} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHead title="Ulang" accent="tahun" sub={`${ultah.length} orang bulan ini`} />
            {ultah.length === 0 ? (
              <Empty>Tidak ada yang ulang tahun bulan ini.</Empty>
            ) : (
              <div className="max-h-[300px] overflow-y-auto px-[14px]">
                {ultah.map((j, i) => {
                  const lewat = isoDate(new Date()).slice(5) > j.tanggal_lahir!.slice(5);
                  return (
                    <div key={j.id} className={cn("s-row", lewat && "opacity-50")}>
                      <Av nama={j.nama} i={i} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{j.nama}</div>
                        <div className="s-sub">
                          {fmtDate(j.tanggal_lahir, { year: undefined })} · {(umur(j.tanggal_lahir) ?? 0) + (lewat ? 0 : 1)} tahun
                        </div>
                      </div>
                      <FollowUpButton jemaat={j} label="Ucapkan" pesan={pesanUltah(j.nama)} />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHead title="Agenda" accent="mendatang" action={<More href="/kalender">Kalender</More>} />
            {acts.length === 0 ? (
              <Empty>Belum ada kegiatan terjadwal.</Empty>
            ) : (
              <div className="px-[14px]">
                {acts.map((a) => {
                  const d = parseDate(a.mulai);
                  const hariIni = a.mulai <= isoDate(new Date());
                  return (
                    <div key={a.id} className="s-row">
                      <div className="s-datebox">
                        <span className="text-[11px] font-bold uppercase text-muted">
                          {d.toLocaleDateString("id-ID", { weekday: "short" })}
                        </span>
                        <span className="text-xl font-extrabold">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{a.nama}</div>
                        <div className="s-sub">
                          {a.selesai !== a.mulai ? `s.d. ${fmtDate(a.selesai, { year: undefined })}` : fmtDate(a.mulai, { year: undefined })}
                          {a.pic && ` · PIC ${a.pic}`}
                        </div>
                      </div>
                      {hariIni && (
                        <span className="s-chip gold">
                          <i className="s-live" />
                          Berjalan
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </section>
    </>
  );
}
