"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GdgGroup, Jemaat, Pelayanan } from "@/lib/types";
import { fmtDate, hpTampil, jenjang, umur } from "@/lib/utils";
import { FollowUpButton } from "./followup";
import { Badge, Modal } from "./ui";

type Followup = { id: number; oleh_nama: string | null; hasil: string | null; created_at: string };
type History = { id: number; dari_group: string | null; ke_group: string | null; alasan: string | null; created_at: string };

export function JemaatDetail({
  jemaat: j,
  groups,
  onClose,
}: {
  jemaat: Jemaat | null;
  groups: GdgGroup[];
  onClose: () => void;
}) {
  const [pel, setPel] = useState<Pelayanan[]>([]);
  const [fu, setFu] = useState<Followup[]>([]);
  const [hist, setHist] = useState<History[]>([]);
  const [hadir, setHadir] = useState<{ ibadah: number; gdg: number }>({ ibadah: 0, gdg: 0 });
  const [diajak, setDiajak] = useState<string[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!j) return;
    const sb = createClient();
    Promise.all([
      sb.from("jemaat_pelayanan").select("*").eq("jemaat_id", j.id),
      sb.from("followups").select("*").eq("jemaat_id", j.id).order("created_at", { ascending: false }).limit(10),
      sb.from("gdg_history").select("*").eq("jemaat_id", j.id).order("created_at", { ascending: false }),
      sb.from("ibadah_attendance").select("session_id", { count: "exact", head: true }).eq("jemaat_id", j.id),
      sb.from("gdg_attendance").select("session_id", { count: "exact", head: true }).eq("jemaat_id", j.id),
      sb.from("jemaat").select("nama").ilike("diajak_oleh_nama", `%${j.nama.split(" ")[0]}%`),
    ]).then(([p, f, h, ai, ag, d]) => {
      setPel((p.data as Pelayanan[]) ?? []);
      setFu((f.data as Followup[]) ?? []);
      setHist((h.data as History[]) ?? []);
      setHadir({ ibadah: ai.count ?? 0, gdg: ag.count ?? 0 });
      setDiajak(((d.data as { nama: string }[]) ?? []).map((x) => x.nama));
    });
  }, [j, reload]);

  const gname = (id: string | null) => groups.find((g) => g.id === id)?.nama ?? "-";
  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v || "-"}</span>
    </div>
  );

  return (
    <Modal open={!!j} onClose={onClose} title={j?.nama ?? ""} wide>
      {j && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge color={j.status === "aktif" ? "green" : "red"}>{j.status}</Badge>
              <Badge color="blue">{jenjang(j)}</Badge>
              {j.perlu_review && <Badge color="yellow">Perlu review</Badge>}
            </div>
            {row("Umur", umur(j.tanggal_lahir) != null ? `${umur(j.tanggal_lahir)} tahun` : null)}
            {row("Tanggal lahir", fmtDate(j.tanggal_lahir))}
            {row("No. WA", hpTampil(j.no_hp))}
            {row("No. WA ortu", j.no_hp_ortu ? hpTampil(j.no_hp_ortu) : null)}
            {row("Alamat", [j.alamat, j.kecamatan].filter(Boolean).join(", "))}
            {row("Sekolah / kampus / kerja", j.institusi)}
            {j.status_akademik === "Kuliah" && row("Lokasi kuliah", [j.lokasi_studi, j.kota_studi].filter(Boolean).join(" · "))}
            {row("Grup GDG", `${gname(j.gdg_group_id)}${j.gdg_manual ? " (manual)" : ""}`)}
            {row("Bergabung", fmtDate(j.tanggal_bergabung))}
            {row("Kenal dari", j.sumber_info)}
            {row("Diajak oleh", j.diajak_oleh_nama)}
            {j.status === "nonaktif" && row("Nonaktif", `${j.alasan_nonaktif ?? ""} (${fmtDate(j.tanggal_nonaktif)})`)}
            {j.catatan && row("Catatan", j.catatan)}
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-tint/[0.035] p-3">
                <div className="text-xs text-muted">Hadir ibadah</div>
                <div className="text-2xl font-semibold tracking-tight tabular-nums">{hadir.ibadah}×</div>
              </div>
              <div className="rounded-xl bg-tint/[0.035] p-3">
                <div className="text-xs text-muted">Hadir GDG</div>
                <div className="text-2xl font-semibold tracking-tight tabular-nums">{hadir.gdg}×</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Hobi</div>
              <div className="flex flex-wrap gap-1.5">
                {j.hobi.length ? j.hobi.map((h) => <Badge key={h}>{h}</Badge>) : <span className="text-sm text-faint">-</span>}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Pelayanan</div>
              <div className="flex flex-wrap gap-1.5">
                {pel.length ? (
                  pel.map((p) => (
                    <Badge key={p.bidang} color={p.level === "bisa" ? "green" : "yellow"}>
                      {p.bidang} · {p.level === "bisa" ? "bisa" : "mau belajar"}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-faint">-</span>
                )}
              </div>
            </div>
            {diajak.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Mungkin pernah mengajak
                </div>
                <div className="text-sm">{diajak.join(", ")}</div>
              </div>
            )}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">Follow-up</span>
                <FollowUpButton jemaat={j} onLogged={() => setReload((x) => x + 1)} />
              </div>
              {fu.length ? (
                <ul className="space-y-1.5 text-sm">
                  {fu.map((f) => (
                    <li key={f.id} className="rounded-lg bg-tint/[0.035] px-3 py-2">
                      <span className="text-muted">{fmtDate(f.created_at)} · {f.oleh_nama}</span>
                      {f.hasil && <div>{f.hasil}</div>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-faint">Belum pernah di-follow up.</p>
              )}
            </div>
            {hist.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Riwayat GDG</div>
                <ul className="space-y-1 text-sm">
                  {hist.map((h) => (
                    <li key={h.id} className="text-muted">
                      {fmtDate(h.created_at)}: {h.dari_group ? `${gname(h.dari_group)} → ` : ""}
                      <span className="text-ink">{gname(h.ke_group)}</span> · {h.alasan}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
