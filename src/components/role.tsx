"use client";

import { createContext, useContext } from "react";
import type { Me } from "@/lib/supabase/server";

const MeContext = createContext<Me | null>(null);

export function MeProvider({ me, children }: { me: Me; children: React.ReactNode }) {
  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

export function useMe() {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe dipakai di luar MeProvider");
  return me;
}
