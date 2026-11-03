"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupModal } from "@/components/group-modal";
import { useMe } from "@/components/role";
import { Av, More, Panel, PanelHead, Seg } from "@/components/sion";
import { Button, Empty, Loading, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { labelGrup, type GdgGroup, type GdgSession, type Jemaat } from "@/lib/types";
import { cn, firstOfMonth, fmtDate } from "@/lib/utils";

type Member = Pick<Jemaat, "id" | "nama" | "status_akademik" | "gdg_group_id">;

export default function GdgPage() {
  const me = useMe();
  const pengurus = me.role === "pengurus";
  const [groups, setGroups] = useState<GdgGroup[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<GdgSession[]>([]);
  const [hadir, setHadir] = useState<Record<string, number>>({});
  const [add, setAdd] = useState<GdgGroup | "new" | null>(null);
  const bulan = firstOfMonth();

  const load = useCallback(async () => {
    const sb = createClient();
    await sb.rpc("ensure_gdg_sessions", { p_bulan: bulan });
    const [g, m, s] = await Promise.all([
      sb.from("gdg_groups").select("*").order("nama"),
      sb.from("jemaat").select("id, nama, status_akademik, gdg_group_id").eq("status", "aktif"),
      sb.from("gdg_sessions").select("*").eq("bulan", bulan),
    ]);
    const ss = (s.data as GdgSession[]) ?? [];
    const att = ss.length
      ? await sb.from("gdg_attendance").select("session_id").in("session_id", ss.map((x) => x.id))
      : { data: [] };
    const h: Record<string, number> = {};
    for (const a of (att.data as { session_id: string }[]) ?? []) h[a.session_id] = (h[a.session_id] ?? 0) + 1;
    setGroups((g.data as GdgGroup[]) ?? []);
    setMembers((m.data as Member[]) ?? []);
    setSessions(ss);
    setHadir(h);
  }, [bulan]);

  useEffect(() => {
    load();
  }, [load]);

  const tanpaGrup = useMemo(() => members.filter((m) => !m.gdg_group_id), [members]);

  const [filter, setFilter] = useState<"aktif" | "nonaktif" | "semua">("aktif");
  const tampil = (groups ?? []).filter((g) => filter === "semua" || (filter === "aktif") === g.is_active);
  const totalAnggota = members.filter((m) => m.gdg_group_id).length;
  const lapor = sessions.filter((s) => s.disimpan_at).length;

  return (
    <>
      <PageHeader
        eyebrow="Grup GDG"
        title="Kecil, tapi dekat."
        sub={
          groups
            ? `${groups.filter((g) => g.is_active).length} grup aktif · ${totalAnggota} anggota · ${lapor} sudah lapor bulan ini`
            : "Kelompok kecil, Sabtu minggu ke-2 tiap bulan."
        }
        action={
          <>
            <Seg
              label="Filter grup"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "aktif", label: "Aktif" },
                { value: "nonaktif", label: "Nonaktif" },
                { value: "semua", label: "Semua" },
              ]}
            />
            {pengurus && (
              <Button variant="primary" onClick={() => setAdd("new")} className="min-h-[46px] px-6">
                <Plus size={16} /> Grup baru
              </Button>
            )}
          </>
        }
      />

      {pengurus && tanpaGrup.length > 0 && (
        <Panel className="mb-6">
          <PanelHead
            title={`${tanpaGrup.length} jemaat`}
            accent="belum punya grup"
            sub="Biasanya karena jenis kelamin belum diisi, atau belum ada grup untuk jenjangnya. Lengkapi datanya di Data Jemaat dan mereka otomatis masuk grup."
            action={<More href="/jemaat">Data Jemaat</More>}
          />
          <div className="flex flex-wrap gap-2">
            {tanpaGrup.slice(0, 20).map((m) => (
              <span key={m.id} className="s-tag !h-9">
                {m.nama} <b>{m.status_akademik}</b>
              </span>
            ))}
            {tanpaGrup.length > 20 && <span className="s-tag !h-9">+{tanpaGrup.length - 20} lagi</span>}
          </div>
        </Panel>
      )}

      {!groups ? (
        <Loading />
      ) : tampil.length === 0 ? (
        <Empty>{groups.length === 0 ? 'Belum ada grup. Klik "Grup baru" untuk membuat grup GDG pertama.' : "Tidak ada grup di filter ini."}</Empty>
      ) : (
        <div className="stagger grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tampil.map((g, i) => {
            const n = members.filter((m) => m.gdg_group_id === g.id).length;
            const s = sessions.find((x) => x.group_id === g.id);
            const nama = g.nama.replace(/^GDG\s+/i, "");
            const status = !s
              ? null
              : s.status === "batal"
                ? { t: "Batal", c: "s-chip bad" }
                : s.disimpan_at
                  ? { t: `Tersimpan · ${hadir[s.id] ?? 0} hadir`, c: "s-chip gold" }
                  : { t: fmtDate(s.tanggal, { weekday: "short", year: undefined }), c: "s-chip" };
            return (
              <Link key={g.id} href={`/gdg/${g.id}`} className={cn("glass s-gcard s-lift", !g.is_active && "opacity-70")}>
                <span className="glow" aria-hidden />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="eyebrow !text-[11px]">{labelGrup(g)}</div>
                    <div className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em]">
                      GDG <span className="accent-serif">{nama}</span>
                    </div>
                  </div>
                  <span className="go shrink-0" aria-hidden>
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </span>
                </div>

                <div className="relative mt-[22px] flex items-center gap-3">
                  <Av nama={g.leader_name} i={i} size={38} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{g.leader_name}</div>
                    <div className="text-xs text-muted">Leader{!g.is_active && " · nonaktif"}</div>
                  </div>
                </div>

                <div className="relative mt-6 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-muted">Pertemuan bulan ini</div>
                    <div className="mt-2">{status ? <span className={status.c}>{status.t}</span> : <span className="s-chip">Belum dijadwalkan</span>}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[28px] font-extrabold leading-none tracking-[-0.03em] tabular-nums">{n}</div>
                    <div className="text-xs text-muted">anggota aktif</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <GroupModal value={add} onClose={() => setAdd(null)} onSaved={load} />
    </>
  );
}
