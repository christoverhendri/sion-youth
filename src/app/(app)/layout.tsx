import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MeProvider } from "@/components/role";
import { Shell } from "@/components/shell";
import { Loading } from "@/components/ui";
import { getSessionProfile } from "@/lib/supabase/server";

// Halaman di dalam (app) butuh login, jadi dirender per request (membaca cookie sesi).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children }: { children: React.ReactNode }) {
  await connection();
  const me = await getSessionProfile();
  if (!me) redirect("/login");

  return (
    <MeProvider me={me}>
      <Shell>{children}</Shell>
    </MeProvider>
  );
}
