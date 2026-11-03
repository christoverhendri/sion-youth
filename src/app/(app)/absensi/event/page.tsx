"use client";

import { CalendarPlus, Minus, PartyPopper, Plus, Search, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/role";
import { SimpanBar } from "@/components/simpan-bar";
import { TambahCepat } from "@/components/tambah-cepat";
import { Av, CheckIcon, Panel, Seg } from "@/components/sion";
import { Button, ErrorText, Field, Loading, Modal, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { STATUS_AKADEMIK, type StatusAkademik } from "@/lib/types";
import { cn, fmtDate, isoDate } from "@/lib/utils";

type Event = {
  id: string;
  nama: string;
  mulai: string;
  selesai: string;
  status: string;
  jumlah_tamu: number;
  disimpan_at: string | null;
  disimpan_nama: string | null;
  hadir: number;
};
type Row = { id: string; nama: string; status_akademik: StatusAkademik; hadir: boolean };

/** Event yang sedang berlangsung hari ini, kalau tidak ada: yang paling dekat akan datang, lalu yang terbaru. */
function pilihAwal(list: Event[]) {
  const today = isoDate(new Date());
  const berlangsung = list.find((e) => e.mulai <= today && e.selesai >= today);
  if (berlangsung) return berlangsung.id;
  const akanDatang = [...list].reverse().find((e) => e.mulai > today);
  return (akanDatang ?? list[0])?.id ?? null;
}

function tanggalEvent(e: Pick<Event, "mulai" | "selesai">) {
  return e.mulai === e.selesai
    ? fmtDate(e.mulai)
    : `${fmtDate(e.mulai, { year: undefined })} – ${fmtDate(e.selesai)}`;
}

export default function AbsensiEventPage() {
  const me = useMe();
  const pengurus = me.role === "pengurus";
  const [events, setEvents] = useState<Event[] | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [jen, setJen] = useState("");
  const [tambah, setTambah] = useState(false);
  const [buatEvent, setBuatEvent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(async (pilih?: string) => {
    const { data, error } = await createClient().rpc("event_daftar");
    if (error) setError(error.message);
    const list = ((data as Event[]) ?? []).map((e) => ({ ...e, hadir: Number(e.hadir) }));
    setEvents(list);
    setId((cur) => pilih ?? (cur && list.some((e) => e.id === cur) ? cur : pilihAwal(list)));
  }, []);

  const loadRows = useCallback(async (eventId: string) => {
    setRows(null);
    const { data, error } = await createClient().rpc("absensi_event_list", { p_event: eventId });
    if (error) setError(error.message);
    setRows((data as Row[]) ?? []);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  useEffect(() => {
    setError("");
    setQ("");
    if (id) loadRows(id);
  }, [id, loadRows]);

  const ev = events?.find((e) => e.id === id) ?? null;
  const terkunci = !!ev?.disimpan_at;

  async function toggle(r: Row) {
    if (!ev || terkunci) return;
    setError("");
    const baru = !r.hadir;
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, hadir: baru } : x)) ?? null);
    setEvents((es) => es?.map((e) => (e.id === ev.id ? { ...e, hadir: e.hadir + (baru ? 1 : -1) } : e)) ?? null);
    const { error } = await createClient().rpc("set_hadir_event", { p_event: ev.id, p_jemaat: r.id, p_hadir: baru });
    if (error) {
      setError(error.message);
      loadRows(ev.id);
      loadEvents();
    }
  }

  async function setTamu(n: number) {
    if (!ev || terkunci) return;
    const jumlah = Math.max(0, n);
    setEvents((es) => es?.map((e) => (e.id === ev.id ? { ...e, jumlah_tamu: jumlah } : e)) ?? null);
    const { error } = await createClient().rpc("set_tamu_event", { p_event: ev.id, p_jumlah: jumlah });
    if (error) setError(error.message);
  }

  async function simpan(p: boolean) {
    if (!ev) return;
    setBusy(true);
    const { error } = await createClient().rpc("simpan_absensi_event", { p_event: ev.id, p_simpan: p });
    setBusy(false);
    if (error) return setError(error.message);
    loadEvents();
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => (!jen || r.status_akademik === jen) && (!s || r.nama.toLowerCase().includes(s)));
  }, [rows, q, jen]);
  const jumlahHadir = (rows ?? []).filter((r) => r.hadir).length;

  return (
    <>
      <PageHeader
        eyebrow="Absensi Event"
        title="Siapa yang datang?"
        sub="Fun Day, retreat, bakti sosial. Pilih event, lalu ketuk nama yang hadir."
        action={
          pengurus && (
            <Button variant="primary" onClick={() => setBuatEvent(true)} className="min-h-[46px] px-6">
              <CalendarPlus size={16} /> Tambah event
            </Button>
          )
        }
      />

      {!events ? (
        <Loading />
      ) : events.length === 0 ? (
        <Panel className="py-16 text-center">
          <span className="s-ico mx-auto h-16 w-16 rounded-[20px]">
            <PartyPopper size={28} />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            Belum ada <span className="accent-serif">event</span>
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {pengurus
              ? "Tambahkan event, lalu absensinya bisa langsung dicentang di sini. Event yang sama juga muncul di Kalender."
              : "Minta pengurus menambahkan event di menu Kalender atau lewat halaman ini."}
          </p>
          {pengurus && (
            <Button variant="primary" className="mt-5" onClick={() => setBuatEvent(true)}>
              <CalendarPlus size={16} /> Tambah event
            </Button>
          )}
        </Panel>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-3 lg:max-w-[300px]">
            {events.map((e) => {
              const today = isoDate(new Date());
              const st = e.disimpan_at
                ? { t: "Tersimpan", c: "s-chip" }
                : e.selesai < today
                  ? { t: "Belum disimpan", c: "s-chip gold" }
                  : e.mulai > today
                    ? { t: "Akan datang", c: "s-chip" }
                    : { t: "Berlangsung", c: "s-chip gold" };
              return (
                <button key={e.id} type="button" onClick={() => setId(e.id)} className="s-pick w-full hover:!translate-x-1 hover:!translate-y-0" aria-pressed={e.id === id}>
                  <div className="flex items-start justify-between gap-2.5">
                    <span className="font-bold">{e.nama}</span>
                    <span className={st.c}>{st.t}</span>
                  </div>
                  <div className="s-sub mt-1.5">
                    {tanggalEvent(e)} · {e.hadir} hadir
                  </div>
                </button>
              );
            })}
          </aside>

          <section className="min-w-0 flex-[999_1_560px]">
            <ErrorText>{error}</ErrorText>
            {ev && (
              <>
                <Panel>
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="s-h2">{ev.nama}</h2>
                      <p className="s-sub">{tanggalEvent(ev)}</p>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[44px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-primary">{jumlahHadir}</span>
                      <span className="font-semibold text-muted">hadir</span>
                    </div>
                  </div>

                  <label className="s-search !h-[50px]">
                    <Search size={18} className="text-muted" />
                    <span className="sr-only">Cari nama</span>
                    <input placeholder="Ketik nama…" value={q} onChange={(e) => setQ(e.target.value)} />
                  </label>
                  <Seg
                    small
                    className="mt-3"
                    label="Filter jenjang"
                    value={jen}
                    onChange={setJen}
                    options={[{ value: "", label: "Semua jenjang" }, ...STATUS_AKADEMIK.map((s) => ({ value: s as string, label: s }))]}
                  />

                  {!rows ? (
                    <Loading />
                  ) : (
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      {filtered.map((r, i) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => toggle(r)}
                          disabled={terkunci}
                          aria-pressed={r.hadir}
                          className="s-namepill"
                          style={{ opacity: terkunci && !r.hadir ? 0.5 : 1 }}
                        >
                          <Av nama={r.nama} i={i} />
                          {r.nama}
                          <span className={cn("inline-flex overflow-hidden transition-[width] duration-300", r.hadir ? "w-[18px]" : "w-0")}>
                            <CheckIcon size={18} />
                          </span>
                        </button>
                      ))}
                      {filtered.length === 0 && (
                        <p className="w-full py-6 text-center text-sm text-muted">
                          Nama tidak ditemukan.{" "}
                          {!terkunci && (
                            <button className="s-more" onClick={() => setTambah(true)}>
                              Tambah sebagai jemaat baru
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                    <div>
                      <div className="font-bold">Tamu / pengunjung</div>
                      <div className="s-sub">Tanpa data jemaat</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="glass flex items-center gap-1 rounded-full p-[5px]">
                        <button type="button" aria-label="Kurangi tamu" disabled={terkunci} onClick={() => setTamu(ev.jumlah_tamu - 1)} className="pressable grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40">
                          <Minus size={16} />
                        </button>
                        <span className="min-w-10 text-center text-xl font-extrabold tabular-nums" aria-live="polite">
                          {ev.jumlah_tamu}
                        </span>
                        <button type="button" aria-label="Tambah tamu" disabled={terkunci} onClick={() => setTamu(ev.jumlah_tamu + 1)} className="pressable grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-40">
                          <Plus size={16} />
                        </button>
                      </div>
                      <Button disabled={terkunci} onClick={() => setTambah(true)}>
                        <UserPlus size={16} /> Jemaat baru datang
                      </Button>
                    </div>
                  </div>
                </Panel>

                <SimpanBar
                  disimpanAt={ev.disimpan_at}
                  disimpanNama={ev.disimpan_nama}
                  jumlah={jumlahHadir}
                  tamu={ev.jumlah_tamu}
                  busy={busy}
                  onSimpan={() => simpan(true)}
                  onBuka={() => simpan(false)}
                />
              </>
            )}
          </section>
        </div>
      )}

      <TambahCepat
        open={tambah}
        namaAwal={q}
        tambah={async (v) => {
          if (!ev) return "Pilih event dulu";
          const sb = createClient();
          const baru = await sb.rpc("tambah_jemaat_cepat", {
            p_nama: v.nama,
            p_hp: v.hp,
            p_status: v.status,
            p_session: null,
          });
          if (baru.error) return baru.error.message;
          const { error } = await sb.rpc("set_hadir_event", { p_event: ev.id, p_jemaat: baru.data, p_hadir: true });
          return error?.message ?? null;
        }}
        onClose={() => setTambah(false)}
        onSaved={() => {
          setQ("");
          if (id) loadRows(id);
          loadEvents();
        }}
      />
      <BuatEventModal
        open={buatEvent}
        onClose={() => setBuatEvent(false)}
        onSaved={(newId) => {
          loadEvents(newId);
        }}
      />
    </>
  );
}

/** Tambah event cepat. Event yang dibuat di sini juga muncul di Kalender. */
function BuatEventModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [nama, setNama] = useState("");
  const [mulai, setMulai] = useState(isoDate(new Date()));
  const [selesai, setSelesai] = useState(isoDate(new Date()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const t = isoDate(new Date());
      setNama("");
      setMulai(t);
      setSelesai(t);
      setError("");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (selesai < mulai) return setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    setBusy(true);
    const { data, error } = await createClient()
      .from("activities")
      .insert({ nama: nama.trim(), mulai, selesai, status: "berjalan" })
      .select("id")
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    onSaved(data.id as string);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Tambah event">
      <form onSubmit={save} className="space-y-4">
        <Field label="Nama event">
          <input
            className="field"
            placeholder="Mis. Sion Fun Activity Day"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dari">
            <input
              type="date"
              className="field"
              value={mulai}
              onChange={(e) => {
                setMulai(e.target.value);
                if (selesai < e.target.value) setSelesai(e.target.value);
              }}
              required
            />
          </Field>
          <Field label="Sampai">
            <input
              type="date"
              className="field"
              value={selesai}
              min={mulai}
              onChange={(e) => setSelesai(e.target.value)}
              required
            />
          </Field>
        </div>
        <p className="text-xs text-muted">PIC, deskripsi, dan warna bisa dilengkapi nanti di menu Kalender.</p>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" disabled={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
