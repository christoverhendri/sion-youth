"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_AKADEMIK, type GdgGroup, type StatusAkademik } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Chips, ErrorText, Field, Modal } from "./ui";

export function GroupModal({
  value,
  onClose,
  onSaved,
}: {
  value: GdgGroup | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const g = value && value !== "new" ? value : null;
  const [nama, setNama] = useState("");
  const [leader, setLeader] = useState("");
  const [jenjang, setJenjang] = useState<StatusAkademik[]>(["SMP", "SMA"]);
  const [jk, setJk] = useState<"" | "L" | "P">("");
  const [error, setError] = useState("");

  useEffect(() => {
    setNama(g?.nama ?? "");
    setLeader(g?.leader_name ?? "");
    setJenjang(g?.jenjang ?? ["SMP", "SMA"]);
    setJk(g?.jenis_kelamin ?? "");
    setError("");
  }, [value, g]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!jenjang.length) return setError("Pilih minimal satu jenjang.");
    const sb = createClient();
    const row = { nama, leader_name: leader, jenjang, jenis_kelamin: jk || null };
    const { error } = g
      ? await sb.from("gdg_groups").update(row).eq("id", g.id)
      : await sb.from("gdg_groups").insert(row);
    if (error) return setError(error.message);
    onSaved();
    onClose();
  }

  return (
    <Modal open={!!value} onClose={onClose} title={g ? "Edit grup" : "Grup GDG baru"}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Nama grup">
          <input className="field" placeholder="Mis. GDG Christoper" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </Field>
        <Field label="Nama GDG leader">
          <input className="field" value={leader} onChange={(e) => setLeader(e.target.value)} required />
        </Field>
        <Field label="Untuk jenjang (boleh lebih dari satu)">
          <Chips options={STATUS_AKADEMIK} value={jenjang} onChange={(v) => setJenjang(v as StatusAkademik[])} />
        </Field>
        <Field label="Untuk">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["L", "Cowok"],
                ["P", "Cewek"],
                ["", "Campur"],
              ] as const
            ).map(([v, l]) => (
              <button
                type="button"
                key={v}
                onClick={() => setJk(v)}
                className={cn(
                  "rounded-xl border py-2 text-sm",
                  jk === v ? "border-primary bg-primary/20 text-ink" : "border-line bg-surface text-muted",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <p className="text-xs text-muted">
          Jemaat aktif yang jenjang & jenis kelaminnya cocok otomatis masuk grup ini (dipilih grup dengan anggota
          paling sedikit). Pengurus tetap bisa memindah manual.
        </p>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}
