-- =====================================================================
-- Sion Youth — skema awal
-- Jalankan di Supabase SQL Editor (atau `supabase db push`).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profil & role
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  full_name   text,
  role        text not null default 'penatalayan'
              check (role in ('pengurus', 'penatalayan')),
  created_at  timestamptz not null default now()
);

-- Buat profil otomatis saat akun auth dibuat.
-- username & role dibaca dari user_metadata (diisi oleh halaman Kelola Akun).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'penatalayan')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_pengurus()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'pengurus' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2. Opsi pilihan baku (hobi, sumber info, bidang pelayanan)
--    Disimpan di tabel supaya pengurus bisa menambah opsi tanpa ubah kode.
-- ---------------------------------------------------------------------
create table public.opsi (
  id      bigint generated always as identity primary key,
  tipe    text not null check (tipe in ('hobi', 'sumber', 'bidang')),
  label   text not null,
  urutan  int  not null default 0,
  unique (tipe, label)
);

insert into public.opsi (tipe, label, urutan) values
  ('hobi', 'Olahraga', 1), ('hobi', 'Musik', 2), ('hobi', 'Menyanyi', 3),
  ('hobi', 'Gaming', 4), ('hobi', 'Membaca', 5), ('hobi', 'Menggambar / Desain', 6),
  ('hobi', 'Fotografi / Video', 7), ('hobi', 'Masak / Kuliner', 8),
  ('hobi', 'Nonton Film', 9), ('hobi', 'Traveling / Outdoor', 10), ('hobi', 'Dance', 11),
  ('sumber', 'Diajak teman', 1), ('sumber', 'Keluarga / Orang tua', 2),
  ('sumber', 'Instagram', 3), ('sumber', 'TikTok', 4), ('sumber', 'Ibadah umum', 5),
  ('sumber', 'Event Sion', 6), ('sumber', 'Sekolah / Kampus', 7),
  ('bidang', 'Worship Leader / Singer', 1), ('bidang', 'Pemusik', 2),
  ('bidang', 'Multimedia', 3), ('bidang', 'Sound System', 4),
  ('bidang', 'Usher / Penyambut', 5), ('bidang', 'Dokumentasi', 6),
  ('bidang', 'Media Sosial', 7), ('bidang', 'MC', 8), ('bidang', 'Doa', 9),
  ('bidang', 'Acara / Event', 10);

-- ---------------------------------------------------------------------
-- 3. Grup GDG
-- ---------------------------------------------------------------------
create table public.gdg_groups (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null,
  leader_name     text not null,
  target_kategori text not null check (target_kategori in ('SD', 'SMP', 'SMA', 'Kerja')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Data jemaat (master)
-- ---------------------------------------------------------------------
create table public.jemaat (
  id                uuid primary key default gen_random_uuid(),
  nama              text not null,
  jenis_kelamin     text check (jenis_kelamin in ('L', 'P')),
  tanggal_lahir     date,
  no_hp             text,               -- disimpan format 62xxxxxxxx
  no_hp_ortu        text,
  alamat            text,
  kecamatan         text,
  -- Status akademik. Kelas 1-12 untuk pelajar (SD 1-6, SMP 7-9, SMA 10-12).
  status_akademik   text not null default 'SMA'
                    check (status_akademik in ('SD', 'SMP', 'SMA', 'Kuliah', 'Kerja')),
  kelas             smallint check (kelas between 1 and 12),
  institusi         text,               -- nama sekolah / kampus / kantor
  lokasi_studi      text check (lokasi_studi in ('Dalam Negeri', 'Luar Negeri')),
  kota_studi        text,
  hobi              text[] not null default '{}',
  sumber_info       text,
  diajak_oleh       uuid references public.jemaat (id) on delete set null,
  diajak_oleh_nama  text,               -- isian bebas dari form, nanti bisa dihubungkan ke diajak_oleh
  -- Status keanggotaan
  status            text not null default 'aktif' check (status in ('aktif', 'nonaktif')),
  alasan_nonaktif   text,
  tanggal_nonaktif  date,
  tanggal_bergabung date not null default current_date,
  -- GDG
  gdg_group_id      uuid references public.gdg_groups (id) on delete set null,
  gdg_manual        boolean not null default false,  -- true = dipindah manual, jangan diubah otomatis
  -- Lain-lain
  sumber_input      text not null default 'manual' check (sumber_input in ('form', 'manual', 'absensi', 'import')),
  perlu_review      boolean not null default false,   -- data dari form/usher yang belum dicek pengurus
  persetujuan_data  boolean not null default false,
  catatan           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index jemaat_status_idx on public.jemaat (status);
create index jemaat_gdg_idx on public.jemaat (gdg_group_id) where status = 'aktif';
create index jemaat_bergabung_idx on public.jemaat (tanggal_bergabung);

-- Minat pelayanan: satu baris per (jemaat, bidang) dengan level bisa / mau belajar.
create table public.jemaat_pelayanan (
  jemaat_id uuid not null references public.jemaat (id) on delete cascade,
  bidang    text not null,
  level     text not null check (level in ('bisa', 'mau_belajar')),
  primary key (jemaat_id, bidang)
);

-- Riwayat perpindahan grup GDG
create table public.gdg_history (
  id          bigint generated always as identity primary key,
  jemaat_id   uuid not null references public.jemaat (id) on delete cascade,
  dari_group  uuid references public.gdg_groups (id) on delete set null,
  ke_group    uuid references public.gdg_groups (id) on delete set null,
  alasan      text,
  oleh        uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Log follow-up (WA / telepon / kunjungan)
create table public.followups (
  id          bigint generated always as identity primary key,
  jemaat_id   uuid not null references public.jemaat (id) on delete cascade,
  oleh        uuid references public.profiles (id) on delete set null,
  oleh_nama   text,
  hasil       text,
  created_at  timestamptz not null default now()
);
create index followups_jemaat_idx on public.followups (jemaat_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5. Ibadah & absensi
-- ---------------------------------------------------------------------
create table public.ibadah_sessions (
  id          uuid primary key default gen_random_uuid(),
  tanggal     date not null unique,
  status      text not null default 'sion' check (status in ('sion', 'gabung', 'libur')),
  catatan     text,
  jumlah_tamu int  not null default 0 check (jumlah_tamu >= 0),
  created_at  timestamptz not null default now()
);

create table public.ibadah_attendance (
  session_id  uuid not null references public.ibadah_sessions (id) on delete cascade,
  jemaat_id   uuid not null references public.jemaat (id) on delete cascade,
  dicatat_oleh uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (session_id, jemaat_id)
);
create index ibadah_attendance_jemaat_idx on public.ibadah_attendance (jemaat_id);

-- ---------------------------------------------------------------------
-- 6. Jadwal & absensi GDG
-- ---------------------------------------------------------------------
create table public.gdg_sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.gdg_groups (id) on delete cascade,
  bulan       date not null,               -- hari pertama bulan, 1 sesi per grup per bulan
  tanggal     date not null,               -- default: Sabtu minggu ke-2
  status      text not null default 'terjadwal' check (status in ('terjadwal', 'batal')),
  catatan     text,
  created_at  timestamptz not null default now(),
  unique (group_id, bulan)
);

create table public.gdg_attendance (
  session_id  uuid not null references public.gdg_sessions (id) on delete cascade,
  jemaat_id   uuid not null references public.jemaat (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (session_id, jemaat_id)
);
create index gdg_attendance_jemaat_idx on public.gdg_attendance (jemaat_id);

-- ---------------------------------------------------------------------
-- 7. Kalender kegiatan (proker)
-- ---------------------------------------------------------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null,
  deskripsi   text,
  mulai       date not null,
  selesai     date not null,
  pic         text,
  status      text not null default 'rencana' check (status in ('rencana', 'berjalan', 'selesai', 'batal')),
  warna       text not null default 'blue',
  created_at  timestamptz not null default now(),
  check (selesai >= mulai)
);

-- =====================================================================
-- Aturan otomatis
-- =====================================================================

-- Kategori GDG dari status akademik. Kuliah default masuk grup Kerja
-- (pengurus tetap bisa memindah manual).
create or replace function public.kategori_gdg(p_status text)
returns text
language sql
immutable
as $$
  select case p_status when 'Kuliah' then 'Kerja' else p_status end;
$$;

-- Grup aktif dengan kategori yang cocok & anggota aktif paling sedikit.
create or replace function public.pilih_grup_gdg(p_status text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select g.id
  from gdg_groups g
  left join jemaat j on j.gdg_group_id = g.id and j.status = 'aktif'
  where g.is_active and g.target_kategori = kategori_gdg(p_status)
  group by g.id, g.created_at
  order by count(j.id), g.created_at
  limit 1;
$$;

create or replace function public.jemaat_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rapikan format
  new.nama := initcap(regexp_replace(trim(new.nama), '\s+', ' ', 'g'));
  new.no_hp := public.normalisasi_hp(new.no_hp);
  new.no_hp_ortu := public.normalisasi_hp(new.no_hp_ortu);
  if new.kecamatan is not null then new.kecamatan := initcap(trim(new.kecamatan)); end if;
  if new.institusi is not null then new.institusi := trim(new.institusi); end if;
  new.updated_at := now();

  -- Kelas otomatis menentukan jenjang (SD 1-6, SMP 7-9, SMA 10-12)
  if new.status_akademik in ('Kuliah', 'Kerja') then
    new.kelas := null;
  elsif new.kelas is not null then
    new.status_akademik := case
      when new.kelas <= 6 then 'SD' when new.kelas <= 9 then 'SMP' else 'SMA' end;
  end if;
  if new.status_akademik <> 'Kuliah' then new.lokasi_studi := null; end if;

  -- Status nonaktif
  if new.status = 'nonaktif' and new.tanggal_nonaktif is null then
    new.tanggal_nonaktif := current_date;
  elsif new.status = 'aktif' then
    new.alasan_nonaktif := null;
    new.tanggal_nonaktif := null;
  end if;

  -- Auto-assign GDG: hanya untuk jemaat aktif yang tidak di-set manual
  if new.status = 'aktif' and not new.gdg_manual then
    if new.gdg_group_id is null
       or (tg_op = 'UPDATE'
           and kategori_gdg(old.status_akademik) is distinct from kategori_gdg(new.status_akademik)) then
      new.gdg_group_id := public.pilih_grup_gdg(new.status_akademik);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.normalisasi_hp(p text)
returns text
language plpgsql
immutable
as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '\D', '', 'g');
  if d = '' then return null; end if;
  if left(d, 1) = '0' then d := '62' || substr(d, 2);
  elsif left(d, 1) = '8' then d := '62' || d;
  end if;
  return d;
end;
$$;

create trigger jemaat_before_write
  before insert or update on public.jemaat
  for each row execute function public.jemaat_before_write();

-- Catat riwayat perpindahan grup
create or replace function public.jemaat_after_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.gdg_group_id is not null)
     or (tg_op = 'UPDATE' and old.gdg_group_id is distinct from new.gdg_group_id) then
    insert into gdg_history (jemaat_id, dari_group, ke_group, alasan, oleh)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.gdg_group_id end,
      new.gdg_group_id,
      case when new.gdg_manual then 'Dipindah manual' else 'Otomatis (aturan kategori)' end,
      auth.uid()
    );
  end if;
  return null;
end;
$$;

create trigger jemaat_after_write
  after insert or update on public.jemaat
  for each row execute function public.jemaat_after_write();

-- Saat grup baru dibuat, masukkan jemaat aktif yang belum punya grup.
create or replace function public.gdg_group_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update jemaat set gdg_group_id = null
  where status = 'aktif' and gdg_group_id is null and not gdg_manual
    and kategori_gdg(status_akademik) = new.target_kategori;
  return null;
end;
$$;

create trigger gdg_group_after_insert
  after insert on public.gdg_groups
  for each row execute function public.gdg_group_after_insert();

-- Kenaikan kelas tahun ajaran baru (dijalankan pengurus sekali setahun).
-- Kelas 12 -> Kuliah dan ditandai perlu_review (bisa saja langsung kerja).
create or replace function public.naik_kelas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if not is_pengurus() then raise exception 'Hanya pengurus'; end if;
  update jemaat
     set kelas = case when kelas < 12 then kelas + 1 end,
         status_akademik = case when kelas = 12 then 'Kuliah' else status_akademik end,
         perlu_review = perlu_review or kelas = 12
   where kelas is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Hari pertama bulan -> Sabtu minggu ke-2
create or replace function public.sabtu_kedua(p_bulan date)
returns date
language sql
immutable
as $$
  select (date_trunc('month', p_bulan)::date
          + ((6 - extract(dow from date_trunc('month', p_bulan))::int + 7) % 7)
          + 7);
$$;

-- Pastikan jadwal GDG bulan ini ada untuk semua grup aktif
create or replace function public.ensure_gdg_sessions(p_bulan date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into gdg_sessions (group_id, bulan, tanggal)
  select g.id, date_trunc('month', p_bulan)::date, sabtu_kedua(p_bulan)
  from gdg_groups g
  where g.is_active and is_staff()
  on conflict (group_id, bulan) do nothing;
$$;

-- Pastikan sesi ibadah tiap hari Minggu dalam rentang ada
create or replace function public.ensure_ibadah_sessions(p_dari date, p_sampai date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into ibadah_sessions (tanggal)
  select d::date
  from generate_series(p_dari, p_sampai, interval '1 day') d
  where extract(dow from d) = 0 and is_staff()
  on conflict (tanggal) do nothing;
$$;

-- =====================================================================
-- Fungsi untuk usher (tanpa akses data pribadi)
-- =====================================================================
create or replace function public.absensi_list(p_session uuid)
returns table (id uuid, nama text, status_akademik text, hadir boolean)
language sql
stable
security definer
set search_path = public
as $$
  select j.id, j.nama, j.status_akademik,
         exists (select 1 from ibadah_attendance a where a.session_id = p_session and a.jemaat_id = j.id)
  from jemaat j
  where j.status = 'aktif' and is_staff()
  order by j.nama;
$$;

create or replace function public.set_hadir(p_session uuid, p_jemaat uuid, p_hadir boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'Tidak punya akses'; end if;
  if (select status from ibadah_sessions where id = p_session) <> 'sion' then
    raise exception 'Minggu ini tidak ada absensi Sion';
  end if;
  if p_hadir then
    insert into ibadah_attendance (session_id, jemaat_id, dicatat_oleh)
    values (p_session, p_jemaat, auth.uid()) on conflict do nothing;
  else
    delete from ibadah_attendance where session_id = p_session and jemaat_id = p_jemaat;
  end if;
end;
$$;

create or replace function public.set_jumlah_tamu(p_session uuid, p_jumlah int)
returns void
language sql
security definer
set search_path = public
as $$
  update ibadah_sessions set jumlah_tamu = greatest(p_jumlah, 0)
  where id = p_session and is_staff();
$$;

-- Usher menambah jemaat baru dari halaman absensi (nama + HP saja)
create or replace function public.tambah_jemaat_cepat(p_nama text, p_hp text, p_status text, p_session uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'Tidak punya akses'; end if;
  insert into jemaat (nama, no_hp, status_akademik, sumber_input, perlu_review)
  values (p_nama, p_hp, coalesce(p_status, 'SMA'), 'absensi', true)
  returning id into v_id;
  if p_session is not null then
    perform set_hadir(p_session, v_id, true);
  end if;
  return v_id;
end;
$$;

-- Form pendaftaran publik (tanpa login)
create or replace function public.daftar_jemaat(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; b jsonb;
begin
  if coalesce(trim(p ->> 'nama'), '') = '' then raise exception 'Nama wajib diisi'; end if;
  if not coalesce((p ->> 'persetujuan_data')::boolean, false) then
    raise exception 'Persetujuan data wajib dicentang';
  end if;
  insert into jemaat (
    nama, jenis_kelamin, tanggal_lahir, no_hp, no_hp_ortu, alamat, kecamatan,
    status_akademik, kelas, institusi, lokasi_studi, kota_studi, hobi, sumber_info,
    diajak_oleh_nama, sumber_input, perlu_review, persetujuan_data
  ) values (
    left(p ->> 'nama', 120),
    nullif(p ->> 'jenis_kelamin', ''),
    nullif(p ->> 'tanggal_lahir', '')::date,
    left(p ->> 'no_hp', 30),
    left(nullif(p ->> 'no_hp_ortu', ''), 30),
    left(p ->> 'alamat', 300),
    left(p ->> 'kecamatan', 80),
    p ->> 'status_akademik',
    nullif(p ->> 'kelas', '')::smallint,
    left(p ->> 'institusi', 120),
    nullif(p ->> 'lokasi_studi', ''),
    left(nullif(p ->> 'kota_studi', ''), 80),
    coalesce(array(select jsonb_array_elements_text(p -> 'hobi')), '{}'),
    left(p ->> 'sumber_info', 120),
    left(nullif(p ->> 'diajak_oleh_nama', ''), 200),
    'form', true, true
  ) returning id into v_id;

  for b in select * from jsonb_array_elements(coalesce(p -> 'pelayanan', '[]'::jsonb)) loop
    insert into jemaat_pelayanan (jemaat_id, bidang, level)
    values (v_id, b ->> 'bidang', b ->> 'level')
    on conflict do nothing;
  end loop;
end;
$$;

-- =====================================================================
-- View analisis (security_invoker = RLS tetap berlaku → hanya pengurus)
-- =====================================================================

-- Berapa sesi Sion berturut-turut terakhir yang dilewatkan tiap jemaat aktif.
-- Hanya sesi berstatus 'sion' yang sudah lewat dan benar-benar ada absensinya
-- (minggu gabung/libur dilewati), dan hanya sejak tanggal bergabung.
create or replace view public.v_absen_ibadah
with (security_invoker = true) as
with sesi as (
  select s.id, s.tanggal
  from ibadah_sessions s
  where s.status = 'sion' and s.tanggal <= current_date
    and exists (select 1 from ibadah_attendance a where a.session_id = s.id)
),
terakhir as (
  select a.jemaat_id, max(s.tanggal) as tanggal
  from ibadah_attendance a join sesi s on s.id = a.session_id
  group by a.jemaat_id
)
select j.id, j.nama, j.no_hp, j.no_hp_ortu, j.status_akademik, j.gdg_group_id,
       t.tanggal as terakhir_hadir,
       (select count(*) from sesi s
         where s.tanggal >= j.tanggal_bergabung
           and s.tanggal > coalesce(t.tanggal, '-infinity'::date))::int as absen_beruntun,
       (select max(f.created_at) from followups f where f.jemaat_id = j.id) as terakhir_followup
from jemaat j
left join terakhir t on t.jemaat_id = j.id
where j.status = 'aktif';

-- Sama untuk GDG, dihitung per grup jemaat saat ini
create or replace view public.v_absen_gdg
with (security_invoker = true) as
with sesi as (
  select s.id, s.group_id, s.tanggal
  from gdg_sessions s
  where s.status = 'terjadwal' and s.tanggal <= current_date
    and exists (select 1 from gdg_attendance a where a.session_id = s.id)
)
select j.id, j.nama, j.no_hp, j.gdg_group_id,
       (select max(s.tanggal) from gdg_attendance a join sesi s on s.id = a.session_id
         where a.jemaat_id = j.id) as terakhir_hadir,
       (select count(*) from sesi s
         where s.group_id = j.gdg_group_id
           and s.tanggal >= j.tanggal_bergabung
           and s.tanggal > coalesce((select max(s2.tanggal) from gdg_attendance a2
                                       join sesi s2 on s2.id = a2.session_id
                                      where a2.jemaat_id = j.id), '-infinity'::date))::int as absen_beruntun,
       (select count(*) from sesi s where s.group_id = j.gdg_group_id
         and s.tanggal >= j.tanggal_bergabung)::int as total_sesi,
       (select count(*) from gdg_attendance a join sesi s on s.id = a.session_id
         where a.jemaat_id = j.id and s.group_id = j.gdg_group_id)::int as total_hadir
from jemaat j
where j.status = 'aktif' and j.gdg_group_id is not null;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.opsi              enable row level security;
alter table public.gdg_groups        enable row level security;
alter table public.jemaat            enable row level security;
alter table public.jemaat_pelayanan  enable row level security;
alter table public.gdg_history       enable row level security;
alter table public.followups         enable row level security;
alter table public.ibadah_sessions   enable row level security;
alter table public.ibadah_attendance enable row level security;
alter table public.gdg_sessions      enable row level security;
alter table public.gdg_attendance    enable row level security;
alter table public.activities        enable row level security;

-- Profil: tiap user lihat profilnya sendiri; pengurus lihat semua
create policy profiles_self on public.profiles
  for select using (id = auth.uid() or is_pengurus());

-- Opsi: publik boleh baca (dipakai form pendaftaran), pengurus kelola
create policy opsi_read on public.opsi for select using (true);
create policy opsi_write on public.opsi for all using (is_pengurus()) with check (is_pengurus());

-- Sesi ibadah: semua staff boleh baca (usher perlu tahu status minggu ini)
create policy ibadah_sessions_read on public.ibadah_sessions for select using (is_staff());
create policy ibadah_sessions_write on public.ibadah_sessions for all
  using (is_pengurus()) with check (is_pengurus());

-- Sisanya: penuh untuk pengurus saja. Usher memakai fungsi security definer di atas.
do $$
declare t text;
begin
  foreach t in array array['gdg_groups', 'jemaat', 'jemaat_pelayanan', 'gdg_history',
                           'followups', 'ibadah_attendance', 'gdg_sessions',
                           'gdg_attendance', 'activities']
  loop
    execute format(
      'create policy %I on public.%I for all using (public.is_pengurus()) with check (public.is_pengurus())',
      t || '_pengurus', t);
  end loop;
end $$;

-- Hak eksekusi fungsi
revoke execute on function public.daftar_jemaat(jsonb) from public;
grant execute on function public.daftar_jemaat(jsonb) to anon, authenticated;
revoke execute on function public.naik_kelas() from public, anon;
revoke execute on function public.pilih_grup_gdg(text) from public, anon;
revoke execute on function public.absensi_list(uuid) from public, anon;
revoke execute on function public.set_hadir(uuid, uuid, boolean) from public, anon;
revoke execute on function public.set_jumlah_tamu(uuid, int) from public, anon;
revoke execute on function public.tambah_jemaat_cepat(text, text, text, uuid) from public, anon;
revoke execute on function public.ensure_gdg_sessions(date) from public, anon;
revoke execute on function public.ensure_ibadah_sessions(date, date) from public, anon;
grant execute on function public.naik_kelas(), public.absensi_list(uuid),
  public.set_hadir(uuid, uuid, boolean), public.set_jumlah_tamu(uuid, int),
  public.tambah_jemaat_cepat(text, text, text, uuid), public.ensure_gdg_sessions(date),
  public.ensure_ibadah_sessions(date, date) to authenticated;
