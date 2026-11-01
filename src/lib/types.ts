export type StatusAkademik = "SD" | "SMP" | "SMA" | "Kuliah" | "Kerja";
export const STATUS_AKADEMIK: StatusAkademik[] = ["SD", "SMP", "SMA", "Kuliah", "Kerja"];
export const KATEGORI_GDG = ["SD", "SMP", "SMA", "Kerja"] as const;
export type KategoriGdg = (typeof KATEGORI_GDG)[number];

export const ALASAN_NONAKTIF = [
  "Kuliah luar kota",
  "Kuliah luar negeri",
  "Pindah kota",
  "Pindah gereja",
  "Tidak bisa dihubungi",
  "Lainnya",
];

export type Jemaat = {
  id: string;
  nama: string;
  jenis_kelamin: "L" | "P" | null;
  tanggal_lahir: string | null;
  no_hp: string | null;
  no_hp_ortu: string | null;
  alamat: string | null;
  kecamatan: string | null;
  status_akademik: StatusAkademik;
  kelas: number | null;
  institusi: string | null;
  lokasi_studi: "Dalam Negeri" | "Luar Negeri" | null;
  kota_studi: string | null;
  hobi: string[];
  sumber_info: string | null;
  diajak_oleh: string | null;
  diajak_oleh_nama: string | null;
  status: "aktif" | "nonaktif";
  alasan_nonaktif: string | null;
  tanggal_nonaktif: string | null;
  tanggal_bergabung: string;
  gdg_group_id: string | null;
  gdg_manual: boolean;
  sumber_input: "form" | "manual" | "absensi" | "import";
  perlu_review: boolean;
  persetujuan_data: boolean;
  catatan: string | null;
  created_at: string;
};

export type Pelayanan = { jemaat_id: string; bidang: string; level: "bisa" | "mau_belajar" };

export type GdgGroup = {
  id: string;
  nama: string;
  leader_name: string;
  target_kategori: KategoriGdg;
  is_active: boolean;
  created_at: string;
};

export type GdgSession = {
  id: string;
  group_id: string;
  bulan: string;
  tanggal: string;
  status: "terjadwal" | "batal";
  catatan: string | null;
};

export type IbadahSession = {
  id: string;
  tanggal: string;
  status: "sion" | "gabung" | "libur";
  catatan: string | null;
  jumlah_tamu: number;
};

export type AbsenRow = {
  id: string;
  nama: string;
  no_hp: string | null;
  no_hp_ortu: string | null;
  status_akademik: StatusAkademik;
  gdg_group_id: string | null;
  terakhir_hadir: string | null;
  absen_beruntun: number;
  terakhir_followup: string | null;
};

export type Activity = {
  id: string;
  nama: string;
  deskripsi: string | null;
  mulai: string;
  selesai: string;
  pic: string | null;
  status: "rencana" | "berjalan" | "selesai" | "batal";
  warna: string;
};

export type Opsi = { id: number; tipe: "hobi" | "sumber" | "bidang"; label: string; urutan: number };
