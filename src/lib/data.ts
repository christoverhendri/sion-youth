import type { SupabaseClient } from "@supabase/supabase-js";
import type { IbadahSession } from "./types";
import { fmtDate, isoDate } from "./utils";

/** Ambil semua baris (Supabase membatasi 1000 baris per request) */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await build(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export type Kehadiran = {
  sesi: IbadahSession[]; // sesi Sion yang sudah lewat & ada absensinya, urut naik
  hadir: { session_id: string; jemaat_id: string }[];
};

/** Data kehadiran ibadah N sesi terakhir */
export async function loadKehadiran(sb: SupabaseClient, jumlahSesi = 26): Promise<Kehadiran> {
  const { data: s } = await sb
    .from("ibadah_sessions")
    .select("*")
    .eq("status", "sion")
    .lte("tanggal", isoDate(new Date()))
    .order("tanggal", { ascending: false })
    .limit(jumlahSesi);
  const sesiAll = ((s as IbadahSession[]) ?? []).reverse();
  if (!sesiAll.length) return { sesi: [], hadir: [] };
  const ids = sesiAll.map((x) => x.id);
  const hadir = await fetchAll<{ session_id: string; jemaat_id: string }>((a, b) =>
    sb.from("ibadah_attendance").select("session_id, jemaat_id").in("session_id", ids).range(a, b),
  );
  const ada = new Set(hadir.map((h) => h.session_id));
  return { sesi: sesiAll.filter((x) => ada.has(x.id)), hadir };
}

export function trenKehadiran(k: Kehadiran, denganTamu = true) {
  const per = new Map<string, number>();
  for (const h of k.hadir) per.set(h.session_id, (per.get(h.session_id) ?? 0) + 1);
  return k.sesi.map((s) => ({
    name: fmtDate(s.tanggal, { year: undefined }),
    value: (per.get(s.id) ?? 0) + (denganTamu ? s.jumlah_tamu : 0),
  }));
}
