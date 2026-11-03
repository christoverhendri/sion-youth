"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pesanFollowUp, waLink } from "@/lib/utils";
import { useMe } from "./role";
import { Button, Field, Modal } from "./ui";

/**
 * Tombol follow-up WhatsApp. Membuka chat WA dengan pesan template,
 * lalu meminta pengurus mencatat hasilnya supaya tidak di-WA dobel.
 */
export function FollowUpButton({
  jemaat,
  pesan,
  label = "Follow up",
  onLogged,
}: {
  jemaat: { id: string; nama: string; no_hp: string | null; no_hp_ortu?: string | null };
  pesan?: string;
  label?: string;
  onLogged?: () => void;
}) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [hasil, setHasil] = useState("");
  const hp = jemaat.no_hp ?? jemaat.no_hp_ortu ?? null;
  const link = waLink(hp, pesan ?? pesanFollowUp(jemaat.nama));

  async function log() {
    await createClient()
      .from("followups")
      .insert({ jemaat_id: jemaat.id, oleh: me.id, oleh_nama: me.full_name ?? me.username, hasil: hasil || null });
    setOpen(false);
    setHasil("");
    onLogged?.();
  }

  if (!link)
    return (
      <span className="text-[11px] text-faint" title="Nomor WA belum diisi">
        No. WA kosong
      </span>
    );

  return (
    <>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        onClick={() => setTimeout(() => setOpen(true), 400)}
        className="s-wa"
      >
        <MessageCircle size={14} /> {label}
      </a>
      <Modal open={open} onClose={() => setOpen(false)} title={`Catat follow-up ${jemaat.nama}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Supaya pengurus lain tahu {jemaat.nama.split(" ")[0]} sudah dihubungi.
            {!jemaat.no_hp && jemaat.no_hp_ortu ? " (Dikirim ke nomor orang tua.)" : ""}
          </p>
          <Field label="Hasil / catatan (opsional)">
            <input
              className="field"
              placeholder="Mis. lagi sibuk ujian, minggu depan datang"
              value={hasil}
              onChange={(e) => setHasil(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)}>Lewati</Button>
            <Button variant="primary" onClick={log}>
              Simpan catatan
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
