import type { Jemaat } from "./types";

// Ambang peringatan "lama tidak datang" (jumlah sesi Sion berturut-turut)
export const ABSEN_KUNING = 2;
export const ABSEN_MERAH = 4;

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Tanggal lokal (bukan UTC) dalam format YYYY-MM-DD */
export function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDate(s: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!s) return "-";
  return parseDate(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", ...opts });
}

export function fmtMonth(s: string) {
  return parseDate(s).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function umur(tgl: string | null) {
  if (!tgl) return null;
  const b = parseDate(tgl);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--;
  return a;
}

/** Minggu terdekat yang sudah lewat (atau hari ini kalau Minggu) */
export function mingguIni(d = new Date()) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  return isoDate(x);
}

export function firstOfMonth(d = new Date()) {
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonths(iso: string, n: number) {
  const d = parseDate(iso);
  return isoDate(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

export function jenjang(j: Pick<Jemaat, "status_akademik" | "kelas">) {
  if (j.kelas) {
    const k = j.status_akademik === "SMP" ? j.kelas - 6 : j.status_akademik === "SMA" ? j.kelas - 9 : j.kelas;
    return `${j.status_akademik} kelas ${k}`;
  }
  return j.status_akademik;
}

/** Link WhatsApp dengan pesan otomatis */
export function waLink(hp: string | null, pesan: string) {
  if (!hp) return null;
  return `https://wa.me/${hp}?text=${encodeURIComponent(pesan)}`;
}

export function pesanFollowUp(nama: string) {
  const panggil = nama.split(" ")[0];
  return `Halo ${panggil}! Ini dari Sion Youth 😊 Kita kangen nih udah beberapa minggu nggak ketemu. Gimana kabarnya? Semoga sehat-sehat ya. Ditunggu di ibadah Sion minggu ini, Tuhan Yesus memberkati 🙏`;
}

export function pesanUltah(nama: string) {
  const panggil = nama.split(" ")[0];
  return `Selamat ulang tahun ${panggil}! 🎉 Dari keluarga Sion Youth, kiranya Tuhan Yesus memberkati, menyertai, dan memakai hidupmu di tahun yang baru ini 🙏`;
}

export function hpTampil(hp: string | null) {
  if (!hp) return "-";
  return hp.startsWith("62") ? "0" + hp.slice(2) : hp;
}

export function countBy<T>(rows: T[], key: (r: T) => string | string[] | null | undefined) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    const ks = Array.isArray(k) ? k : k ? [k] : [];
    for (const x of ks) m.set(x, (m.get(x) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
