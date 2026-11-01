"use server";

import { usernameToEmail } from "@/lib/supabase/env";
import { createAdminClient, getSessionProfile, type Role } from "@/lib/supabase/server";

async function wajibPengurus() {
  const me = await getSessionProfile();
  if (me?.role !== "pengurus") throw new Error("Hanya pengurus yang boleh mengelola akun");
  return me;
}

export type Akun = {
  id: string;
  username: string;
  full_name: string | null;
  role: Role;
  gdg_group_id: string | null;
  last_sign_in_at: string | null;
};

export async function listAkun(): Promise<Akun[]> {
  await wajibPengurus();
  const admin = createAdminClient();
  const [{ data: profiles }, { data: users }] = await Promise.all([
    admin.from("profiles").select("id, username, full_name, role, gdg_group_id").order("role").order("username"),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);
  return (profiles ?? []).map((p) => ({
    ...(p as Omit<Akun, "last_sign_in_at">),
    last_sign_in_at: users?.users.find((u) => u.id === p.id)?.last_sign_in_at ?? null,
  }));
}

export async function buatAkun(input: {
  username: string;
  full_name: string;
  role: Role;
  password: string;
  gdg_group_id: string;
}) {
  await wajibPengurus();
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { error: "Username 3-30 karakter: huruf kecil, angka, titik, - atau _" };
  if (input.password.length < 8) return { error: "Password minimal 8 karakter" };
  if (input.role === "gdg_leader" && !input.gdg_group_id) return { error: "Pilih grup GDG untuk leader" };
  const { error } = await createAdminClient().auth.admin.createUser({
    email: usernameToEmail(username),
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username,
      full_name: input.full_name || null,
      role: input.role,
      gdg_group_id: input.role === "gdg_leader" ? input.gdg_group_id : null,
    },
  });
  if (error) return { error: error.message.includes("already") ? "Username sudah dipakai" : error.message };
  return { error: null };
}

export async function gantiPassword(id: string, password: string) {
  await wajibPengurus();
  if (password.length < 8) return { error: "Password minimal 8 karakter" };
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  return { error: error?.message ?? null };
}

export async function hapusAkun(id: string) {
  const me = await wajibPengurus();
  if (me.id === id) return { error: "Tidak bisa menghapus akun sendiri" };
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  return { error: error?.message ?? null };
}
