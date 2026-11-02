"use client";

import { useEffect, useState } from "react";
import { STATUS_AKADEMIK, type StatusAkademik } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, ErrorText, Field, Modal } from "./ui";

export type JemaatCepat = { nama: string; hp: string; status: StatusAkademik };

/**
 * Dialog "Jemaat baru datang" (nama + WA + jenjang). Dipakai di absensi ibadah dan absensi event.
 * `tambah` menyimpan jemaat sekaligus menandainya hadir, dan mengembalikan pesan error (atau null kalau sukses).
 */
export function TambahCepat({
  open,
  namaAwal,
  tambah,
  onClose,
  onSaved,
}: {
  open: boolean;
  namaAwal: string;
  tambah: (v: JemaatCepat) => Promise<string | null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<StatusAkademik>("SMA");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNama(namaAwal);
      setHp("");
      setError("");
    }
  }, [open, namaAwal]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await tambah({ nama, hp, status });
    setBusy(false);
    if (err) return setError(err);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Jemaat baru datang">
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-muted">
          Isi data singkat saja. Jemaat langsung tercatat hadir. Minta dia isi form lengkap nanti, atau pengurus yang
          melengkapi.
        </p>
        <Field label="Nama lengkap *">
          <input className="field" value={nama} onChange={(e) => setNama(e.target.value)} required autoFocus />
        </Field>
        <Field label="No. WhatsApp">
          <input className="field" inputMode="tel" value={hp} onChange={(e) => setHp(e.target.value)} />
        </Field>
        <Field label="Jenjang">
          <div className="grid grid-cols-5 gap-2">
            {STATUS_AKADEMIK.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-xl border py-2 text-sm",
                  status === s ? "border-primary bg-primary/20 text-ink" : "border-line bg-surface text-muted",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" disabled={busy}>
            Simpan & tandai hadir
          </Button>
        </div>
      </form>
    </Modal>
  );
}
