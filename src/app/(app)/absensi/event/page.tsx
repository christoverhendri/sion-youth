"use client";

import { CalendarPlus, Check, CheckCircle2, Minus, PartyPopper, Plus, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMe } from "@/components/role";
import { SimpanBar } from "@/components/simpan-bar";
import { TambahCepat } from "@/components/tambah-cepat";
import { Badge, Button, Card, ErrorText, Field, Loading, Modal, PageHeader } from "@/components/ui";
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
        title="Absensi Event"
        sub="Untuk kegiatan di luar ibadah rutin: Fun Activity Day, retreat, bakti sosial, dll."
        action={
          <>
            <Link
              href="/absensi"
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-tint/10"
            >
              Absensi ibadah
            </Link>
            {pengurus && (
              <Button variant="primary" onClick={() => setBuatEvent(true)}>
                <CalendarPlus size={16} /> Tambah event
              </Button>
            )}
          </>
        }
      />

      {!events ? (
        <Loading />
      ) : events.length === 0 ? (
        <Card className="py-12 text-center">
          <PartyPopper className="mx-auto mb-3 text-primary" size={36} />
          <p className="font-semibold">Belum ada event</p>
          <p className="mt-1 text-sm text-muted">
            {pengurus
              ? "Tambahkan event, lalu absensinya bisa langsung dicentang di sini. Event yang sama juga muncul di Kalender."
              : "Minta pengurus menambahkan event di menu Kalender atau lewat halaman ini."}
          </p>
          {pengurus && (
            <Button variant="primary" className="mt-4" onClick={() => setBuatEvent(true)}>
              <CalendarPlus size={16} /> Tambah event
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-2">
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => setId(e.id)}
                className={cn(
                  "w-56 shrink-0 rounded-2xl border p-3 text-left transition",
                  e.id === id ? "border-primary bg-primary/10" : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <div className="truncate text-sm font-semibold">{e.nama}</div>
                <div className="mt-0.5 text-xs text-muted">{tanggalEvent(e)}</div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {e.disimpan_at ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 size={13} /> Tersimpan
                    </span>
                  ) : e.selesai < isoDate(new Date()) ? (
                    <Badge color="yellow">Belum disimpan</Badge>
                  ) : (
                    <span className="text-faint">{e.mulai > isoDate(new Date()) ? "Akan datang" : "Berlangsung"}</span>
                  )}
                  <span className="ml-auto text-muted">{e.hadir} hadir</span>
                </div>
              </button>
            ))}
          </div>

          <ErrorText>{error}</ErrorText>

          {ev && (
            <>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-xl font-bold">{ev.nama}</h2>
                <span className="text-sm text-muted">{tanggalEvent(ev)}</span>
              </div>

              {terkunci && (
                <SimpanBar
                  disimpanAt={ev.disimpan_at}
                  disimpanNama={ev.disimpan_nama}
                  jumlah={jumlahHadir}
                  busy={busy}
                  onSimpan={() => simpan(true)}
                  onBuka={() => simpan(false)}
                />
              )}

              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <Card className="p-4">
                  <div className="text-xs text-muted">Jemaat hadir</div>
                  <div className="mt-1 text-3xl font-bold">
                    {jumlahHadir}
                    <span className="text-base font-normal text-muted"> / {rows?.length ?? "-"}</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted">Tamu / pengunjung (tanpa data)</div>
                  <div className="mt-1 flex items-center gap-3">
                    <Button size="sm" disabled={terkunci} onClick={() => setTamu(ev.jumlah_tamu - 1)}>
                      <Minus size={14} />
                    </Button>
                    <span className="w-10 text-center text-3xl font-bold">{ev.jumlah_tamu}</span>
                    <Button size="sm" disabled={terkunci} onClick={() => setTamu(ev.jumlah_tamu + 1)}>
                      <Plus size={14} />
                    </Button>
                  </div>
                </Card>
                <Card className="flex items-center p-4">
                  <Button variant="primary" className="w-full" disabled={terkunci} onClick={() => setTambah(true)}>
                    <UserPlus size={16} /> Jemaat baru datang
                  </Button>
                </Card>
              </div>

              <Card className="p-0">
                <div className="flex flex-wrap gap-3 border-b border-line p-4">
                  <div className="relative min-w-[200px] flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      className="field pl-9"
                      placeholder="Ketik nama…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                  <select className="field w-auto" value={jen} onChange={(e) => setJen(e.target.value)}>
                    <option value="">Semua</option>
                    {STATUS_AKADEMIK.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {!rows ? (
                  <Loading />
                ) : (
                  <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => toggle(r)}
                        disabled={terkunci}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition active:scale-[0.98]",
                          r.hadir ? "border-success/40 bg-success/10" : "border-line bg-surface hover:border-line-strong",
                          terkunci && "cursor-default active:scale-100",
                          terkunci && !r.hadir && "opacity-50",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-md border",
                            r.hadir ? "border-success bg-success text-[#052e1f]" : "border-line-strong",
                          )}
                        >
                          {r.hadir && <Check size={15} strokeWidth={3} />}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">{r.nama}</span>
                        <span className="text-[11px] text-faint">{r.status_akademik}</span>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="col-span-full py-6 text-center text-sm text-muted">
                        Nama tidak ditemukan.{" "}
                        {!terkunci && (
                          <button className="text-primary hover:underline" onClick={() => setTambah(true)}>
                            Tambah sebagai jemaat baru
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {!terkunci && (
                <SimpanBar
                  disimpanAt={null}
                  disimpanNama={null}
                  jumlah={jumlahHadir}
                  busy={busy}
                  onSimpan={() => simpan(true)}
                  onBuka={() => simpan(false)}
                />
              )}
            </>
          )}
        </>
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
