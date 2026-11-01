// Membuat akun pertama: 1 pengurus + akun usher bersama.
// Pakai: node --env-file=.env.local scripts/buat-akun-awal.mjs <username-pengurus> <password-pengurus>
import { createClient } from "@supabase/supabase-js";

const [, , username, password] = process.argv;
if (!username || !password) {
  console.error("Pakai: node --env-file=.env.local scripts/buat-akun-awal.mjs <username-pengurus> <password-pengurus>");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const akun = [
  { username, password, role: "pengurus", full_name: username },
  // Akun usher bersama. Ganti password-nya dari halaman Pengaturan setelah login.
  { username: "usher", password: "12345678", role: "penatalayan", full_name: "Usher" },
];

for (const a of akun) {
  const { error } = await admin.auth.admin.createUser({
    email: `${a.username.toLowerCase()}@sion.local`,
    password: a.password,
    email_confirm: true,
    user_metadata: { username: a.username.toLowerCase(), full_name: a.full_name, role: a.role },
  });
  console.log(error ? `✗ ${a.username}: ${error.message}` : `✓ ${a.username} (${a.role})`);
}
