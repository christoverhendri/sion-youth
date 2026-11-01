"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pencil, RotateCcw, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FollowUpButton } from "@/components/followup";
import { GroupModal } from "@/components/group-modal";
import { Badge, Button, Card, CardTitle, Empty, Field, Loading } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { GdgGroup, GdgSession, Jemaat } from "@/lib/types";
import { addMonths, cn, firstOfMonth, fmtDate, fmtMonth, isoDate, jenjang } from "@/lib/utils";

type Member = Pick<Jemaat, "id" | "nama" | "no_hp" | "no_hp_ortu" | "status_akademik" | "kelas" | "gdg_manual">;
type Stat = { id: string; absen_beruntun: number; total_sesi: number; total_hadir: number; terakhir_hadir: string | null };

function sabtuKedua(bulan: string) {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const first = (6 - d.getDay() + 7) % 7;
  return `${bulan.slice(0, 8)}${String(1 + first + 7).padStart(2, "0")}`;
}

export default function GdgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GdgGroup | null>(null);
  const [groups, setGroups] = useState<GdgGroup[]>([]);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [bulan, setBulan] = useState(firstOfMonth());
  const [sesi, setSesi] = useState<GdgSession | null>(null);
  const [hadir, setHadir] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState(false);

  const loadGroup = useCallback(async () => {
    const sb = createClient();
    const [g, all, m, st] = await Promise.all([
      sb.from("gdg_groups").select("*").eq("id", id).single(),
      sb.from("gdg_groups").select("*").eq("is_active", true).order("nama"),
      sb
        .from("jemaat")
        .select("id, nama, no_hp, no_hp_ortu, status_akademik, kelas, gdg_manual")
        .eq("status", "aktif")
        .eq("gdg_group_id", id)
        .order("nama"),
      sb.from("v_absen_gdg").select("id, absen_beruntun, total_sesi, total_hadir, terakhir_hadir").eq("gdg_group_id", id),
    ]);
    setGroup(g.data as GdgGroup);
    setGroups((all.data as GdgGroup[]) ?? []);
    setMembers((m.data as Member[]) ?? []);
    setStats(Object.fromEntries(((st.data as Stat[]) ?? []).map((s) => [s.id, s])));
  }, [id]);

  const loadSesi = useCallback(async () => {
    const sb = createClient();
    await sb.rpc("ensure_gdg_sessions", { p_bulan: bulan });
    const { data: s } = await sb.from("gdg_sessions").select("*").eq("group_id", id).eq("bulan", bulan).maybeSingle();
    setSesi(s as GdgSession | null);
    if (s) {
      const { data } = await sb.from("gdg_attendance").select("jemaat_id").eq("session_id", s.id);
      setHadir(new Set(((data as { jemaat_id: string }[]) ?? []).map((a) => a.jemaat_id)));
    } else setHadir(new Set());
  }, [id, bulan]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);
  useEffect(() => {
    loadSesi();
  }, [loadSesi]);

  async function toggle(jid: string) {
    if (!sesi) return;
    const sb = createClient();
    const on = hadir.has(jid);
    const next = new Set(hadir);
    if (on) next.delete(jid);
    else next.add(jid);
    setHadir(next);
    if (on) await sb.from("gdg_attendance").delete().eq("session_id", sesi.id).eq("jemaat_id", jid);
    else await sb.from("gdg_attendance").insert({ session_id: sesi.id, jemaat_id: jid });
    loadGroup();
  }

  async function updateSesi(patch: Partial<GdgSession>) {
    if (!sesi) return;
    setSesi({ ...sesi, ...patch });
    await createClient().from("gdg_sessions").update(patch).eq("id", sesi.id);
  }

  async function pindah(jid: string, to: string) {
    await createClient().from("jemaat").update({ gdg_group_id: to, gdg_manual: true }).eq("id", jid);
    loadGroup();
  }

  async function toggleActive() {
    if (!group) return;
    await createClient().from("gdg_groups").update({ is_active: !group.is_active }).eq("id", group.id);
    loadGroup();
  }

  if (!group || !members) return <Loading />;
  const defaultTgl = sabtuKedua(bulan);
  const isPast = sesi && sesi.tanggal <= isoDate(new Date());

  return (
    <>
      <Link href="/gdg" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> Semua grup
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{group.nama}</h1>
            <Badge color="blue">{group.target_kategori}</Badge>
            {!group.is_active && <Badge color="red">nonaktif</Badge>}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <UserRound size={14} /> Leader: {group.leader_name} · {members.length} anggota aktif
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setEdit(true)}>
            <Pencil size={15} /> Edit grup
          </Button>
          <Button variant={group.is_active ? "danger" : "success"} onClick={toggleActive}>
            {group.is_active ? "Nonaktifkan grup" : "Aktifkan grup"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle
            sub="Default Sabtu minggu ke-2. Bisa diubah kalau hasil diskusi pindah hari."
            action={
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setBulan(addMonths(bulan, -1))}>
                  <ChevronLeft size={16} />
                </button>
                <button className="rounded-lg p-1.5 hover:bg-white/10" onClick={() => setBulan(addMonths(bulan, 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
            }
          >
            Jadwal {fmtMonth(bulan)}
          </CardTitle>
          {!sesi ? (
            <Empty>Grup nonaktif tidak punya jadwal.</Empty>
          ) : (
            <div className="space-y-4">
              <div
                className={cn(
                  "rounded-xl border p-4",
                  sesi.status === "batal" ? "border-danger/30 bg-danger/5" : "border-primary/30 bg-primary/5",
                )}
              >
                <div className="text-xs text-muted">{sesi.status === "batal" ? "Dibatalkan" : "Tanggal GDG"}</div>
                <div className={cn("text-lg font-semibold", sesi.status === "batal" && "line-through opacity-60")}>
                  {fmtDate(sesi.tanggal, { weekday: "long", month: "long" })}
                </div>
                {sesi.tanggal !== defaultTgl && (
                  <div className="mt-1 text-xs text-warning">Diubah dari jadwal default ({fmtDate(defaultTgl)})</div>
                )}
              </div>
              <Field label="Ubah tanggal">
                <input
                  type="date"
                  className="field"
                  value={sesi.tanggal}
                  min={bulan}
                  onChange={(e) => e.target.value && updateSesi({ tanggal: e.target.value })}
                />
              </Field>
              <Field label="Catatan">
                <input
                  key={sesi.id}
                  className="field"
                  placeholder="Mis. pindah karena ujian sekolah"
                  defaultValue={sesi.catatan ?? ""}
                  onBlur={(e) => updateSesi({ catatan: e.target.value || null })}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                {sesi.tanggal !== defaultTgl && (
                  <Button size="sm" onClick={() => updateSesi({ tanggal: defaultTgl })}>
                    <RotateCcw size={13} /> Kembalikan ke Sabtu ke-2
                  </Button>
                )}
                {sesi.status === "batal" ? (
                  <Button size="sm" variant="success" onClick={() => updateSesi({ status: "terjadwal" })}>
                    Jadwalkan lagi
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => updateSesi({ status: "batal" })}>
                    Batalkan bulan ini
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle
            sub={
              sesi?.status === "batal"
                ? "GDG bulan ini batal, tidak ada absensi."
                : isPast
                  ? "Centang anggota yang hadir."
                  : "Bisa dicentang saat hari H."
            }
            action={sesi && <Badge color="green">{hadir.size} hadir</Badge>}
          >
            Absensi GDG
          </CardTitle>
          {members.length === 0 ? (
            <Empty>Belum ada anggota.</Empty>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((m) => {
                const on = hadir.has(m.id);
                return (
                  <button
                    key={m.id}
                    disabled={!sesi || sesi.status === "batal"}
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-40",
                      on ? "border-success/40 bg-success/10" : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 place-items-center rounded-md border",
                        on ? "border-success bg-success text-[#052e1f]" : "border-line-strong",
                      )}
                    >
                      {on && <Check size={13} strokeWidth={3} />}
                    </span>
                    {m.nama}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-0">
        <div className="p-5 pb-0">
          <CardTitle sub="Dihitung dari sesi GDG grup ini yang sudah lewat. Pindah grup = otomatis jadi manual.">
            Anggota & kehadiran
          </CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-5 py-3 font-medium">Jenjang</th>
                <th className="px-5 py-3 font-medium">Kehadiran</th>
                <th className="px-5 py-3 font-medium">Absen beruntun</th>
                <th className="px-5 py-3 font-medium">Pindah ke</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const s = stats[m.id];
                const pct = s && s.total_sesi ? Math.round((s.total_hadir / s.total_sesi) * 100) : null;
                return (
                  <tr key={m.id} className="border-t border-line">
                    <td className="px-5 py-3 font-medium">
                      {m.nama}
                      {m.gdg_manual && <span className="ml-2 text-xs text-faint">manual</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">{jenjang(m)}</td>
                    <td className="px-5 py-3 text-muted">
                      {pct == null ? "-" : `${pct}% (${s!.total_hadir}/${s!.total_sesi})`}
                    </td>
                    <td className="px-5 py-3">
                      {s && s.absen_beruntun >= 2 ? (
                        <Badge color={s.absen_beruntun >= 3 ? "red" : "yellow"}>{s.absen_beruntun}× berturut</Badge>
                      ) : (
                        <span className="text-faint">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        className="field w-auto py-1.5 text-xs"
                        value={group.id}
                        onChange={(e) => pindah(m.id, e.target.value)}
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama} ({g.target_kategori})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <FollowUpButton jemaat={m} label="WA" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <GroupModal value={edit ? group : null} onClose={() => setEdit(false)} onSaved={loadGroup} />
    </>
  );
}
