# Sion Youth Dashboard

Dashboard data jemaat, absensi ibadah, grup GDG, analisis, dan kalender kegiatan Sion Youth.
Next.js + Supabase, di-deploy ke Vercel.

## Fitur

- **Data jemaat**: data master, form pendaftaran publik (`/daftar`), aktif/nonaktif dengan alasan, follow-up WhatsApp + catatan.
- **Absensi ibadah**: usher centang hadir dari HP. Pengurus bisa ubah status minggu: *Ibadah Sion* / *Gabung Umum* / *Libur* (minggu gabung/libur tidak ada absensi dan tidak dihitung).
- **Peringatan lama tidak datang**: 🟡 2 minggu, 🔴 4 minggu ibadah Sion berturut-turut.
- **GDG**: jemaat aktif otomatis masuk grup sesuai jenjang (Kuliah → Kerja), pilih grup dengan anggota paling sedikit. Pindah manual tidak akan ditimpa sistem. Jadwal otomatis Sabtu minggu ke-2, bisa diubah/dibatalkan per bulan.
- **Analisis**: hobi, kemampuan & minat pelayanan, kuliah dalam/luar negeri, proporsi jenjang, absen GDG per grup, jemaat baru per bulan, tren kehadiran, retensi, top pengajak, domisili, kandidat penatalayan.
- **Kalender**: kalender bulanan + timeline proker per bulan.
- **Role**: `pengurus` (akses penuh) dan `penatalayan` (hanya absensi). Data pribadi dilindungi Row Level Security di database.

## Setup (sekali saja)

1. **Buat project Supabase** di https://supabase.com (region Singapore).
2. Buka **SQL Editor**, tempel isi `supabase/migrations/20261101000001_init.sql`, lalu **Run**.
3. Salin `.env.example` → `.env.local`, isi dari *Project Settings → API*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (atau anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (rahasia, jangan dibagikan)
4. Buat akun pertama (1 pengurus + akun `usher`):
   ```bash
   node --env-file=.env.local scripts/buat-akun-awal.mjs admin PasswordKamuYangKuat
   ```
5. Jalankan lokal: `npm install` lalu `npm run dev` → http://localhost:3000

## Deploy ke Vercel

1. Push folder ini ke GitHub.
2. Di Vercel: *Add New Project* → pilih repo → isi 3 environment variable di atas → Deploy.
3. Bagikan `https://<domain-kamu>/daftar` ke jemaat sebagai pengganti Google Form.

## Rutinitas

- **Tiap Minggu**: usher login → Absensi → centang.
- **Tiap minggu (pengurus)**: cek Dashboard → "Lama tidak datang" → follow up WA.
- **Data baru dari form**: Data Jemaat → tab "Perlu review" → cek & simpan.
- **Tahun ajaran baru (Juli)**: Pengaturan → "Naikkan kelas semua pelajar" (sekali setahun).
