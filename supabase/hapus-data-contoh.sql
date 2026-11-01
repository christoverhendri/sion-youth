-- Hapus semua data contoh (jalankan di Supabase SQL Editor sebelum input data asli)
delete from jemaat where catatan = 'Data contoh';
delete from ibadah_sessions where tanggal < '2026-11-01';
delete from gdg_sessions where bulan < '2026-11-01';
delete from gdg_groups where nama in ('GDG Christo', 'GDG Grace', 'GDG Daniel', 'GDG Andre');
delete from activities;
