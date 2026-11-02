# Sion Youth Dashboard

Dashboard data jemaat, absensi ibadah, grup GDG, analisis, dan kalender kegiatan Sion Youth.
Next.js + Supabase, di-deploy ke Vercel.

## Fitur

- **Data jemaat**: data master, form pendaftaran publik (`/daftar`), aktif/nonaktif dengan alasan, follow-up WhatsApp + catatan.
- **Absensi ibadah**: usher centang hadir dari HP, lalu **Simpan absensi** (daftar dikunci, bisa dibuka lagi untuk update). Pengurus bisa ubah status minggu: *Ibadah Sion* / *Gabung Umum* / *Libur* (minggu gabung/libur tidak ada absensi dan tidak dihitung).
- **Laporan absensi**: rekap per minggu & per jemaat, export CSV (format seperti spreadsheet lama).
- **Absensi event**: untuk Fun Activity Day, retreat, dll. Event yang sama dipakai di Kalender, bisa disimpan/dikunci seperti absensi ibadah. Menu *Absensi* di sidebar berisi Absensi Ibadah dan Absensi Event.
- **Peringatan lama tidak datang**: 🟡 2 minggu, 🔴 4 minggu ibadah Sion berturut-turut.
- **GDG**: grup punya jenjang + jenis kelamin (mis. *SMP & SMA · Cowok*). Jemaat aktif otomatis masuk grup yang cocok dengan anggota paling sedikit. Pindah manual tidak akan ditimpa sistem. Jadwal otomatis Sabtu minggu ke-2, bisa diubah/dibatalkan per bulan. Kalau GDG digabung, anggota GDG lain bisa ditambahkan ke absensi hari itu.
- **Analisis**: hobi, kemampuan & minat pelayanan, kuliah dalam/luar negeri, proporsi jenjang, absen GDG per grup, jemaat baru per bulan, tren kehadiran, retensi, top pengajak, domisili, kandidat penatalayan.
- **Kalender**: kalender bulanan + timeline proker per bulan.
- **Google Calendar**: tombol *Sinkron Google Calendar* di halaman Kalender memberi link langganan (.ics, satu arah, tanpa API Google). Per kegiatan ada juga tombol *Ke Google Calendar*.
- **Role**: `pengurus` (akses penuh), `penatalayan` (hanya absensi ibadah), `gdg_leader` (absensi ibadah + absensi & anggota grup GDG-nya saja). Data pribadi dilindungi Row Level Security di database.
- **Dark / light mode**: tombol matahari/bulan di sidebar.

## Setup (sekali saja)

1. **Buat project Supabase** di https://supabase.com (region Singapore).
2. Buka **SQL Editor**, jalankan semua file di `supabase/migrations/` berurutan.
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
