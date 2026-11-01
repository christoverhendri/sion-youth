"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALASAN_NONAKTIF, type GdgGroup, type Jemaat, type Pelayanan } from "@/lib/types";
import { draftFromJemaat, draftToRow, emptyDraft, JemaatFields, type JemaatDraft } from "./jemaat-form";
import { Button, ErrorText, Field, Modal } from "./ui";

/** Modal tambah / edit jemaat (khusus pengurus) */
export function JemaatEditor({
  open,
  jemaat,
  groups,
  onClose,
  onSaved,
}: {
  open: boolean;
  jemaat: Jemaat | null; // null = tambah baru
  groups: GdgGroup[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<JemaatDraft>(emptyDraft);
  const [gdg, setGdg] = useState<string>("auto");
  const [bergabung, setBergabung] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (!jemaat) {
      setD(emptyDraft);
      setGdg("auto");
      setBergabung("");
      return;
    }
    setGdg(jemaat.gdg_manual && jemaat.gdg_group_id ? jemaat.gdg_group_id : "auto");
    setBergabung(jemaat.tanggal_bergabung);
    createClient()
      .from("jemaat_pelayanan")
      .select("*")
      .eq("jemaat_id", jemaat.id)
      .then(({ data }) => setD(draftFromJemaat(jemaat, (data as Pelayanan[]) ?? [])));
  }, [open, jemaat]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const sb = createClient();
    const row = {
      ...draftToRow(d),
      ...(bergabung ? { tanggal_bergabung: bergabung } : {}),
      gdg_manual: gdg !== "auto",
      // Otomatis: kosongkan supaya aturan di database memilih grup
      gdg_group_id: gdg === "auto" ? (jemaat && !jemaat.gdg_manual ? jemaat.gdg_group_id : null) : gdg,
      perlu_review: false,
    };
    const res = jemaat
      ? await sb.from("jemaat").update(row).eq("id", jemaat.id).select("id").single()
      : await sb.from("jemaat").insert(row).select("id").single();
    if (res.error) {
      setBusy(false);
      return setError(res.error.message);
    }
    const id = res.data.id as string;
    await sb.from("jemaat_pelayanan").delete().eq("jemaat_id", id);
    const pel = Object.entries(d.pelayanan).map(([bidang, level]) => ({ jemaat_id: id, bidang, level }));
    if (pel.length) await sb.from("jemaat_pelayanan").insert(pel);
    setBusy(false);
    onSaved();
    onClose();
  }

  const aktifGroups = groups.filter((g) => g.is_active);

  return (
    <Modal open={open} onClose={onClose} title={jemaat ? `Edit ${jemaat.nama}` : "Tambah jemaat"} wide>
      <form onSubmit={save} className="space-y-8">
        <JemaatFields value={d} onChange={setD} />
        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Keanggotaan</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Grup GDG"
              hint="Otomatis = dipilih sistem sesuai jenjang. Pilih grup tertentu untuk memindah manual."
            >
              <select className="field" value={gdg} onChange={(e) => setGdg(e.target.value)}>
                <option value="auto">Otomatis (sesuai jenjang)</option>
                {aktifGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama} · {g.target_kategori} · {g.leader_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal bergabung" hint="Kosongkan = hari ini">
              <input
                type="date"
                className="field"
                value={bergabung}
                onChange={(e) => setBergabung(e.target.value)}
              />
            </Field>
          </div>
        </fieldset>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Modal nonaktifkan jemaat */
export function NonaktifModal({
  jemaat,
  onClose,
  onSaved,
}: {
  jemaat: Jemaat | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [alasan, setAlasan] = useState(ALASAN_NONAKTIF[0]);
  const [ket, setKet] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAlasan(ALASAN_NONAKTIF[0]);
    setKet("");
  }, [jemaat]);

  async function save() {
    if (!jemaat) return;
    setBusy(true);
    const kuliah = alasan.startsWith("Kuliah");
    await createClient()
      .from("jemaat")
      .update({
        status: "nonaktif",
        alasan_nonaktif: ket ? `${alasan} – ${ket}` : alasan,
        ...(kuliah
          ? {
              status_akademik: "Kuliah",
              lokasi_studi: alasan === "Kuliah luar negeri" ? "Luar Negeri" : "Dalam Negeri",
              kota_studi: ket || jemaat.kota_studi,
            }
          : {}),
      })
      .eq("id", jemaat.id);
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={!!jemaat} onClose={onClose} title={`Nonaktifkan ${jemaat?.nama ?? ""}`}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Jemaat nonaktif tidak muncul di absensi, grup GDG, dan peringatan &quot;lama tidak datang&quot;. Riwayatnya
          tetap tersimpan dan bisa diaktifkan lagi kapan saja.
        </p>
        <Field label="Alasan">
          <select className="field" value={alasan} onChange={(e) => setAlasan(e.target.value)}>
            {ALASAN_NONAKTIF.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label={alasan.startsWith("Kuliah") ? "Kota / negara kuliah" : "Keterangan (opsional)"}>
          <input className="field" value={ket} onChange={(e) => setKet(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="danger" onClick={save} disabled={busy}>
            Nonaktifkan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
