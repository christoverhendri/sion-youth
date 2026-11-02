import { createClient } from "@supabase/supabase-js";
import { buatIcs, type FeedData } from "@/lib/ics";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Feed kalender untuk langganan Google Calendar. Tanpa login: Google yang mengambilnya,
// jadi akses dijaga oleh token rahasia di URL (tersimpan di tabel app_settings, bisa diganti pengurus).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("kalender_feed", { p_token: token.replace(/\.ics$/i, "") });
  if (error) return new Response("Kalender belum bisa dimuat.", { status: 502 });
  if (!data) return new Response("Link kalender tidak valid atau sudah diganti.", { status: 404 });
  return new Response(buatIcs(data as FeedData), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="sion-youth.ics"',
      "cache-control": "public, max-age=600",
    },
  });
}
