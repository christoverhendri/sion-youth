export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Supabase baru memakai "publishable key"; proyek lama memakai "anon key". Keduanya didukung.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Login memakai username. Di Supabase Auth disimpan sebagai email palsu <username>@sion.local
export const USERNAME_DOMAIN = "sion.local";
export function usernameToEmail(username: string) {
  const u = username.trim().toLowerCase();
  return u.includes("@") ? u : `${u}@${USERNAME_DOMAIN}`;
}
