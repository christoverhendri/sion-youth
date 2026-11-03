"use client";

import { LockOpen } from "lucide-react";
import { CheckIcon } from "./sion";
import { Button } from "./ui";

/**
 * Status simpan absensi. Sebelum disimpan: kapsul "Simpan absensi" menempel di bawah layar.
 * Sesudah disimpan: kapsul kaca dengan centang emas + tombol "Buka lagi" untuk update.
 */
export function SimpanBar({
  disimpanAt,
  disimpanNama,
  jumlah,
  tamu,
  busy,
  onSimpan,
  onBuka,
}: {
  disimpanAt: string | null;
  disimpanNama: string | null;
  jumlah: number;
  tamu?: number;
  busy?: boolean;
  onSimpan: () => void;
  onBuka: () => void;
}) {
  const ringkas = (
    <>
      <b>{jumlah} hadir</b>
      {tamu !== undefined && <> · {tamu} tamu</>}
    </>
  );
  if (disimpanAt) {
    const waktu = new Date(disimpanAt).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="s-savebar">
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#ebd29c] to-gold text-[#1a1408] shadow-[0_8px_24px_-8px_rgba(198,161,91,0.8)]">
            <CheckIcon size={16} />
          </span>
          <div className="min-w-0">
            <div>
              <span className="font-bold text-primary">Tersimpan</span> · {ringkas}
            </div>
            <div className="text-xs text-muted">
              oleh {disimpanNama ?? "-"} · {waktu}. Daftar dikunci.
            </div>
          </div>
        </div>
        <Button size="sm" onClick={onBuka} disabled={busy}>
          <LockOpen size={13} /> Buka lagi
        </Button>
      </div>
    );
  }
  return (
    <div className="s-savebar">
      <span className="text-sm">
        {ringkas} <span className="text-muted">· belum disimpan</span>
      </span>
      <Button variant="primary" onClick={onSimpan} disabled={busy} className="min-h-11 px-6">
        Simpan absensi
      </Button>
    </div>
  );
}
