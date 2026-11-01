"use client";

import { CheckCircle2, LockOpen, Save } from "lucide-react";
import { Button } from "./ui";

/**
 * Status simpan absensi. Sebelum disimpan: tombol "Simpan absensi" menempel di bawah layar.
 * Sesudah disimpan: banner hijau + tombol "Buka lagi" untuk update.
 */
export function SimpanBar({
  disimpanAt,
  disimpanNama,
  jumlah,
  busy,
  onSimpan,
  onBuka,
}: {
  disimpanAt: string | null;
  disimpanNama: string | null;
  jumlah: number;
  busy?: boolean;
  onSimpan: () => void;
  onBuka: () => void;
}) {
  if (disimpanAt) {
    const waktu = new Date(disimpanAt).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-success/30 bg-success/10 px-4 py-3">
        <CheckCircle2 className="shrink-0 text-success" size={20} />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-semibold text-success">Absensi sudah disimpan · {jumlah} hadir</div>
          <div className="text-xs text-muted">
            oleh {disimpanNama ?? "-"} · {waktu}. Daftar dikunci supaya tidak tercentang tidak sengaja.
          </div>
        </div>
        <Button size="sm" onClick={onBuka} disabled={busy}>
          <LockOpen size={13} /> Buka lagi untuk update
        </Button>
      </div>
    );
  }
  return (
    <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/40 bg-surface-solid/95 px-4 py-3 shadow-2xl backdrop-blur">
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-semibold">{jumlah} dicentang · belum disimpan</div>
        <div className="text-xs text-muted">Centangan tersimpan otomatis. Klik simpan kalau absensi sudah selesai.</div>
      </div>
      <Button variant="primary" onClick={onSimpan} disabled={busy}>
        <Save size={15} /> Simpan absensi
      </Button>
    </div>
  );
}
