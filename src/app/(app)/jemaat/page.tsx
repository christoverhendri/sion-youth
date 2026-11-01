"use client";

import { Copy, Pencil, Plus, Power, Search, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FollowUpButton } from "@/components/followup";
import { JemaatDetail } from "@/components/jemaat-detail";
import { JemaatEditor, NonaktifModal } from "@/components/jemaat-editor";
import { Badge, Button, Card, Empty, Loading, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { STATUS_AKADEMIK, type GdgGroup, type Jemaat } from "@/lib/types";
import { cn, hpTampil, jenjang, umur } from "@/lib/utils";

export default function JemaatPage() {
  const [rows, setRows] = useState<Jemaat[] | null>(null);
  const [groups, setGroups] = useState<GdgGroup[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"aktif" | "nonaktif" | "review" | "semua">("aktif");
  const [jen, setJen] = useState("");
  const [grp, setGrp] = useState("");
  const [edit, setEdit] = useState<{ open: boolean; j: Jemaat | null }>({ open: false, j: null });
  const [detail, setDetail] = useState<Jemaat | null>(null);
  const [nonaktif, setNonaktif] = useState<Jemaat | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const sb = createClient();
    const [j, g] = await Promise.all([
      sb.from("jemaat").select("*").order("nama"),
      sb.from("gdg_groups").select("*").order("nama"),
    ]);
    setRows((j.data as Jemaat[]) ?? []);
    setGroups((g.data as GdgGroup[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "semua" ||
          (status === "review" ? r.perlu_review : r.status === status)) &&
        (!jen || r.status_akademik === jen) &&
        (!grp || (grp === "none" ? !r.gdg_group_id : r.gdg_group_id === grp)) &&
        (!s ||
          r.nama.toLowerCase().includes(s) ||
          (r.no_hp ?? "").includes(s.replace(/^0/, "62")) ||
          (r.institusi ?? "").toLowerCase().includes(s)),
    );
  }, [rows, q, status, jen, grp]);

  const counts = useMemo(() => {
    const r = rows ?? [];
    return {
      aktif: r.filter((x) => x.status === "aktif").length,
      nonaktif: r.filter((x) => x.status === "nonaktif").length,
      review: r.filter((x) => x.perlu_review).length,
      semua: r.length,
    };
  }, [rows]);

  async function aktifkan(j: Jemaat) {
    await createClient().from("jemaat").update({ status: "aktif" }).eq("id", j.id);
    load();
  }

  function copyForm() {
    navigator.clipboard.writeText(`${window.location.origin}/daftar`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const gname = (id: string | null) => groups.find((g) => g.id === id)?.nama;

  return (
    <>
      <PageHeader
        title="Data Jemaat"
        sub="Data master seluruh jemaat Sion Youth"
        action={
          <>
            <Button onClick={copyForm}>
              <Copy size={16} /> {copied ? "Link tersalin!" : "Salin link form daftar"}
            </Button>
            <Button variant="primary" onClick={() => setEdit({ open: true, j: null })}>
              <Plus size={16} /> Tambah jemaat
            </Button>
          </>
        }
      />

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="flex rounded-xl border border-line bg-surface p-1 text-xs">
            {(["aktif", "nonaktif", "review", "semua"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 capitalize transition",
                  status === s ? "bg-white/10 font-medium text-ink" : "text-muted hover:text-ink",
                )}
              >
                {s === "review" ? "Perlu review" : s} <span className="text-faint">{counts[s]}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              className="field pl-9"
              placeholder="Cari nama, no. HP, sekolah…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="field w-auto" value={jen} onChange={(e) => setJen(e.target.value)}>
            <option value="">Semua jenjang</option>
            {STATUS_AKADEMIK.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="field w-auto" value={grp} onChange={(e) => setGrp(e.target.value)}>
            <option value="">Semua GDG</option>
            <option value="none">Belum ada grup</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama}
              </option>
            ))}
          </select>
        </div>

        {!rows ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <Empty>Tidak ada jemaat yang cocok.</Empty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Jenjang</th>
                  <th className="px-4 py-3 font-medium">Umur</th>
                  <th className="px-4 py-3 font-medium">No. WA</th>
                  <th className="px-4 py-3 font-medium">GDG</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-line transition hover:bg-white/[0.025]">
                    <td className="px-4 py-3">
                      <button onClick={() => setDetail(r)} className="text-left font-medium hover:text-primary">
                        {r.nama}
                      </button>
                      {r.perlu_review && (
                        <span className="ml-2">
                          <Badge color="yellow">review</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{jenjang(r)}</td>
                    <td className="px-4 py-3 text-muted">{umur(r.tanggal_lahir) ?? "-"}</td>
                    <td className="px-4 py-3 text-muted">{hpTampil(r.no_hp ?? r.no_hp_ortu)}</td>
                    <td className="px-4 py-3">
                      {gname(r.gdg_group_id) ? (
                        <span className="text-muted">
                          {gname(r.gdg_group_id)}
                          {r.gdg_manual && <span className="text-faint"> · manual</span>}
                        </span>
                      ) : (
                        <span className="text-faint">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "aktif" ? (
                        <Badge color="green">aktif</Badge>
                      ) : (
                        <span title={r.alasan_nonaktif ?? ""}>
                          <Badge color="red">nonaktif</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "aktif" && <FollowUpButton jemaat={r} label="WA" />}
                        <Button size="sm" onClick={() => setEdit({ open: true, j: r })} title="Edit">
                          <Pencil size={13} />
                        </Button>
                        {r.status === "aktif" ? (
                          <Button size="sm" variant="danger" onClick={() => setNonaktif(r)} title="Nonaktifkan">
                            <Power size={13} />
                          </Button>
                        ) : (
                          <Button size="sm" variant="success" onClick={() => aktifkan(r)} title="Aktifkan lagi">
                            <UserCheck size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <JemaatEditor
        open={edit.open}
        jemaat={edit.j}
        groups={groups}
        onClose={() => setEdit({ open: false, j: null })}
        onSaved={load}
      />
      <NonaktifModal jemaat={nonaktif} onClose={() => setNonaktif(null)} onSaved={load} />
      <JemaatDetail jemaat={detail} groups={groups} onClose={() => setDetail(null)} />
    </>
  );
}
