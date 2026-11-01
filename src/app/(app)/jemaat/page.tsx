"use client";

import { CheckCheck, ClipboardList, Copy, Info, Pencil, Plus, Power, Search, Trash2, UserCheck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FollowUpButton } from "@/components/followup";
import { JemaatDetail } from "@/components/jemaat-detail";
import { HapusModal, JemaatEditor, NonaktifModal } from "@/components/jemaat-editor";
import { Badge, Button, Card, Empty, Loading, PageHeader } from "@/components/ui";
import { fetchAll } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { STATUS_AKADEMIK, type GdgGroup, type Jemaat } from "@/lib/types";
import { cn, hpTampil, jenjang, umur } from "@/lib/utils";

// Kolom yang dicek di panel "Kelengkapan data". punyaPelayanan = id jemaat yang sudah isi minat pelayanan.
const KOSONG: { key: string; label: string; kosong: (j: Jemaat, punyaPelayanan: Set<string>) => boolean }[] = [
  { key: "jk", label: "Jenis kelamin", kosong: (j) => !j.jenis_kelamin },
  { key: "lahir", label: "Tanggal lahir", kosong: (j) => !j.tanggal_lahir },
  { key: "hp", label: "No. WA", kosong: (j) => !j.no_hp },
  {
    key: "ortu",
    label: "WA ortu (SD/SMP)",
    kosong: (j) => (j.status_akademik === "SD" || j.status_akademik === "SMP") && !j.no_hp_ortu,
  },
  { key: "alamat", label: "Alamat", kosong: (j) => !j.alamat },
  { key: "kecamatan", label: "Kecamatan", kosong: (j) => !j.kecamatan },
  { key: "institusi", label: "Sekolah / kampus / kerja", kosong: (j) => !j.institusi },
  { key: "hobi", label: "Hobi", kosong: (j) => !j.hobi?.length },
  { key: "pelayanan", label: "Minat pelayanan", kosong: (j, p) => !p.has(j.id) },
  { key: "sumber", label: "Kenal Sion dari", kosong: (j) => !j.sumber_info },
  { key: "diajak", label: "Diajak oleh", kosong: (j) => !j.diajak_oleh_nama && !j.diajak_oleh },
];

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
  const [hapus, setHapus] = useState<Jemaat | null>(null);
  const [kosong, setKosong] = useState("");
  const [punyaPelayanan, setPunyaPelayanan] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const sb = createClient();
    const [j, g, p] = await Promise.all([
      sb.from("jemaat").select("*").order("nama"),
      sb.from("gdg_groups").select("*").order("nama"),
      fetchAll<{ jemaat_id: string }>((a, b) => sb.from("jemaat_pelayanan").select("jemaat_id").range(a, b)),
    ]);
    setPunyaPelayanan(new Set(p.map((x) => x.jemaat_id)));
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
        (!kosong || KOSONG.find((k) => k.key === kosong)!.kosong(r, punyaPelayanan)) &&
        (!s ||
          r.nama.toLowerCase().includes(s) ||
          (r.no_hp ?? "").includes(s.replace(/^0/, "62")) ||
          (r.institusi ?? "").toLowerCase().includes(s)),
    );
  }, [rows, q, status, jen, grp, kosong, punyaPelayanan]);

  // Hitungan data kosong mengikuti tab status yang sedang dibuka
  const hitungKosong = useMemo(() => {
    const base = (rows ?? []).filter((r) =>
      status === "semua" ? true : status === "review" ? r.perlu_review : r.status === status,
    );
    return {
      total: base.length,
      per: KOSONG.map((k) => ({ ...k, n: base.filter((r) => k.kosong(r, punyaPelayanan)).length })),
    };
  }, [rows, status, punyaPelayanan]);

  const counts = useMemo(() => {
    const r = rows ?? [];
    return {
      aktif: r.filter((x) => x.status === "aktif").length,
      nonaktif: r.filter((x) => x.status === "nonaktif").length,
      review: r.filter((x) => x.perlu_review).length,
      semua: r.length,
    };
  }, [rows]);

  async function sudahDicek(j: Jemaat) {
    await createClient().from("jemaat").update({ perlu_review: false }).eq("id", j.id);
    load();
  }

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

      <Card className="mb-4 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList size={16} className="text-primary" /> Kelengkapan data
            <span className="font-normal text-muted">
              · {hitungKosong.total} jemaat {status === "semua" ? "" : status === "review" ? "perlu review" : status} ·
              klik untuk melihat siapa saja
            </span>
          </div>
          {kosong && (
            <Button size="sm" onClick={() => setKosong("")}>
              <X size={13} /> Hapus filter
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {hitungKosong.per.map((k) => {
            const pct = hitungKosong.total ? k.n / hitungKosong.total : 0;
            return (
              <button
                key={k.key}
                onClick={() => setKosong(kosong === k.key ? "" : k.key)}
                disabled={!k.n}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition",
                  kosong === k.key
                    ? "border-primary bg-primary/15 text-ink"
                    : "border-line bg-surface text-muted hover:text-ink disabled:cursor-default disabled:hover:text-muted",
                )}
              >
                {k.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-semibold",
                    !k.n
                      ? "bg-success/15 text-success"
                      : pct > 0.5
                        ? "bg-danger/15 text-danger"
                        : "bg-warning/15 text-warning",
                  )}
                >
                  {k.n ? k.n + " kosong" : "lengkap"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {status === "review" && (
        <Card className="mb-4 flex gap-3 border-primary/30 py-4 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Apa itu &quot;Perlu review&quot;?</p>
            <p className="mt-1 text-muted">
              Data yang masuk <b>bukan dari pengurus</b>: dari form pendaftaran publik, dari usher lewat tombol
              &quot;Jemaat baru datang&quot;, atau dari import yang datanya belum lengkap. Tolong cek ejaan nama, nomor
              WA, jenjang, <b>jenis kelamin</b> (penting untuk masuk grup GDG), dan apakah orangnya dobel. Kalau sudah
              benar, klik <b>Edit → Simpan</b> atau tombol <CheckCheck size={13} className="inline" /> &quot;Sudah
              dicek&quot;.
            </p>
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="flex rounded-xl border border-line bg-surface p-1 text-xs">
            {(["aktif", "nonaktif", "review", "semua"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-lg px-3 py-1.5 capitalize transition",
                  status === s ? "bg-tint/10 font-medium text-ink" : "text-muted hover:text-ink",
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
                  <tr key={r.id} className="border-t border-line transition hover:bg-tint/[0.025]">
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
                        {r.perlu_review && (
                          <Button size="sm" variant="success" onClick={() => sudahDicek(r)} title="Sudah dicek">
                            <CheckCheck size={13} />
                          </Button>
                        )}
                        {r.status === "aktif" && <FollowUpButton jemaat={r} label="WA" />}
                        <Button size="sm" onClick={() => setEdit({ open: true, j: r })} title="Edit">
                          <Pencil size={13} />
                        </Button>
                        {r.status === "aktif" ? (
                          <Button size="sm" onClick={() => setNonaktif(r)} title="Nonaktifkan">
                            <Power size={13} />
                          </Button>
                        ) : (
                          <Button size="sm" variant="success" onClick={() => aktifkan(r)} title="Aktifkan lagi">
                            <UserCheck size={13} />
                          </Button>
                        )}
                        <Button size="sm" variant="danger" onClick={() => setHapus(r)} title="Hapus permanen">
                          <Trash2 size={13} />
                        </Button>
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
      <HapusModal jemaat={hapus} onClose={() => setHapus(null)} onNonaktif={setNonaktif} onDeleted={load} />
      <JemaatDetail jemaat={detail} groups={groups} onClose={() => setDetail(null)} />
    </>
  );
}
