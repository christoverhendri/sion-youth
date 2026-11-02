"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight, Pencil, RotateCcw, Search, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FollowUpButton } from "@/components/followup";
import { GroupModal } from "@/components/group-modal";
import { useMe } from "@/components/role";
import { SimpanBar } from "@/components/simpan-bar";
import { Badge, Button, Card, CardTitle, Empty, ErrorText, Field, Loading, Modal } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { labelGrup, type GdgGroup, type GdgSession, type Jemaat, type StatusAkademik } from "@/lib/types";
import { addMonths, cn, firstOfMonth, fmtDate, fmtMonth, isoDate, jenjang } from "@/lib/utils";

type Member = Pick<Jemaat, "id" | "nama" | "no_hp" | "no_hp_ortu" | "status_akademik" | "kelas" | "gdg_manual">;
/** Anggota GDG lain yang ikut GDG ini (mis. kalau dua grup digabung) */
type Tamu = { id: string; nama: string; status_akademik: StatusAkademik; grup_nama: string | null };
type Stat = { id: string; absen_beruntun: number; total_sesi: number; total_hadir: number; terakhir_hadir: string | null };

function sabtuKedua(bulan: string) {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const first = (6 - d.getDay() + 7) % 7;
  return `${bulan.slice(0, 8)}${String(1 + first + 7).padStart(2, "0")}`;
}

export default function GdgDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const pengurus = me.role === "pengurus";
  const [group, setGroup] = useState<GdgGroup | null>(null);
  const [groups, setGroups] = useState<GdgGroup[]>([]);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [bulan, setBulan] = useState(firstOfMonth());
  const [sesi, setSesi] = useState<GdgSession | null>(null);
  const [hadir, setHadir] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState(false);
  const [tamu, setTamu] = useState<Tamu[]>([]);
  const [tambahTamu, setTambahTamu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      const t = await sb.rpc("gdg_tamu_list", { p_session: s.id });
      setTamu((t.data as Tamu[]) ?? []);
    } else {
      setHadir(new Set());
      setTamu([]);
    }
  }, [id, bulan]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);
  useEffect(() => {
    loadSesi();
  }, [loadSesi]);

  async function toggle(jid: string) {
    if (!sesi) return;
    setError("");
    const on = hadir.has(jid);
    const next = new Set(hadir);
    if (on) next.delete(jid);
    else next.add(jid);
    setHadir(next);
    if (on) setTamu((ts) => ts.filter((t) => t.id !== jid));
    const { error } = await createClient().rpc("set_hadir_gdg", { p_session: sesi.id, p_jemaat: jid, p_hadir: !on });
    if (error) {
      setError(error.message);
      loadSesi();
    }
  }

  async function toggleTamu(t: Tamu, tambah: boolean) {
    if (!sesi) return;
    setError("");
    const { error } = await createClient().rpc("set_hadir_gdg", { p_session: sesi.id, p_jemaat: t.id, p_hadir: tambah });
    if (error) return setError(error.message);
    setHadir((h) => {
      const n = new Set(h);
      if (tambah) n.add(t.id);
      else n.delete(t.id);
      return n;
    });
    setTamu((ts) => (tambah ? [...ts.filter((x) => x.id !== t.id), t] : ts.filter((x) => x.id !== t.id)));
  }

  async function simpan(p: boolean) {
    if (!sesi) return;
    setBusy(true);
    const { error } = await createClient().rpc("simpan_absensi_gdg", { p_session: sesi.id, p_simpan: p });
    setBusy(false);
    if (error) return setError(error.message);
    await loadSesi();
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
  const terkunci = !!sesi?.disimpan_at;
  const bisaAbsen = !!sesi && sesi.status === "terjadwal" && !terkunci;

  return (
    <>
      {pengurus && (
        <Link href="/gdg" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Semua grup
        </Link>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{group.nama}</h1>
            <Badge color="blue">{labelGrup(group)}</Badge>
            {!group.is_active && <Badge color="red">nonaktif</Badge>}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <UserRound size={14} /> Leader: {group.leader_name} · {members.length} anggota aktif
          </p>
        </div>
        {pengurus && (
          <div className="flex gap-2">
            <Button onClick={() => setEdit(true)}>
              <Pencil size={15} /> Edit grup
            </Button>
            <Button variant={group.is_active ? "danger" : "success"} onClick={toggleActive}>
              {group.is_active ? "Nonaktifkan grup" : "Aktifkan grup"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle
            sub={
              pengurus
                ? "Default Sabtu minggu ke-2. Bisa diubah kalau hasil diskusi pindah hari."
                : "Default Sabtu minggu ke-2. Perubahan jadwal diatur pengurus."
            }
            action={
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-1.5 hover:bg-tint/10" onClick={() => setBulan(addMonths(bulan, -1))}>
                  <ChevronLeft size={16} />
                </button>
                <button className="rounded-lg p-1.5 hover:bg-tint/10" onClick={() => setBulan(addMonths(bulan, 1))}>
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
                {sesi.catatan && <div className="mt-1 text-xs text-muted">{sesi.catatan}</div>}
              </div>
              {pengurus && (
                <>
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
                </>
              )}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle
            sub={
              sesi?.status === "batal"
                ? "GDG bulan ini batal, tidak ada absensi."
                : terkunci
                  ? "Sudah disimpan."
                  : sesi && sesi.tanggal <= isoDate(new Date())
                    ? "Centang anggota yang hadir, lalu klik Simpan."
                    : "Bisa dicentang saat hari H."
            }
            action={sesi && <Badge color="green">{hadir.size} hadir</Badge>}
          >
            Absensi GDG
          </CardTitle>
          {sesi && sesi.status === "terjadwal" && terkunci && (
            <SimpanBar
              disimpanAt={sesi.disimpan_at}
              disimpanNama={sesi.disimpan_nama}
              jumlah={hadir.size}
              busy={busy}
              onSimpan={() => simpan(true)}
              onBuka={() => simpan(false)}
            />
          )}
          <ErrorText>{error}</ErrorText>
          {members.length === 0 ? (
            <Empty>Belum ada anggota.</Empty>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {members.map((m) => {
                const on = hadir.has(m.id);
                return (
                  <button
                    key={m.id}
                    disabled={!bisaAbsen}
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                      on ? "border-success/40 bg-success/10" : "border-line bg-surface hover:border-line-strong",
                      !bisaAbsen && "cursor-default",
                      !bisaAbsen && !on && "opacity-50",
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
          {sesi && sesi.status === "terjadwal" && (tamu.length > 0 || bisaAbsen) && (
            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Dari GDG lain{tamu.length > 0 && ` · ${tamu.length}`}
                </div>
                {bisaAbsen && (
                  <Button size="sm" onClick={() => setTambahTamu(true)}>
                    <UserPlus size={13} /> Tambah dari GDG lain
                  </Button>
                )}
              </div>
              {tamu.length === 0 ? (
                <p className="text-xs text-faint">
                  Kalau GDG bulan ini digabung dengan grup lain, tambahkan anggota grup itu di sini.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tamu.map((t) => (
                    <button
                      key={t.id}
                      disabled={!bisaAbsen}
                      onClick={() => toggleTamu(t, false)}
                      title={bisaAbsen ? "Klik untuk membatalkan" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-3 py-2.5 text-left text-sm",
                        !bisaAbsen && "cursor-default",
                      )}
                    >
                      <span className="grid h-5 w-5 place-items-center rounded-md border border-success bg-success text-[#052e1f]">
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{t.nama}</span>
                      <span className="shrink-0 text-[11px] text-muted">{t.grup_nama ?? "tanpa grup"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {sesi && bisaAbsen && (
            <SimpanBar
              disimpanAt={null}
              disimpanNama={null}
              jumlah={hadir.size}
              busy={busy}
              onSimpan={() => simpan(true)}
              onBuka={() => simpan(false)}
            />
          )}
        </Card>
      </div>

      <Card className="mt-5 p-0">
        <div className="p-5 pb-0">
          <CardTitle
            sub={
              pengurus
                ? "Dihitung dari sesi GDG grup ini yang sudah lewat. Pindah grup = otomatis jadi manual."
                : "Dihitung dari sesi GDG grup ini yang sudah lewat."
            }
          >
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
                {pengurus && <th className="px-5 py-3 font-medium">Pindah ke</th>}
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
                    {pengurus && (
                      <td className="px-5 py-3">
                        <select
                          className="field w-auto py-1.5 text-xs"
                          value={group.id}
                          onChange={(e) => pindah(m.id, e.target.value)}
                        >
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.nama} ({labelGrup(g)})
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
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

      <TambahTamuModal
        open={tambahTamu}
        groupId={group.id}
        sudah={new Set(tamu.map((t) => t.id))}
        onToggle={toggleTamu}
        onClose={() => setTambahTamu(false)}
      />
      <GroupModal value={edit ? group : null} onClose={() => setEdit(false)} onSaved={loadGroup} />
    </>
  );
}

/** Pilih jemaat dari GDG lain yang ikut GDG ini hari ini */
function TambahTamuModal({
  open,
  groupId,
  sudah,
  onToggle,
  onClose,
}: {
  open: boolean;
  groupId: string;
  sudah: Set<string>;
  onToggle: (t: Tamu, tambah: boolean) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<Tamu[] | null>(null);
  const [q, setQ] = useState("");
  const [grup, setGrup] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setGrup("");
    setList(null);
    createClient()
      .rpc("jemaat_gdg_lain", { p_group: groupId })
      .then(({ data }) => setList((data as Tamu[]) ?? []));
  }, [open, groupId]);

  const namaGrup = [...new Set((list ?? []).map((t) => t.grup_nama ?? "Tanpa grup"))].sort();
  const tampil = (list ?? []).filter(
    (t) =>
      (!grup || (t.grup_nama ?? "Tanpa grup") === grup) && (!q.trim() || t.nama.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <Modal open={open} onClose={onClose} title="Tambah dari GDG lain">
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Untuk GDG yang digabung dengan grup lain. Yang dipilih langsung tercatat hadir di GDG ini; keanggotaan
          grupnya sendiri tidak berubah.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input className="field pl-9" placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <select className="field w-auto" value={grup} onChange={(e) => setGrup(e.target.value)}>
            <option value="">Semua grup</option>
            {namaGrup.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
          {!list ? (
            <p className="py-6 text-center text-sm text-muted">Memuat…</p>
          ) : tampil.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Tidak ada jemaat yang cocok.</p>
          ) : (
            tampil.map((t) => {
              const on = sudah.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onToggle(t, !on)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                    on ? "border-success/40 bg-success/10" : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                      on ? "border-success bg-success text-[#052e1f]" : "border-line-strong",
                    )}
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.nama}</span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {t.status_akademik} · {t.grup_nama ?? "tanpa grup"}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </div>
    </Modal>
  );
}
