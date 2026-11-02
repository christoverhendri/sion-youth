import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_SIAP, SUPABASE_URL } from "@/lib/supabase/env";

// /kalender-feed dibaca oleh Google Calendar (tanpa login), dijaga token rahasia di URL
const PUBLIC_PATHS = ["/login", "/daftar", "/kalender-feed"];

// Ditampilkan kalau environment variable Supabase belum di-set di hosting (mis. Vercel)
const HALAMAN_ENV_KOSONG = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Konfigurasi belum lengkap</title></head>
<body style="font-family:system-ui,sans-serif;background:#060a17;color:#e8ecf7;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px">
<div style="max-width:560px;line-height:1.6"><h1 style="font-size:20px">Konfigurasi Supabase belum di-set</h1>
<p>Environment variable <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> kosong.</p>
<p>Di Vercel: <b>Project → Settings → Environment Variables</b>, isi variabel tersebut (plus <code>SUPABASE_SERVICE_ROLE_KEY</code>), lalu <b>Deployments → Redeploy</b>. Variabel <code>NEXT_PUBLIC_*</code> baru terbaca setelah build ulang.</p></div></body></html>`;

export async function proxy(request: NextRequest) {
  if (!SUPABASE_SIAP) {
    return new NextResponse(HALAMAN_ENV_KOSONG, { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Penatalayan (usher) hanya boleh membuka absensi; GDG leader absensi + grup GDG-nya.
  // Data tetap dilindungi RLS di database; ini hanya pengalihan halaman.
  if (user && !isPublic && !path.startsWith("/absensi")) {
    const { data } = await supabase.from("profiles").select("role, gdg_group_id").eq("id", user.id).single();
    const leaderOk = data?.role === "gdg_leader" && path.startsWith("/gdg");
    if (data?.role !== "pengurus" && !leaderOk) {
      const url = request.nextUrl.clone();
      url.pathname = data?.role === "gdg_leader" && data.gdg_group_id ? `/gdg/${data.gdg_group_id}` : "/absensi";
      return NextResponse.redirect(url);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
