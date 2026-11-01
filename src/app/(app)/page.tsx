"use client";

import { AlertTriangle, CakeSlice, CalendarDays, ClipboardCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TrendArea } from "@/components/charts";
import { FollowUpButton } from "@/components/followup";
import { useMe } from "@/components/role";
import { Badge, Card, CardTitle, Empty, Loading, Stat } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { loadKehadiran, trenKehadiran, type Kehadiran } from "@/lib/data";
import type { AbsenRow, Activity, GdgGroup, Jemaat } from "@/lib/types";
import {
  ABSEN_KUNING,
  ABSEN_MERAH,
  cn,
  firstOfMonth,
  fmtDate,
  isoDate,
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

  useEffect(() => {
    const sb = createClient();
    const today = isoDate(new Date());
    Promise.all([
      sb.from("jemaat").select("*"),
      sb.from("v_absen_ibadah").select("*").gte("absen_beruntun", ABSEN_KUNING).order("absen_beruntun", { ascending: false }),
      sb.from("gdg_groups").select("*"),
      sb.from("activities").select("*").gte("selesai", today).neq("status", "batal").order("mulai").limit(5),
      loadKehadiran(sb, 12),
    ]).then(([j, a, g, ac, k]) => {
      setJemaat((j.data as Jemaat[]) ?? []);
      setAbsen((a.data as AbsenRow[]) ?? []);
      setGroups((g.data as GdgGroup[]) ?? []);
      setActs((ac.data as Activity[]) ?? []);
      setKeh(k);
    });
  }, [reload]);

  const aktif = useMemo(() => (jemaat ?? []).filter((j) => j.status === "aktif"), [jemaat]);
  const baruBulanIni = aktif.filter((j) => j.tanggal_bergabung >= firstOfMonth()).length;
  const review = (jemaat ?? []).filter((j) => j.perlu_review).length;
  const tren = trenKehadiran(keh, false);
  const terakhir = tren.at(-1);
  const sebelumnya = tren.at(-2);
  const ultah = useMemo(() => {
    const m = new Date().getMonth();
    return aktif
      .filter((j) => j.tanggal_lahir && parseDate(j.tanggal_lahir).getMonth() === m)
      .sort((a, b) => parseDate(a.tanggal_lahir!).getDate() - parseDate(b.tanggal_lahir!).getDate());
  }, [aktif]);
  const daftarAbsen = absen.filter((a) => level === "semua" || a.absen_beruntun >= ABSEN_MERAH);
  const gname = (id: string | null) => groups.find((g) => g.id === id)?.nama;

  if (!jemaat) return <Loading />;

  return (
    <>
      <div className="mb-6">
        <p className="text-sm text-muted">Shalom, {me.full_name ?? me.username} 👋</p>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Sion Youth</h1>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Jemaat aktif" value={aktif.length} icon={<Users size={16} />} sub={`${jemaat.length - aktif.length} nonaktif`} />
        <Stat
          label="Hadir ibadah terakhir"
          value={terakhir?.value ?? "-"}
          icon={<ClipboardCheck size={16} />}
          sub={
            terakhir && sebelumnya ? (
              <span className={terakhir.value >= sebelumnya.value ? "text-success" : "text-danger"}>
                {terakhir.value >= sebelumnya.value ? "▲" : "▼"} {Math.abs(terakhir.value - sebelumnya.value)} dari minggu
                sebelumnya
              </span>
            ) : (
              terakhir?.name
            )
          }
        />
        <Stat label="Jemaat baru bulan ini" value={baruBulanIni} icon={<UserPlus size={16} />} />
        <Stat
          label="Perlu di-follow up"
          value={absen.filter((a) => a.absen_beruntun >= ABSEN_MERAH).length}
          icon={<AlertTriangle size={16} />}
          sub={`absen ${ABSEN_MERAH}× berturut-turut atau lebih`}
        />
      </div>

      {review > 0 && (
        <Link href="/jemaat" className="mb-5 block">
          <Card className="flex items-center gap-3 border-warning/30 py-3 text-sm hover:bg-white/[0.05]">
            <Badge color="yellow">{review}</Badge>
            Data jemaat baru dari form / usher belum dicek pengurus. Buka Data Jemaat → &quot;Perlu review&quot;.
          </Card>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle
            sub="Hanya menghitung minggu ibadah Sion. Minggu gabung/libur dilewati."
            action={
              <div className="flex rounded-lg border border-line bg-surface p-0.5 text-xs">
                {(["merah", "semua"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "rounded-md px-2.5 py-1",
                      level === l ? "bg-white/10 text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {l === "merah" ? `≥ ${ABSEN_MERAH} minggu` : `≥ ${ABSEN_KUNING} minggu`}
                  </button>
                ))}
              </div>
            }
          >
            🔔 Lama tidak datang
          </CardTitle>
          {daftarAbsen.length === 0 ? (
            <Empty>Tidak ada. Puji Tuhan! 🙌</Empty>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {daftarAbsen.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                      a.absen_beruntun >= ABSEN_MERAH ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning",
                    )}
                  >
                    {a.absen_beruntun}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.nama}</div>
                    <div className="text-xs text-muted">
                      {a.status_akademik}
                      {gname(a.gdg_group_id) && ` · ${gname(a.gdg_group_id)}`} · terakhir hadir{" "}
                      {a.terakhir_hadir ? fmtDate(a.terakhir_hadir) : "belum pernah"}
                    </div>
                    {a.terakhir_followup && (
                      <div className="text-[11px] text-success">✓ di-follow up {fmtDate(a.terakhir_followup)}</div>
                    )}
                  </div>
                  <FollowUpButton jemaat={a} onLogged={() => setReload((x) => x + 1)} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardTitle sub="Kirim ucapan lewat WhatsApp">
              <span className="inline-flex items-center gap-2">
                <CakeSlice size={16} className="text-[#d55181]" /> Ulang tahun bulan ini
              </span>
            </CardTitle>
            {ultah.length === 0 ? (
              <Empty>Tidak ada yang ulang tahun bulan ini.</Empty>
            ) : (
              <ul className="space-y-2">
                {ultah.map((j) => {
                  const lewat = isoDate(new Date()).slice(5) > j.tanggal_lahir!.slice(5);
                  return (
                    <li key={j.id} className={cn("flex items-center gap-3 text-sm", lewat && "opacity-50")}>
                      <span className="w-14 text-xs text-muted">{fmtDate(j.tanggal_lahir, { year: undefined })}</span>
                      <span className="flex-1 truncate">
                        {j.nama} <span className="text-faint">({(umur(j.tanggal_lahir) ?? 0) + (lewat ? 0 : 1)})</span>
                      </span>
                      <FollowUpButton jemaat={j} label="Ucapan" pesan={pesanUltah(j.nama)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitle
              action={
                <Link href="/kalender" className="text-xs text-primary hover:underline">
                  Lihat kalender
                </Link>
              }
            >
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} className="text-primary" /> Kegiatan mendatang
              </span>
            </CardTitle>
            {acts.length === 0 ? (
              <Empty>Belum ada kegiatan terjadwal.</Empty>
            ) : (
              <ul className="space-y-2.5">
                {acts.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="flex-1">
                      <div className="font-medium">{a.nama}</div>
                      <div className="text-xs text-muted">
                        {fmtDate(a.mulai)}
                        {a.selesai !== a.mulai && ` – ${fmtDate(a.selesai)}`}
                        {a.pic && ` · PIC ${a.pic}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="lg:col-span-5">
          <CardTitle sub="Jumlah jemaat terdata yang hadir, 12 ibadah Sion terakhir">Tren kehadiran</CardTitle>
          <TrendArea data={tren} />
        </Card>
      </div>
    </>
  );
}
