"use client";

import { CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { More, Panel, PanelHead } from "@/components/sion";
import { Button, Empty, ErrorText, Field, Modal, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { googleCalendarUrl } from "@/lib/ics";
import type { Activity } from "@/lib/types";
import { addMonths, cn, firstOfMonth, fmtDate, fmtMonth, isoDate, parseDate } from "@/lib/utils";

// Kunci warna tetap sama di database; nilainya mengikuti palet desain (emas, baja, navy, ivory)
const WARNA: Record<string, string> = {
  blue: "#C6A15B",
  orange: "#E3C68A",
  aqua: "#99A7BD",
  yellow: "#8A6A2C",
  magenta: "#D8CFBF",
  violet: "#5C6E8C",
};
const STATUS: Record<Activity["status"], { t: string; c: string }> = {
  rencana: { t: "Rencana", c: "s-chip gold" },
  berjalan: { t: "Berjalan", c: "s-chip info" },
  selesai: { t: "Selesai", c: "s-chip" },
  batal: { t: "Batal", c: "s-chip bad" },
};
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function KalenderPage() {
  const [bulan, setBulan] = useState(firstOfMonth());
  const [acts, setActs] = useState<Activity[]>([]);
  const [edit, setEdit] = useState<Activity | "new" | null>(null);
  const [sinkron, setSinkron] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const today = isoDate(new Date());
  const [pilih, setPilih] = useState(today);

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from("activities")
      .select("*")
      .lte("mulai", `${tahun}-12-31`)
      .gte("selesai", `${tahun}-01-01`)
      .order("mulai");
    setActs((data as Activity[]) ?? []);
  }, [tahun]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setTahun(Number(bulan.slice(0, 4)));
  }, [bulan]);

  // Grid kalender: mulai dari hari Senin sebelum tanggal 1, sampai minggu terakhir bulan ini
  const days = useMemo(() => {
    const first = parseDate(bulan);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    const akhir = parseDate(addMonths(bulan, 1));
    akhir.setDate(0);
    const n = Math.ceil(((akhir.getTime() - start.getTime()) / 86400000 + 1) / 7) * 7;
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return isoDate(d);
    });
  }, [bulan]);

  // Timeline per bulan (termin) dalam setahun
  const perBulan = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const m = `${tahun}-${String(i + 1).padStart(2, "0")}-01`;
        const next = addMonths(m, 1);
        return { m, list: acts.filter((a) => a.mulai < next && a.selesai >= m) };
      }),
    [acts, tahun],
  );

  const bulanIni = acts.filter((a) => a.mulai < addMonths(bulan, 1) && a.selesai >= bulan);
  const listPilih = acts.filter((a) => a.mulai <= pilih && a.selesai >= pilih);
  const dPilih = parseDate(pilih);

  return (
    <>
      <PageHeader
        eyebrow="Kalender Kegiatan"
        title={fmtMonth(bulan)}
        sub={`${bulanIni.length} kegiatan bulan ini · tersinkron ke Google Calendar lewat link langganan`}
        action={
          <>
            <button type="button" onClick={() => setSinkron(true)} className="glass pressable inline-flex h-11 items-center gap-2.5 rounded-full px-4 text-[13px] font-semibold text-muted hover:text-ink">
              <span className="s-live text-gold" /> Google Calendar
            </button>
            <div className="glass flex gap-1 rounded-full p-1">
              <button aria-label="Bulan sebelumnya" className="pressable grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setBulan(addMonths(bulan, -1))}>
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="px-2 text-sm font-semibold text-muted hover:text-ink"
                onClick={() => {
                  setBulan(firstOfMonth());
                  setPilih(today);
                }}
              >
                Hari ini
              </button>
              <button aria-label="Bulan berikutnya" className="pressable grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" onClick={() => setBulan(addMonths(bulan, 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
            <Button variant="primary" onClick={() => setEdit("new")} className="min-h-[46px] px-6">
              <Plus size={16} /> Kegiatan
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-6">
        <Panel className="min-w-0 flex-[999_1_560px] !p-5">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label={`Kalender ${fmtMonth(bulan)}`}>
            {HARI.map((h) => (
              <span key={h} className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted sm:px-2.5 sm:text-[11px]">
                {h}
              </span>
            ))}
            {days.map((d) => {
              const inMonth = d.slice(0, 7) === bulan.slice(0, 7);
              const list = acts.filter((a) => a.mulai <= d && a.selesai >= d);
              const on = d === pilih;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPilih(d)}
                  aria-label={`${fmtDate(d)}, ${list.length ? `${list.length} kegiatan` : "tidak ada kegiatan"}`}
                  aria-pressed={on}
                  className={cn(
                    "group relative flex min-h-[64px] flex-col gap-1.5 rounded-[18px] border p-1.5 text-left transition duration-300 [transition-timing-function:var(--ease-out)] sm:min-h-[104px] sm:p-2.5",
                    "hover:-translate-y-[3px] hover:border-gold/55 active:scale-[0.97]",
                    on ? "border-gold bg-gold/10 shadow-[0_18px_40px_-26px_rgba(198,161,91,0.9)]" : "border-transparent bg-surface-2",
                    !inMonth && "opacity-35",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full text-sm font-bold",
                      d === today && "bg-gradient-to-b from-[#ebd29c] to-gold text-[#1a1408]",
                    )}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {list.slice(0, 2).map((a) => (
                    <span
                      key={a.id}
                      className={cn(
                        "block h-1.5 truncate rounded-[3px] text-[0px] sm:h-auto sm:rounded-lg sm:px-2 sm:py-[3px] sm:text-[11px] sm:font-bold",
                        a.status === "batal" && "line-through opacity-50",
                      )}
                      style={{ background: `${WARNA[a.warna] ?? WARNA.blue}33`, boxShadow: `inset 3px 0 0 ${WARNA[a.warna] ?? WARNA.blue}` }}
                    >
                      {a.nama}
                    </span>
                  ))}
                  {list.length > 2 && <span className="hidden text-[10px] font-semibold text-muted sm:block">+{list.length - 2} lagi</span>}
                </button>
              );
            })}
          </div>
        </Panel>

        <aside className="min-w-0 flex-[1_1_300px] lg:max-w-[340px]">
          <Panel key={pilih} className="s-pane">
            <div className="eyebrow !text-[11px]">{dPilih.toLocaleDateString("id-ID", { weekday: "long" })}</div>
            <div className="mt-1.5 text-[40px] font-bold leading-tight tracking-[-0.03em]">
              {dPilih.getDate()} <span className="accent-serif">{dPilih.toLocaleDateString("id-ID", { month: "short" })}</span>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {listPilih.map((a) => (
                <button key={a.id} type="button" onClick={() => setEdit(a)} className="glass s-lift flex gap-3.5 rounded-[20px] p-4 text-left">
                  <span className="w-1 shrink-0 self-stretch rounded" style={{ background: WARNA[a.warna] ?? WARNA.blue }} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{a.nama}</span>
                    <span className="s-sub block">
                      {a.selesai !== a.mulai ? `${fmtDate(a.mulai, { year: undefined })} – ${fmtDate(a.selesai, { year: undefined })}` : "Satu hari"}
                      {a.pic && ` · PIC ${a.pic}`}
                    </span>
                    <span className={cn("mt-2.5", STATUS[a.status].c)}>{STATUS[a.status].t}</span>
                  </span>
                </button>
              ))}
              {listPilih.length === 0 && (
                <div className="px-2.5 py-8 text-center text-sm text-muted">
                  Tidak ada kegiatan.
                  <div className="mt-2.5">
                    <More onClick={() => setEdit("new")}>Tambah kegiatan</More>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </aside>
      </div>

      <Panel className="mt-6">
        <PanelHead
          title="Timeline proker"
          accent={String(tahun)}
          sub="Semua program kerja dikelompokkan per bulan"
          action={
            <div className="glass flex items-center gap-1 rounded-full p-1">
              <button aria-label="Tahun sebelumnya" className="pressable grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" onClick={() => setTahun(tahun - 1)}>
                <ChevronLeft size={15} />
              </button>
              <span className="px-1 text-sm font-bold tabular-nums">{tahun}</span>
              <button aria-label="Tahun berikutnya" className="pressable grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2" onClick={() => setTahun(tahun + 1)}>
                <ChevronRight size={15} />
              </button>
            </div>
          }
        />
        {acts.length === 0 ? (
          <Empty>Belum ada kegiatan di tahun {tahun}.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {perBulan.map(({ m, list }) => (
              <div key={m} className="s-pick !cursor-default hover:!translate-y-0" data-on={m === firstOfMonth() || undefined}>
                <div className="eyebrow mb-3 !text-[11px]">{parseDate(m).toLocaleDateString("id-ID", { month: "long" })}</div>
                {list.length === 0 ? (
                  <p className="text-xs text-muted">—</p>
                ) : (
                  <ul className="space-y-2.5">
                    {list.map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => setEdit(a)} className="group w-full text-left">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: WARNA[a.warna] ?? WARNA.blue }} />
                            <span className="flex-1 truncate text-sm font-bold transition-colors group-hover:text-primary">{a.nama}</span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2 pl-4 text-[11px] text-muted">
                            <span className="truncate">
                              {fmtDate(a.mulai, { year: undefined })}
                              {a.selesai !== a.mulai && ` – ${fmtDate(a.selesai, { year: undefined })}`}
                              {a.pic && ` · ${a.pic}`}
                            </span>
                            <span className={cn("!h-5 !px-2 !text-[10px]", STATUS[a.status].c)}>{STATUS[a.status].t}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <ActivityModal value={edit} onClose={() => setEdit(null)} onSaved={load} />
      <SinkronModal open={sinkron} onClose={() => setSinkron(false)} />
    </>
  );
}


function ActivityModal({
  value,
  onClose,
  onSaved,
}: {
  value: Activity | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const a = value && value !== "new" ? value : null;
  const blank = {
    nama: "",
    deskripsi: "",
    mulai: isoDate(new Date()),
    selesai: isoDate(new Date()),
    pic: "",
    status: "rencana" as Activity["status"],
    warna: "blue",
  };
  const [f, setF] = useState(blank);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setF(
      a
        ? { nama: a.nama, deskripsi: a.deskripsi ?? "", mulai: a.mulai, selesai: a.selesai, pic: a.pic ?? "", status: a.status, warna: a.warna }
        : blank,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.selesai < f.mulai) return setError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
    const sb = createClient();
    const row = { ...f, deskripsi: f.deskripsi || null, pic: f.pic || null };
    const { error } = a
      ? await sb.from("activities").update(row).eq("id", a.id)
      : await sb.from("activities").insert(row);
    if (error) return setError(error.message);
    onSaved();
    onClose();
  }

  async function hapus() {
    if (!a || !confirm(`Hapus kegiatan "${a.nama}"?`)) return;
    await createClient().from("activities").delete().eq("id", a.id);
    onSaved();
    onClose();
  }

  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  return (
    <Modal open={!!value} onClose={onClose} title={a ? "Edit kegiatan" : "Kegiatan baru"}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Nama kegiatan">
          <input className="field" value={f.nama} onChange={(e) => set("nama", e.target.value)} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dari">
            <input
              type="date"
              className="field"
              value={f.mulai}
              onChange={(e) => setF({ ...f, mulai: e.target.value, selesai: f.selesai < e.target.value ? e.target.value : f.selesai })}
              required
            />
          </Field>
          <Field label="Sampai">
            <input type="date" className="field" value={f.selesai} min={f.mulai} onChange={(e) => set("selesai", e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="PIC">
            <input className="field" value={f.pic} onChange={(e) => set("pic", e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="field" value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option value="rencana">Rencana</option>
              <option value="berjalan">Berjalan</option>
              <option value="selesai">Selesai</option>
              <option value="batal">Batal</option>
            </select>
          </Field>
        </div>
        <Field label="Deskripsi">
          <textarea className="field" rows={3} value={f.deskripsi} onChange={(e) => set("deskripsi", e.target.value)} />
        </Field>
        <Field label="Warna">
          <div className="flex gap-2">
            {Object.entries(WARNA).map(([k, c]) => (
              <button
                type="button"
                key={k}
                onClick={() => set("warna", k)}
                className={cn("pressable h-9 w-9 rounded-full border-2 transition-transform", f.warna === k ? "scale-110 border-ink shadow-[0_0_0_3px_rgba(198,161,91,0.35)]" : "border-transparent hover:scale-110")}
                style={{ background: c }}
                aria-label={k}
              />
            ))}
          </div>
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-between gap-2">
          {a ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="danger" onClick={hapus}>
                <Trash2 size={15} /> Hapus
              </Button>
              <a
                href={googleCalendarUrl({ nama: f.nama, mulai: f.mulai, selesai: f.selesai, deskripsi: f.deskripsi, pic: f.pic })}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
                title="Buka Google Calendar dengan data kegiatan ini sudah terisi"
              >
                <CalendarPlus size={15} /> Ke Google Calendar
              </a>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary">Simpan</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/** Cara menyinkronkan kalender Sion ke Google Calendar lewat link langganan (.ics) */
function SinkronModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tersalin, setTersalin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setTersalin(false);
    createClient()
      .from("app_settings")
      .select("value")
      .eq("key", "kalender_token")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setToken((data?.value as string | undefined) ?? null);
      });
  }, [open]);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/kalender-feed/${token}.ics` : "";
  const lokal = url.includes("localhost") || url.includes("127.0.0.1");

  async function salin() {
    await navigator.clipboard.writeText(url);
    setTersalin(true);
    setTimeout(() => setTersalin(false), 2000);
  }

  async function buatBaru() {
    if (!confirm("Buat link baru? Link lama langsung berhenti bekerja, dan kalender yang sudah berlangganan harus diganti linknya.")) return;
    setBusy(true);
    const { data, error } = await createClient().rpc("reset_kalender_token");
    setBusy(false);
    if (error) return setError(error.message);
    setToken(data as string);
  }

  return (
    <Modal open={open} onClose={onClose} title="Sinkron ke Google Calendar" wide>
      <div className="space-y-5 text-sm">
        <p className="text-muted">
          Kalender Sion (semua kegiatan + jadwal GDG tiap grup) bisa muncul di Google Calendar sebagai kalender
          langganan. Tidak perlu API Google, cukup tempel satu link.
        </p>

        <Field label="Link langganan">
          <div className="flex gap-2">
            <input className="field font-mono text-xs" readOnly value={url || "Memuat…"} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="primary" onClick={salin} disabled={!url}>
              {tersalin ? <Check size={15} /> : <Copy size={15} />} {tersalin ? "Tersalin" : "Salin"}
            </Button>
          </div>
        </Field>
        {lokal && (
          <p className="rounded-2xl bg-gold/10 p-4 text-primary">
            Kamu membuka dari <b>localhost</b>, jadi Google tidak bisa mengakses link ini. Buka dashboard dari alamat
            yang sudah online (Vercel), lalu salin linknya dari sana.
          </p>
        )}
        <ErrorText>{error}</ErrorText>

        <ol className="space-y-2 rounded-[22px] bg-surface-2 p-5 text-muted">
          <li>
            <b className="text-ink">1.</b> Salin link di atas.
          </li>
          <li>
            <b className="text-ink">2.</b> Buka{" "}
            <a className="inline-flex items-center gap-1 text-primary hover:underline" href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl" target="_blank" rel="noreferrer">
              Google Calendar → Tambahkan lewat URL <ExternalLink size={12} />
            </a>{" "}
            (di laptop). Atau: panel kiri <i>Kalender lain</i> → <b>+</b> → <b>Dari URL</b>.
          </li>
          <li>
            <b className="text-ink">3.</b> Tempel link, lalu klik <b>Tambahkan kalender</b>. Kalender &quot;Sion
            Youth&quot; akan muncul, juga di HP kalau memakai akun Google yang sama.
          </li>
        </ol>

        <div className="space-y-1.5 text-xs text-muted">
          <p>
            <b className="text-ink">Satu arah:</b> perubahan di dashboard Sion akan muncul di Google Calendar,
            tidak sebaliknya. Tambah atau ubah kegiatan tetap lewat dashboard ini.
          </p>
          <p>
            <b className="text-ink">Tidak instan:</b> Google memperbarui kalender langganan sendiri, biasanya
            beberapa jam sekali (kadang sampai sehari). Itu pengaturan Google, tidak bisa dipercepat dari sini.
          </p>
          <p>
            <b className="text-ink">Jaga linknya:</b> siapa pun yang punya link bisa melihat jadwal Sion (tanpa data
            jemaat). Kalau bocor, buat link baru.
          </p>
          <p>Kegiatan yang berstatus Batal tidak ikut. Untuk satu kegiatan saja, pakai tombol &quot;Ke Google Calendar&quot; di detail kegiatan.</p>
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="danger" onClick={buatBaru} disabled={busy || !token}>
            <RefreshCw size={14} /> Buat link baru
          </Button>
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}
