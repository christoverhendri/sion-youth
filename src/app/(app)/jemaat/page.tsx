"use client";

import {
  CheckCheck,
  ChevronDown,
  ClipboardList,
  Copy,
  Eye,
  Info,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Rows3,
  Search,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FollowUpButton } from "@/components/followup";
import { JemaatDetail } from "@/components/jemaat-detail";
import { HapusModal, JemaatEditor, NonaktifModal } from "@/components/jemaat-editor";
import { Av, Panel, Seg } from "@/components/sion";
import { Button, Empty, Loading, Modal, PageHeader } from "@/components/ui";
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

// Gaya sel tabel. Sel yang menempel butuh latar solid supaya isi yang di-scroll tidak tembus.




const LATAR = "bg-surface-solid group-hover:bg-[color-mix(in_srgb,var(--surface-solid)_96%,rgb(var(--tint)))]";
const STICKY_KIRI = `sticky left-0 z-10 min-w-[112px] max-w-[200px] sm:min-w-[150px] ${LATAR} shadow-[6px_0_8px_-6px_rgba(0,0,0,0.3)]`;
const STICKY_KANAN = `sticky right-0 z-10 ${LATAR} shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.3)]`;

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
  const [aksi, setAksi] = useState<Jemaat | null>(null);
  const [kosong, setKosong] = useState("");
  const [bukaKosong, setBukaKosong] = useState(false); // di HP panel kelengkapan dilipat dulu
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

  const [tampilan, setTampilan] = useState<"tabel" | "kartu">("tabel");
  const baruBulanIni = (rows ?? []).filter((r) => r.tanggal_bergabung >= new Date().toISOString().slice(0, 8) + "01").length;

  function statusRow(r: Jemaat) {
    if (r.perlu_review) return { t: "Perlu review", c: "text-primary" };
    if (r.status === "aktif") return { t: "Aktif", c: "text-success" };
    return { t: "Nonaktif", c: "text-danger" };
  }

  return (
    <>
      <PageHeader
        eyebrow="Data Jemaat"
        title="Setiap nama, dikenal."
        sub={`${counts.aktif.toLocaleString("id-ID")} jemaat aktif · ${baruBulanIni} baru bulan ini`}
        action={
          <>
            <Button onClick={copyForm} className="min-h-[46px] px-5">
              <Copy size={16} /> {copied ? "Link tersalin!" : "Salin link form daftar"}
            </Button>
            <Button variant="primary" onClick={() => setEdit({ open: true, j: null })} className="min-h-[46px] px-6">
              <Plus size={16} /> Tambah Jemaat
            </Button>
          </>
        }
      />

      <section className="flex flex-wrap items-center gap-3">
        <label className="s-search">
          <Search size={18} className="text-muted" />
          <span className="sr-only">Cari jemaat</span>
          <input placeholder="Cari nama, no. HP, sekolah…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Seg
          label="Filter status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "aktif", label: "Aktif", count: counts.aktif },
            { value: "nonaktif", label: "Nonaktif", count: counts.nonaktif },
            { value: "review", label: "Perlu review", count: counts.review },
            { value: "semua", label: "Semua", count: counts.semua },
          ]}
        />
        <div className="s-seg" role="group" aria-label="Tampilan">
          <button type="button" aria-pressed={tampilan === "tabel"} onClick={() => setTampilan("tabel")} aria-label="Tampilan tabel">
            <Rows3 size={16} />
          </button>
          <button type="button" aria-pressed={tampilan === "kartu"} onClick={() => setTampilan("kartu")} aria-label="Tampilan kartu">
            <LayoutGrid size={16} />
          </button>
        </div>
      </section>

      <section className="mt-3 flex flex-wrap items-center gap-3">
        <Seg
          small
          label="Filter jenjang"
          value={jen}
          onChange={setJen}
          options={[{ value: "", label: "Semua jenjang" }, ...STATUS_AKADEMIK.map((s) => ({ value: s as string, label: s }))]}
        />
        <label className="s-search !h-[46px] !flex-none !px-4">
          <span className="sr-only">Filter GDG</span>
          <select className="bg-transparent text-sm font-semibold outline-none" value={grp} onChange={(e) => setGrp(e.target.value)}>
            <option value="" className="bg-surface-solid">
              Semua GDG
            </option>
            <option value="none" className="bg-surface-solid">
              Belum ada grup
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id} className="bg-surface-solid">
                {g.nama}
              </option>
            ))}
          </select>
        </label>
      </section>

      <Panel className="mt-5 !py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setBukaKosong(!bukaKosong)}
            aria-expanded={bukaKosong}
            className="flex items-center gap-3 text-left md:pointer-events-none"
          >
            <span className="s-ico !h-10 !w-10 !rounded-xl">
              <ClipboardList size={17} />
            </span>
            <span>
              <span className="block font-bold">
                Kelengkapan <span className="accent-serif">data</span>
              </span>
              <span className="s-sub block">
                {hitungKosong.per.filter((k) => k.n).length} kolom belum lengkap · ketuk untuk melihat siapa saja
              </span>
            </span>
            <ChevronDown size={15} className={cn("text-muted transition-transform md:hidden", bukaKosong && "rotate-180")} />
          </button>
          {kosong && (
            <Button size="sm" onClick={() => setKosong("")}>
              <X size={13} /> Hapus filter
            </Button>
          )}
        </div>
        <div className={cn("mt-4 flex-wrap gap-2", bukaKosong ? "flex" : "hidden md:flex")}>
          {hitungKosong.per.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKosong(kosong === k.key ? "" : k.key)}
              disabled={!k.n}
              aria-pressed={kosong === k.key}
              className={cn(
                "s-tag !h-9 !text-[13px] disabled:cursor-default disabled:opacity-50",
                kosong === k.key && "!border-gold !bg-gold/15",
              )}
            >
              {k.label} <b>{k.n ? k.n : "lengkap"}</b>
            </button>
          ))}
        </div>
      </Panel>

      {status === "review" && (
        <Panel className="mt-5 flex gap-4 !py-5">
          <span className="s-ico !h-10 !w-10 !rounded-xl">
            <Info size={17} />
          </span>
          <div className="text-sm">
            <p className="font-bold">Apa itu &quot;Perlu review&quot;?</p>
            <p className="mt-1 text-muted">
              Data yang masuk <b>bukan dari pengurus</b>: dari form pendaftaran publik, dari usher lewat tombol &quot;Jemaat baru
              datang&quot;, atau dari import yang datanya belum lengkap. Cek ejaan nama, nomor WA, jenjang, <b>jenis kelamin</b>{" "}
              (penting untuk masuk grup GDG), dan apakah orangnya dobel. Kalau sudah benar, klik <b>Edit → Simpan</b> atau tombol{" "}
              <CheckCheck size={13} className="inline" /> &quot;Sudah dicek&quot;.
            </p>
          </div>
        </Panel>
      )}

      {!rows ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="mt-5">
          <Empty>Tidak ada jemaat yang cocok.</Empty>
        </div>
      ) : tampilan === "kartu" ? (
        <section className="stagger mt-5 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {filtered.slice(0, 200).map((r, i) => {
            const st = statusRow(r);
            return (
              <article key={r.id} className="glass s-lift cursor-pointer rounded-[26px] p-6" onClick={() => setDetail(r)}>
                <div className="flex items-start justify-between">
                  <Av nama={r.nama} i={i} size={52} />
                  <span className={cn("inline-flex items-center gap-2 text-[13px] font-semibold", st.c)}>
                    <i className="h-2 w-2 rounded-full bg-current" />
                    {st.t}
                  </span>
                </div>
                <div className="mt-5 truncate text-base font-bold">{r.nama}</div>
                <div className="s-sub truncate">
                  {jenjang(r)} · {gname(r.gdg_group_id) ?? "Belum ada grup"}
                </div>
                <div className="mt-[18px] flex items-center justify-between border-t border-line pt-3.5 text-xs text-muted">
                  <span>{hpTampil(r.no_hp ?? r.no_hp_ortu)}</span>
                  <button
                    type="button"
                    className="s-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEdit({ open: true, j: r });
                    }}
                  >
                    Edit
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="glass mt-5 overflow-hidden rounded-[28px]">
          <div className="overflow-x-auto">
            {/* Kolom nama (kiri) dan aksi (kanan) menempel seperti freeze column di Excel. */}
            <table className="s-tbl min-w-[860px]">
              <thead>
                <tr>
                  <th className={cn(STICKY_KIRI, "z-20")}>Nama</th>
                  <th>Jenjang</th>
                  <th>Umur</th>
                  <th>No. WA</th>
                  <th>GDG</th>
                  <th>Status</th>
                  <th className={cn(STICKY_KANAN, "z-20")}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const st = statusRow(r);
                  return (
                    <tr key={r.id} className="group">
                      <td className={STICKY_KIRI}>
                        <button type="button" onClick={() => setDetail(r)} className="flex items-center gap-3.5 text-left">
                          <Av nama={r.nama} i={i} size={38} />
                          <span className="font-bold transition-colors group-hover:text-primary">{r.nama}</span>
                        </button>
                      </td>
                      <td>
                        <span className="s-chip whitespace-nowrap">{jenjang(r)}</span>
                      </td>
                      <td className="text-muted">{umur(r.tanggal_lahir) ?? "—"}</td>
                      <td className="whitespace-nowrap text-muted tabular-nums">{hpTampil(r.no_hp ?? r.no_hp_ortu)}</td>
                      <td className="whitespace-nowrap text-muted">
                        {gname(r.gdg_group_id) ?? "—"}
                        {r.gdg_manual && <span className="text-faint"> · manual</span>}
                      </td>
                      <td>
                        <span className={cn("inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold", st.c)} title={r.alasan_nonaktif ?? ""}>
                          <i className="h-2 w-2 rounded-full bg-current" />
                          {st.t}
                        </span>
                      </td>
                      <td className={STICKY_KANAN}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" onClick={() => setEdit({ open: true, j: r })} title="Edit">
                            <Pencil size={13} /> <span className="hidden min-[420px]:inline">Edit</span>
                          </Button>
                          {/* Layar lebar: semua tombol terlihat. HP: sisanya dilipat ke tombol "..." */}
                          <div className="hidden items-center gap-1.5 sm:flex">
                            {r.perlu_review && (
                              <Button size="sm" variant="primary" onClick={() => sudahDicek(r)} title="Sudah dicek" aria-label="Sudah dicek">
                                <CheckCheck size={13} />
                              </Button>
                            )}
                            {r.status === "aktif" && <FollowUpButton jemaat={r} label="WA" />}
                            {r.status === "aktif" ? (
                              <Button size="sm" onClick={() => setNonaktif(r)} title="Nonaktifkan" aria-label="Nonaktifkan">
                                <Power size={13} />
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => aktifkan(r)} title="Aktifkan lagi" aria-label="Aktifkan lagi">
                                <UserCheck size={13} />
                              </Button>
                            )}
                            <Button size="sm" variant="danger" onClick={() => setHapus(r)} title="Hapus permanen" aria-label="Hapus permanen">
                              <Trash2 size={13} />
                            </Button>
                          </div>
                          <Button size="sm" className="sm:hidden" onClick={() => setAksi(r)} title="Aksi lain" aria-label="Aksi lain">
                            <MoreHorizontal size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-5 text-[13px] text-muted">
        Menampilkan {filtered.length.toLocaleString("id-ID")} dari {counts.semua.toLocaleString("id-ID")}
      </div>

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
      <AksiModal
        j={aksi}
        onClose={() => setAksi(null)}
        onDetail={setDetail}
        onEdit={(j) => setEdit({ open: true, j })}
        onReview={sudahDicek}
        onNonaktif={setNonaktif}
        onAktifkan={aktifkan}
        onHapus={setHapus}
      />
    </>
  );
}


/** Menu aksi untuk layar HP (tombol "..." di tiap baris) */
function AksiModal({
  j,
  onClose,
  onDetail,
  onEdit,
  onReview,
  onNonaktif,
  onAktifkan,
  onHapus,
}: {
  j: Jemaat | null;
  onClose: () => void;
  onDetail: (j: Jemaat) => void;
  onEdit: (j: Jemaat) => void;
  onReview: (j: Jemaat) => void;
  onNonaktif: (j: Jemaat) => void;
  onAktifkan: (j: Jemaat) => void;
  onHapus: (j: Jemaat) => void;
}) {
  const item =
    "flex w-full min-h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm font-semibold transition hover:border-gold/50 hover:bg-surface-2";
  const jalankan = (fn: (j: Jemaat) => void) => () => {
    if (!j) return;
    onClose();
    fn(j);
  };
  return (
    <Modal open={!!j} onClose={onClose} title={j?.nama ?? ""}>
      {j && (
        <div className="space-y-2">
          <button className={item} onClick={jalankan(onDetail)}>
            <Eye size={16} className="text-muted" /> Lihat detail
          </button>
          <button className={item} onClick={jalankan(onEdit)}>
            <Pencil size={16} className="text-muted" /> Edit data
          </button>
          {j.status === "aktif" && (
            <div className={cn(item, "justify-between")}>
              <span className="flex items-center gap-3">
                <MessageCircle size={16} className="text-gold" /> Follow up WhatsApp
              </span>
              <FollowUpButton jemaat={j} label="Buka WA" />
            </div>
          )}
          {j.perlu_review && (
            <button className={item} onClick={jalankan(onReview)}>
              <CheckCheck size={16} className="text-gold" /> Tandai sudah dicek
            </button>
          )}
          {j.status === "aktif" ? (
            <button className={item} onClick={jalankan(onNonaktif)}>
              <Power size={16} className="text-muted" /> Nonaktifkan
            </button>
          ) : (
            <button className={item} onClick={jalankan(onAktifkan)}>
              <UserCheck size={16} className="text-gold" /> Aktifkan lagi
            </button>
          )}
          <button className={cn(item, "border-danger/30 text-danger")} onClick={jalankan(onHapus)}>
            <Trash2 size={16} /> Hapus permanen
          </button>
        </div>
      )}
    </Modal>
  );
}
