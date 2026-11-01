import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: cookie di-refresh oleh proxy.
        }
      },
    },
  });
}

// Klien service role: HANYA dipakai di server untuk mengelola akun.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum di-set");
  return createAdmin(SUPABASE_URL, key, { auth: { persistSession: false } });
}

export type Role = "pengurus" | "penatalayan" | "gdg_leader";
export type Me = { id: string; username: string; full_name: string | null; role: Role; gdg_group_id: string | null };

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, gdg_group_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return profile as Me;
}
