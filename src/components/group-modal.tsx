"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KATEGORI_GDG, type GdgGroup } from "@/lib/types";
import { Button, ErrorText, Field, Modal } from "./ui";

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
  const [kat, setKat] = useState<string>("SMP");
  const [error, setError] = useState("");

  useEffect(() => {
    setNama(g?.nama ?? "");
    setLeader(g?.leader_name ?? "");
    setKat(g?.target_kategori ?? "SMP");
    setError("");
  }, [value, g]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    const row = { nama, leader_name: leader, target_kategori: kat };
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
          <input className="field" placeholder="Mis. GDG Christo" value={nama} onChange={(e) => setNama(e.target.value)} required />
        </Field>
        <Field label="Nama GDG leader">
          <input className="field" value={leader} onChange={(e) => setLeader(e.target.value)} required />
        </Field>
        <Field label="Grup untuk" hint="Jemaat Kuliah otomatis masuk grup Kerja (bisa dipindah manual).">
          <div className="grid grid-cols-4 gap-2">
            {KATEGORI_GDG.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setKat(k)}
                className={`rounded-xl border py-2 text-sm ${
                  kat === k ? "border-primary bg-primary/20 text-white" : "border-line bg-surface text-muted"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </Field>
        {!g && (
          <p className="text-xs text-muted">
            Jemaat aktif dengan jenjang ini yang belum punya grup akan otomatis dimasukkan ke grup ini.
          </p>
        )}
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
