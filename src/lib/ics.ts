// Pembuat file kalender (.ics) untuk langganan Google Calendar / Apple Calendar.
// Semua acara dibuat sebagai acara seharian (tanpa jam), sesuai data kegiatan yang hanya punya tanggal.

export type FeedData = {
  activities: {
    id: string;
    nama: string;
    deskripsi: string | null;
    mulai: string;
    selesai: string;
    pic: string | null;
  }[];
  gdg: { id: string; grup: string; leader: string; tanggal: string; catatan: string | null }[];
};

/** 2026-11-21 -> 20261121 */
export function ymd(iso: string) {
  return iso.slice(0, 10).replaceAll("-", "");
}

/** Tanggal berikutnya (format 20261122). Di iCalendar, DTEND acara seharian itu eksklusif. */
export function hariBerikut(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replaceAll("-", "");
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Baris iCalendar maksimal 75 byte; sisanya disambung di baris berikutnya diawali spasi. */
function lipat(line: string) {
  const enc = new TextEncoder();
  let out = "";
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 75) {
      out += cur + "\r\n";
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += n;
  }
  return out + cur;
}

export function buatIcs(f: FeedData, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const L = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sion Youth//Dashboard//ID",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Sion Youth",
    "X-WR-TIMEZONE:Asia/Jakarta",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  const acara = (uid: string, judul: string, mulai: string, selesai: string, deskripsi: string) => {
    L.push(
      "BEGIN:VEVENT",
      `UID:${uid}@sion-youth`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(mulai)}`,
      `DTEND;VALUE=DATE:${hariBerikut(selesai)}`,
      `SUMMARY:${esc(judul)}`,
    );
    if (deskripsi) L.push(`DESCRIPTION:${esc(deskripsi)}`);
    L.push("TRANSP:TRANSPARENT", "END:VEVENT");
  };

  for (const a of f.activities) {
    const desk = [a.deskripsi, a.pic ? `PIC: ${a.pic}` : ""].filter(Boolean).join("\n");
    acara(a.id, a.nama, a.mulai, a.selesai, desk);
  }
  for (const g of f.gdg) {
    const desk = [`Leader: ${g.leader}`, g.catatan].filter(Boolean).join("\n");
    acara(`gdg-${g.id}`, g.grup, g.tanggal, g.tanggal, desk);
  }
  L.push("END:VCALENDAR");
  return L.map(lipat).join("\r\n") + "\r\n";
}

/** Link "Tambah ke Google Calendar" untuk satu kegiatan (tanpa API, cukup buka link). */
export function googleCalendarUrl(a: { nama: string; mulai: string; selesai: string; deskripsi?: string | null; pic?: string | null }) {
  const details = [a.deskripsi, a.pic ? `PIC: ${a.pic}` : ""].filter(Boolean).join("\n");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: a.nama,
    dates: `${ymd(a.mulai)}/${hariBerikut(a.selesai)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
