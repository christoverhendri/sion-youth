import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const PUBLIC_PATHS = ["/login", "/daftar"];

export async function proxy(request: NextRequest) {
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
