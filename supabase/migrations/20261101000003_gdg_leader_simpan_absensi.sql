-- =====================================================================
-- 1. Grup GDG: beberapa jenjang + jenis kelamin
--    Contoh: GDG Christoper = SMP & SMA, laki-laki.
-- =====================================================================
alter table public.gdg_groups add column jenjang text[] not null default '{}';
alter table public.gdg_groups add column jenis_kelamin text check (jenis_kelamin in ('L', 'P'));
update public.gdg_groups
   set jenjang = case target_kategori when 'Kerja' then array['Kuliah', 'Kerja'] else array[target_kategori] end;
alter table public.gdg_groups drop column target_kategori;
alter table public.gdg_groups
  add constraint gdg_groups_jenjang_check
  check (jenjang <@ array['SD', 'SMP', 'SMA', 'Kuliah', 'Kerja'] and cardinality(jenjang) > 0);

drop function public.pilih_grup_gdg(text);
drop function public.kategori_gdg(text);

create or replace function public.grup_cocok(p_group uuid, p_status text, p_jk text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from gdg_groups g
    where g.id = p_group and g.is_active and p_status = any (g.jenjang)
      and (g.jenis_kelamin is null or g.jenis_kelamin = p_jk)
  );
$$;

-- Grup aktif yang cocok (jenjang + jenis kelamin) dengan anggota aktif paling sedikit
create or replace function public.pilih_grup_gdg(p_status text, p_jk text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select g.id
  from gdg_groups g
  left join jemaat j on j.gdg_group_id = g.id and j.status = 'aktif'
  where g.is_active and p_status = any (g.jenjang)
    and (g.jenis_kelamin is null or g.jenis_kelamin = p_jk)
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
  new.nama := initcap(regexp_replace(trim(new.nama), '\s+', ' ', 'g'));
  new.no_hp := public.normalisasi_hp(new.no_hp);
  new.no_hp_ortu := public.normalisasi_hp(new.no_hp_ortu);
  if new.kecamatan is not null then new.kecamatan := initcap(trim(new.kecamatan)); end if;
  if new.institusi is not null then new.institusi := trim(new.institusi); end if;
  new.updated_at := now();

  if new.status_akademik in ('Kuliah', 'Kerja') then
    new.kelas := null;
  elsif new.kelas is not null then
    new.status_akademik := case
      when new.kelas <= 6 then 'SD' when new.kelas <= 9 then 'SMP' else 'SMA' end;
  end if;
  if new.status_akademik <> 'Kuliah' then new.lokasi_studi := null; end if;

  if new.status = 'nonaktif' and new.tanggal_nonaktif is null then
    new.tanggal_nonaktif := current_date;
  elsif new.status = 'aktif' then
    new.alasan_nonaktif := null;
    new.tanggal_nonaktif := null;
  end if;

  -- Auto-assign: jemaat aktif tanpa grup, atau grupnya sudah tidak cocok (naik jenjang, dll)
  if new.status = 'aktif' and not new.gdg_manual then
    if new.gdg_group_id is null
       or not public.grup_cocok(new.gdg_group_id, new.status_akademik, new.jenis_kelamin) then
      new.gdg_group_id := public.pilih_grup_gdg(new.status_akademik, new.jenis_kelamin);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.gdg_group_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update jemaat set gdg_group_id = null
  where status = 'aktif' and gdg_group_id is null and not gdg_manual
    and status_akademik = any (new.jenjang)
    and (new.jenis_kelamin is null or jenis_kelamin = new.jenis_kelamin);
  return null;
end;
$$;

-- =====================================================================
-- 2. Role GDG leader
-- =====================================================================
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('pengurus', 'penatalayan', 'gdg_leader'));
alter table public.profiles add column gdg_group_id uuid references public.gdg_groups (id) on delete set null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, role, gdg_group_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'penatalayan'),
    nullif(new.raw_user_meta_data ->> 'gdg_group_id', '')::uuid
  );
  return new;
end;
$$;

create or replace function public.my_gdg_group()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select gdg_group_id from public.profiles where id = auth.uid() and role = 'gdg_leader';
$$;

create or replace function public.boleh_kelola_grup(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_pengurus() or (p_group is not null and p_group = my_gdg_group());
$$;

-- Leader boleh melihat grupnya, anggota aktifnya, jadwal & absensi grupnya, dan mencatat follow-up
create policy gdg_groups_leader on public.gdg_groups for select using (id = my_gdg_group());
create policy jemaat_leader on public.jemaat for select
  using (gdg_group_id = my_gdg_group() and status = 'aktif');
create policy gdg_sessions_leader on public.gdg_sessions for select using (group_id = my_gdg_group());
create policy gdg_attendance_leader on public.gdg_attendance for select
  using (exists (select 1 from gdg_sessions s where s.id = session_id and s.group_id = my_gdg_group()));
create policy followups_leader_read on public.followups for select
  using (exists (select 1 from jemaat j where j.id = jemaat_id and j.gdg_group_id = my_gdg_group()));
create policy followups_leader_write on public.followups for insert
  with check (oleh = auth.uid()
              and exists (select 1 from jemaat j where j.id = jemaat_id and j.gdg_group_id = my_gdg_group()));

-- =====================================================================
-- 3. Simpan absensi (dikunci setelah disimpan, bisa dibuka lagi untuk update)
-- =====================================================================
alter table public.ibadah_sessions add column disimpan_at timestamptz;
alter table public.ibadah_sessions add column disimpan_oleh uuid references public.profiles (id) on delete set null;
alter table public.ibadah_sessions add column disimpan_nama text;
alter table public.gdg_sessions add column disimpan_at timestamptz;
alter table public.gdg_sessions add column disimpan_oleh uuid references public.profiles (id) on delete set null;
alter table public.gdg_sessions add column disimpan_nama text;

create or replace function public.nama_saya()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(full_name, username) from profiles where id = auth.uid();
$$;

create or replace function public.set_hadir(p_session uuid, p_jemaat uuid, p_hadir boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s ibadah_sessions;
begin
  if not is_staff() then raise exception 'Tidak punya akses'; end if;
  select * into s from ibadah_sessions where id = p_session;
  if s.status <> 'sion' then raise exception 'Minggu ini tidak ada absensi Sion'; end if;
  if s.disimpan_at is not null then
    raise exception 'Absensi sudah disimpan. Klik "Buka lagi" untuk mengubah.';
  end if;
  if p_hadir then
    insert into ibadah_attendance (session_id, jemaat_id, dicatat_oleh)
    values (p_session, p_jemaat, auth.uid()) on conflict do nothing;
  else
    delete from ibadah_attendance where session_id = p_session and jemaat_id = p_jemaat;
  end if;
end;
$$;

create or replace function public.simpan_absensi_ibadah(p_session uuid, p_simpan boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'Tidak punya akses'; end if;
  update ibadah_sessions
     set disimpan_at = case when p_simpan then now() end,
         disimpan_oleh = case when p_simpan then auth.uid() end,
         disimpan_nama = case when p_simpan then nama_saya() end
   where id = p_session;
end;
$$;

create or replace function public.set_hadir_gdg(p_session uuid, p_jemaat uuid, p_hadir boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s gdg_sessions;
begin
  select * into s from gdg_sessions where id = p_session;
  if not boleh_kelola_grup(s.group_id) then raise exception 'Tidak punya akses ke grup ini'; end if;
  if s.status <> 'terjadwal' then raise exception 'GDG bulan ini dibatalkan'; end if;
  if s.disimpan_at is not null then
    raise exception 'Absensi sudah disimpan. Klik "Buka lagi" untuk mengubah.';
  end if;
  if p_hadir then
    insert into gdg_attendance (session_id, jemaat_id) values (p_session, p_jemaat) on conflict do nothing;
  else
    delete from gdg_attendance where session_id = p_session and jemaat_id = p_jemaat;
  end if;
end;
$$;

create or replace function public.simpan_absensi_gdg(p_session uuid, p_simpan boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not boleh_kelola_grup((select group_id from gdg_sessions where id = p_session)) then
    raise exception 'Tidak punya akses ke grup ini';
  end if;
  update gdg_sessions
     set disimpan_at = case when p_simpan then now() end,
         disimpan_oleh = case when p_simpan then auth.uid() end,
         disimpan_nama = case when p_simpan then nama_saya() end
   where id = p_session;
end;
$$;

-- Leader juga bisa membuat jadwal bulan berjalan untuk grupnya
create or replace function public.ensure_gdg_sessions(p_bulan date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into gdg_sessions (group_id, bulan, tanggal)
  select g.id, date_trunc('month', p_bulan)::date, sabtu_kedua(p_bulan)
  from gdg_groups g
  where g.is_active and (is_pengurus() or g.id = my_gdg_group())
  on conflict (group_id, bulan) do nothing;
$$;

-- Hak eksekusi
revoke execute on function public.grup_cocok(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.pilih_grup_gdg(text, text) from public, anon, authenticated;
revoke execute on function public.my_gdg_group() from public, anon;
revoke execute on function public.boleh_kelola_grup(uuid) from public, anon;
revoke execute on function public.nama_saya() from public, anon;
revoke execute on function public.simpan_absensi_ibadah(uuid, boolean) from public, anon;
revoke execute on function public.set_hadir_gdg(uuid, uuid, boolean) from public, anon;
revoke execute on function public.simpan_absensi_gdg(uuid, boolean) from public, anon;
grant execute on function public.my_gdg_group(), public.boleh_kelola_grup(uuid), public.nama_saya(),
  public.simpan_absensi_ibadah(uuid, boolean), public.set_hadir_gdg(uuid, uuid, boolean),
  public.simpan_absensi_gdg(uuid, boolean) to authenticated;
