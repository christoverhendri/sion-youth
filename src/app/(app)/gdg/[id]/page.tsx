"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, RotateCcw, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FollowUpButton } from "@/components/followup";
import { GroupModal } from "@/components/group-modal";
import { useMe } from "@/components/role";
import { SimpanBar } from "@/components/simpan-bar";
import { Av, CheckIcon, Panel, PanelHead } from "@/components/sion";
import { Button, Empty, ErrorText, Field, Loading, Modal } from "@/components/ui";
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

  const nama = group.nama.replace(/^GDG\s+/i, "");
  const tglSesi = sesi ? new Date(`${sesi.tanggal}T00:00:00`) : null;

  return (
    <>
      <section className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          {pengurus && (
            <Link href="/gdg" className="group inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-ink">
              <ArrowLeft size={16} className="transition-transform duration-300 [transition-timing-function:var(--spring)] group-hover:-translate-x-1" /> Semua grup
            </Link>
          )}
          <h1 className="mt-4 text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[52px]">
            GDG <span className="accent-serif">{nama}</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Av nama={group.leader_name} size={36} />
            <span className="font-bold">{group.leader_name}</span>
            <span className="text-muted">
              · {labelGrup(group)} · {members.length} anggota
            </span>
            {!group.is_active && <span className="s-chip bad">nonaktif</span>}
          </div>
        </div>
        {pengurus && (
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={() => setEdit(true)}>
              <Pencil size={15} /> Edit grup
            </Button>
            <Button variant={group.is_active ? "danger" : "primary"} onClick={toggleActive}>
              {group.is_active ? "Nonaktifkan grup" : "Aktifkan grup"}
            </Button>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="s-h2">
            Pertemuan <span className="accent-serif">{fmtMonth(bulan)}</span>
          </h2>
          <div className="glass flex items-center gap-1 rounded-full p-1">
            <button aria-label="Bulan sebelumnya" className="pressable grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setBulan(addMonths(bulan, -1))}>
              <ChevronLeft size={16} />
            </button>
            <button aria-label="Bulan berikutnya" className="pressable grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setBulan(addMonths(bulan, 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {!sesi || !tglSesi ? (
          <Empty>Grup nonaktif tidak punya jadwal.</Empty>
        ) : (
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="s-pick flex-[1_1_200px]" data-on={sesi.status !== "batal" || undefined}>
              <div className="text-xs font-bold text-muted">{tglSesi.toLocaleDateString("id-ID", { weekday: "long" })}</div>
              <div className={cn("mt-1.5 text-[30px] font-extrabold leading-none tracking-[-0.03em]", sesi.status === "batal" && "line-through opacity-60")}>
                {tglSesi.getDate()} {tglSesi.toLocaleDateString("id-ID", { month: "short" })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={sesi.status === "batal" ? "s-chip bad" : terkunci ? "s-chip" : "s-chip gold"}>
                  {sesi.status === "batal"
                    ? "Dibatalkan"
                    : terkunci
                      ? "Tersimpan"
                      : sesi.tanggal <= isoDate(new Date())
                        ? "Isi absensi"
                        : "Akan datang"}
                </span>
                {sesi.tanggal !== defaultTgl && <span className="s-chip">Diubah dari Sabtu ke-2</span>}
              </div>
              {sesi.catatan && <div className="mt-2 text-xs text-muted">{sesi.catatan}</div>}
            </div>

            {pengurus && (
              <div className="glass flex flex-[999_1_420px] flex-wrap items-end gap-3 rounded-[22px] p-[18px]">
                <Field label="Ubah tanggal" className="min-w-[160px] flex-1">
                  <input
                    type="date"
                    className="field"
                    value={sesi.tanggal}
                    min={bulan}
                    onChange={(e) => e.target.value && updateSesi({ tanggal: e.target.value })}
                  />
                </Field>
                <Field label="Catatan" className="min-w-[200px] flex-[2]">
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
                      <RotateCcw size={13} /> Sabtu ke-2
                    </Button>
                  )}
                  {sesi.status === "batal" ? (
                    <Button size="sm" variant="primary" onClick={() => updateSesi({ status: "terjadwal" })}>
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
          </div>
        )}
      </section>

      <ErrorText>{error}</ErrorText>

      <section className="glass mt-6 overflow-hidden rounded-[28px]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-1 pt-[22px]">
          <div>
            <div className="font-bold">Anggota{tglSesi && ` · ${fmtDate(sesi!.tanggal, { year: undefined })}`}</div>
            <div className="s-sub">
              {sesi?.status === "batal"
                ? "GDG bulan ini batal, tidak ada absensi."
                : terkunci
                  ? `${hadir.size} hadir · sudah disimpan`
                  : sesi && sesi.tanggal <= isoDate(new Date())
                    ? `${hadir.size} dari ${members.length} hadir · centang lalu simpan`
                    : "Bisa dicentang saat hari H."}
            </div>
          </div>
          {pengurus && <span className="text-xs text-muted">Pindah grup = otomatis jadi manual</span>}
        </div>
        {members.length === 0 ? (
          <div className="p-6">
            <Empty>Belum ada anggota.</Empty>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="s-tbl">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jenjang</th>
                  <th>Kehadiran</th>
                  <th>Absen beruntun</th>
                  <th>Hadir</th>
                  {pengurus && <th>Pindah ke</th>}
                  <th>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const s = stats[m.id];
                  const pct = s && s.total_sesi ? Math.round((s.total_hadir / s.total_sesi) * 100) : null;
                  const on = hadir.has(m.id);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Av nama={m.nama} i={i} size={38} />
                          <div>
                            <div className="whitespace-nowrap font-bold">{m.nama}</div>
                            {m.gdg_manual && <div className="text-xs text-muted">manual</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="s-chip">{jenjang(m)}</span>
                      </td>
                      <td>
                        {pct == null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <div className="flex min-w-[140px] items-center gap-2.5">
                            <span className="s-track flex-1">
                              <i style={{ width: `${Math.max(3, pct)}%`, animationDelay: `${0.2 + i * 0.04}s` }} />
                            </span>
                            <span className="text-xs font-bold tabular-nums">
                              {s!.total_hadir}/{s!.total_sesi}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        {s && s.absen_beruntun >= 2 ? (
                          <span className={s.absen_beruntun >= 3 ? "s-chip bad" : "s-chip gold"}>{s.absen_beruntun}×</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="s-chk"
                          disabled={!bisaAbsen}
                          onClick={() => toggle(m.id)}
                          aria-pressed={on}
                          aria-label={`Hadir ${m.nama}`}
                          style={{ opacity: !bisaAbsen && !on ? 0.45 : 1 }}
                        >
                          <CheckIcon />
                        </button>
                      </td>
                      {pengurus && (
                        <td>
                          <select className="field w-auto !rounded-full py-2 text-xs" value={group.id} onChange={(e) => pindah(m.id, e.target.value)}>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.nama} ({labelGrup(g)})
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="text-right">
                        <FollowUpButton jemaat={m} label="WA" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sesi && sesi.status === "terjadwal" && (tamu.length > 0 || bisaAbsen) && (
        <Panel className="mt-6">
          <PanelHead
            title="Dari GDG"
            accent="lain"
            sub="Kalau GDG bulan ini digabung dengan grup lain, tambahkan anggota grup itu di sini."
            action={
              bisaAbsen && (
                <Button size="sm" onClick={() => setTambahTamu(true)}>
                  <UserPlus size={14} /> Tambah dari GDG lain
                </Button>
              )
            }
          />
          {tamu.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {tamu.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={!bisaAbsen}
                  onClick={() => toggleTamu(t, false)}
                  title={bisaAbsen ? "Klik untuk membatalkan" : undefined}
                  aria-pressed
                  className="s-namepill"
                >
                  <Av nama={t.nama} i={i} />
                  {t.nama}
                  <span className="text-xs opacity-70">{t.grup_nama ?? "tanpa grup"}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}

      {sesi && sesi.status === "terjadwal" && (bisaAbsen || terkunci) && (
        <SimpanBar
          disimpanAt={sesi.disimpan_at}
          disimpanNama={sesi.disimpan_nama}
          jumlah={hadir.size}
          busy={busy}
          onSimpan={() => simpan(true)}
          onBuka={() => simpan(false)}
        />
      )}

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
        <div className="flex flex-wrap gap-2">
          <label className="s-search !h-12">
            <Search size={16} className="text-muted" />
            <span className="sr-only">Cari nama</span>
            <input placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </label>
          <select className="field w-auto !rounded-full" value={grup} onChange={(e) => setGrup(e.target.value)}>
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
            tampil.map((t, i) => {
              const on = sudah.has(t.id);
              return (
                <div key={t.id} className="s-prow" data-on={on || undefined}>
                  <Av nama={t.nama} i={i} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{t.nama}</div>
                    <div className="text-xs text-muted">
                      {t.status_akademik} · {t.grup_nama ?? "tanpa grup"}
                    </div>
                  </div>
                  <button type="button" className="s-chk" onClick={() => onToggle(t, !on)} aria-pressed={on} aria-label={`Hadir ${t.nama}`}>
                    <CheckIcon />
                  </button>
                </div>
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
