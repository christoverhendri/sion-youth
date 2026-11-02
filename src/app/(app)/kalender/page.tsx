"use client";

import { CalendarPlus, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardTitle, Empty, ErrorText, Field, Modal, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { googleCalendarUrl } from "@/lib/ics";
import type { Activity } from "@/lib/types";
import { addMonths, cn, firstOfMonth, fmtDate, fmtMonth, isoDate, parseDate } from "@/lib/utils";

const WARNA: Record<string, string> = {
  blue: "#3987e5",
  orange: "#d95926",
  aqua: "#199e70",
  yellow: "#c98500",
  magenta: "#d55181",
  violet: "#9085e9",
};
const STATUS_COLOR = { rencana: "gray", berjalan: "blue", selesai: "green", batal: "red" } as const;
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function KalenderPage() {
  const [bulan, setBulan] = useState(firstOfMonth());
  const [acts, setActs] = useState<Activity[]>([]);
  const [edit, setEdit] = useState<Activity | "new" | null>(null);
  const [sinkron, setSinkron] = useState(false);
  const [tahun, setTahun] = useState(new Date().getFullYear());

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

  // Grid kalender: mulai dari hari Minggu sebelum tanggal 1
  const days = useMemo(() => {
    const first = parseDate(bulan);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return isoDate(d);
    });
  }, [bulan]);
  const today = isoDate(new Date());

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

  return (
    <>
      <PageHeader
        title="Kalender Kegiatan"
        sub="Program kerja & timeline Sion Youth"
        action={
          <>
            <Button onClick={() => setSinkron(true)}>
              <RefreshCw size={16} /> Sinkron Google Calendar
            </Button>
            <Button variant="primary" onClick={() => setEdit("new")}>
              <Plus size={16} /> Tambah kegiatan
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <CardTitle
          action={
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => setBulan(firstOfMonth())}>
                Hari ini
              </Button>
              <button className="rounded-lg p-1.5 hover:bg-tint/10" onClick={() => setBulan(addMonths(bulan, -1))}>
                <ChevronLeft size={18} />
              </button>
              <button className="rounded-lg p-1.5 hover:bg-tint/10" onClick={() => setBulan(addMonths(bulan, 1))}>
                <ChevronRight size={18} />
              </button>
            </div>
          }
        >
          <span className="text-lg capitalize">{fmtMonth(bulan)}</span>
        </CardTitle>
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 overflow-hidden rounded-xl border border-line">
            {HARI.map((h) => (
              <div key={h} className="border-b border-line bg-tint/[0.03] px-2 py-2 text-center text-xs text-muted">
                {h}
              </div>
            ))}
            {days.map((d, i) => {
              const inMonth = d.slice(0, 7) === bulan.slice(0, 7);
              const list = acts.filter((a) => a.mulai <= d && a.selesai >= d);
              return (
                <div
                  key={d}
                  className={cn(
                    "min-h-[92px] border-line p-1.5",
                    i % 7 !== 6 && "border-r",
                    i < 35 && "border-b",
                    !inMonth && "bg-black/20",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 grid h-6 w-6 place-items-center rounded-full text-xs",
                      d === today ? "bg-primary font-semibold text-white" : inMonth ? "text-ink" : "text-faint",
                    )}
                  >
                    {Number(d.slice(8))}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setEdit(a)}
                        title={a.nama}
                        className={cn(
                          "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white",
                          a.status === "batal" && "line-through opacity-50",
                        )}
                        style={{ background: WARNA[a.warna] ?? WARNA.blue }}
                      >
                        {a.mulai === d || d.endsWith("-01") || parseDate(d).getDay() === 0 ? a.nama : " "}
                      </button>
                    ))}
                    {list.length > 3 && <div className="text-[10px] text-muted">+{list.length - 3} lagi</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle
          sub="Semua program kerja dikelompokkan per bulan"
          action={
            <div className="flex items-center gap-1">
              <button className="rounded-lg p-1.5 hover:bg-tint/10" onClick={() => setTahun(tahun - 1)}>
                <ChevronLeft size={16} />
              </button>
              <span className="px-1 text-sm font-medium">{tahun}</span>
              <button className="rounded-lg p-1.5 hover:bg-tint/10" onClick={() => setTahun(tahun + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          }
        >
          Timeline proker {tahun}
        </CardTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {perBulan.map(({ m, list }) => (
            <div key={m} className="rounded-xl border border-line bg-surface p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {parseDate(m).toLocaleDateString("id-ID", { month: "long" })}
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-faint">-</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((a) => (
                    <li key={a.id}>
                      <button onClick={() => setEdit(a)} className="w-full text-left">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: WARNA[a.warna] }} />
                          <span className="flex-1 truncate text-sm font-medium">{a.nama}</span>
                          <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                        </div>
                        <div className="pl-4 text-[11px] text-muted">
                          {fmtDate(a.mulai, { year: undefined })}
                          {a.selesai !== a.mulai && ` – ${fmtDate(a.selesai, { year: undefined })}`}
                          {a.pic && ` · ${a.pic}`}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        {acts.length === 0 && (
          <div className="mt-4">
            <Empty>Belum ada kegiatan di tahun {tahun}.</Empty>
          </div>
        )}
      </Card>

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
                className={cn("h-7 w-7 rounded-full border-2", f.warna === k ? "border-ink" : "border-transparent")}
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
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium transition hover:border-line-strong hover:bg-tint/10"
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
          <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-warning">
            Kamu membuka dari <b>localhost</b>, jadi Google tidak bisa mengakses link ini. Buka dashboard dari alamat
            yang sudah online (Vercel), lalu salin linknya dari sana.
          </p>
        )}
        <ErrorText>{error}</ErrorText>

        <ol className="space-y-2 rounded-xl border border-line bg-surface p-4 text-muted">
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
