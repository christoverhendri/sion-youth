"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupModal } from "@/components/group-modal";
import { useMe } from "@/components/role";
import { Badge, Button, Card, Empty, Loading, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { labelGrup, type GdgGroup, type GdgSession, type Jemaat } from "@/lib/types";
import { firstOfMonth, fmtDate } from "@/lib/utils";

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

  return (
    <>
      <PageHeader
        title="Grup GDG"
        sub="Kelompok kecil, Sabtu minggu ke-2 tiap bulan. Jemaat baru otomatis masuk sesuai jenjang & jenis kelamin."
        action={
          pengurus && (
            <Button variant="primary" onClick={() => setAdd("new")}>
              <Plus size={16} /> Grup baru
            </Button>
          )
        }
      />

      {pengurus && tanpaGrup.length > 0 && (
        <Card className="mb-5 border-warning/30">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={18} />
            <div className="text-sm">
              <p className="font-medium">{tanpaGrup.length} jemaat aktif belum punya grup GDG</p>
              <p className="mt-1 text-muted">
                Biasanya karena jenis kelamin belum diisi, atau belum ada grup untuk jenjangnya (mis. SD). Lengkapi
                datanya di Data Jemaat dan mereka otomatis masuk grup.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tanpaGrup.slice(0, 20).map((m) => (
                  <Badge key={m.id}>
                    {m.nama} · {m.status_akademik}
                  </Badge>
                ))}
                {tanpaGrup.length > 20 && <Badge>+{tanpaGrup.length - 20} lagi</Badge>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {!groups ? (
        <Loading />
      ) : groups.length === 0 ? (
        <Empty>Belum ada grup. Klik &quot;Grup baru&quot; untuk membuat grup GDG pertama.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => {
            const n = members.filter((m) => m.gdg_group_id === g.id).length;
            const s = sessions.find((x) => x.group_id === g.id);
            return (
              <Link key={g.id} href={`/gdg/${g.id}`} className="group">
                <Card className="h-full transition group-hover:border-line-strong group-hover:bg-tint/[0.05]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{g.nama}</h3>
                        {!g.is_active && <Badge color="red">nonaktif</Badge>}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                        <UserRound size={14} /> {g.leader_name}
                      </p>
                    </div>
                    <Badge color="blue">{labelGrup(g)}</Badge>
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <div className="text-3xl font-bold">{n}</div>
                      <div className="text-xs text-muted">anggota aktif</div>
                    </div>
                    {s && (
                      <div className="text-right text-xs">
                        <div className="flex items-center justify-end gap-1 text-muted">
                          <CalendarDays size={13} /> Bulan ini
                        </div>
                        <div className="mt-0.5 font-medium">
                          {s.status === "batal" ? (
                            <span className="text-danger">Batal</span>
                          ) : (
                            fmtDate(s.tanggal, { weekday: "short", year: undefined })
                          )}
                        </div>
                        {hadir[s.id] ? <div className="text-success">{hadir[s.id]} hadir</div> : null}
                        {s.disimpan_at && (
                          <div className="mt-0.5 inline-flex items-center gap-1 text-success">
                            <CheckCircle2 size={12} /> tersimpan
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                    Buka grup <ChevronRight size={14} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <GroupModal value={add} onClose={() => setAdd(null)} onSaved={load} />
    </>
  );
}
