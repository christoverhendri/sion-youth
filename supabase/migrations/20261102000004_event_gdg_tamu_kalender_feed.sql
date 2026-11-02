-- =====================================================================
-- 1. Absensi event (kegiatan di Kalender: Fun Activity Day, retreat, dll)
--    Event = baris di tabel activities, jadi satu daftar dengan kalender.
-- =====================================================================
alter table public.activities add column jumlah_tamu int not null default 0 check (jumlah_tamu >= 0);
alter table public.activities add column disimpan_at timestamptz;
alter table public.activities add column disimpan_oleh uuid references public.profiles (id) on delete set null;
alter table public.activities add column disimpan_nama text;

create table public.event_attendance (
  event_id     uuid not null references public.activities (id) on delete cascade,
  jemaat_id    uuid not null references public.jemaat (id) on delete cascade,
  dicatat_oleh uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (event_id, jemaat_id)
);
create index event_attendance_jemaat_idx on public.event_attendance (jemaat_id);
alter table public.event_attendance enable row level security;
create policy event_attendance_pengurus on public.event_attendance
  for all using (public.is_pengurus()) with check (public.is_pengurus());

-- Daftar event untuk semua staff (usher tidak punya akses langsung ke tabel activities)
create or replace function public.event_daftar()
returns table (id uuid, nama text, mulai date, selesai date, status text, jumlah_tamu int,
               disimpan_at timestamptz, disimpan_nama text, hadir bigint)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.nama, a.mulai, a.selesai, a.status, a.jumlah_tamu, a.disimpan_at, a.disimpan_nama,
         (select count(*) from event_attendance e where e.event_id = a.id)
  from activities a
  where is_staff() and a.status <> 'batal'
  order by a.mulai desc, a.nama;
$$;

-- Jemaat aktif (plus yang sudah tercatat hadir, walau sudah nonaktif)
create or replace function public.absensi_event_list(p_event uuid)
returns table (id uuid, nama text, status_akademik text, hadir boolean)
language sql
stable
security definer
set search_path = public
as $$
  select j.id, j.nama, j.status_akademik,
         exists (select 1 from event_attendance e where e.event_id = p_event and e.jemaat_id = j.id)
  from jemaat j
  where is_staff()
    and (j.status = 'aktif'
         or exists (select 1 from event_attendance e where e.event_id = p_event and e.jemaat_id = j.id))
  order by j.nama;
$$;

create or replace function public.set_hadir_event(p_event uuid, p_jemaat uuid, p_hadir boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare a activities;
begin
  if not is_staff() then raise exception 'Tidak punya akses'; end if;
  select * into a from activities where id = p_event;
  if not found then raise exception 'Event tidak ditemukan'; end if;
  if a.disimpan_at is not null then
    raise exception 'Absensi sudah disimpan. Klik "Buka lagi" untuk mengubah.';
  end if;
  if p_hadir then
    insert into event_attendance (event_id, jemaat_id, dicatat_oleh)
    values (p_event, p_jemaat, auth.uid()) on conflict do nothing;
  else
    delete from event_attendance where event_id = p_event and jemaat_id = p_jemaat;
  end if;
end;
$$;

create or replace function public.set_tamu_event(p_event uuid, p_jumlah int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'Tidak punya akses'; end if;
  if (select disimpan_at from activities where id = p_event) is not null then
    raise exception 'Absensi sudah disimpan. Klik "Buka lagi" untuk mengubah.';
  end if;
  update activities set jumlah_tamu = greatest(p_jumlah, 0) where id = p_event;
end;
$$;

create or replace function public.simpan_absensi_event(p_event uuid, p_simpan boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'Tidak punya akses'; end if;
  update activities
     set disimpan_at = case when p_simpan then now() end,
         disimpan_oleh = case when p_simpan then auth.uid() end,
         disimpan_nama = case when p_simpan then nama_saya() end
   where id = p_event;
end;
$$;

-- =====================================================================
-- 2. Absensi GDG: anggota dari GDG lain (kalau grup digabung)
-- =====================================================================
create or replace function public.jemaat_gdg_lain(p_group uuid)
returns table (id uuid, nama text, status_akademik text, grup_nama text)
language sql
stable
security definer
set search_path = public
as $$
  select j.id, j.nama, j.status_akademik, g.nama
  from jemaat j
  left join gdg_groups g on g.id = j.gdg_group_id
  where boleh_kelola_grup(p_group) and j.status = 'aktif' and j.gdg_group_id is distinct from p_group
  order by j.nama;
$$;

-- Yang tercatat hadir di sesi GDG ini tapi bukan anggota grupnya
create or replace function public.gdg_tamu_list(p_session uuid)
returns table (id uuid, nama text, status_akademik text, grup_nama text)
language sql
stable
security definer
set search_path = public
as $$
  select j.id, j.nama, j.status_akademik, g.nama
  from gdg_sessions s
  join gdg_attendance a on a.session_id = s.id
  join jemaat j on j.id = a.jemaat_id
  left join gdg_groups g on g.id = j.gdg_group_id
  where s.id = p_session and boleh_kelola_grup(s.group_id) and j.gdg_group_id is distinct from s.group_id
  order by j.nama;
$$;

-- =====================================================================
-- 3. Feed kalender (.ics) untuk Google Calendar / Apple Calendar
--    Dibaca tanpa login, dilindungi token rahasia di URL.
-- =====================================================================
create table public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
create policy app_settings_pengurus on public.app_settings
  for all using (public.is_pengurus()) with check (public.is_pengurus());

insert into public.app_settings (key, value)
values ('kalender_token', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict do nothing;

create or replace function public.reset_kalender_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare t text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not is_pengurus() then raise exception 'Hanya pengurus'; end if;
  update app_settings set value = t where key = 'kalender_token';
  return t;
end;
$$;

-- Kegiatan + jadwal GDG (default Sabtu minggu ke-2 untuk bulan yang belum punya jadwal)
create or replace function public.kalender_feed(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from app_settings where key = 'kalender_token' and value = p_token) then
    return null;
  end if;
  return jsonb_build_object(
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'nama', a.nama, 'deskripsi', a.deskripsi,
                                          'mulai', a.mulai, 'selesai', a.selesai, 'pic', a.pic))
      from activities a where a.status <> 'batal'), '[]'::jsonb),
    'gdg', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id::text || '-' || mm.m::text, 'grup', g.nama,
                                          'leader', g.leader_name,
                                          'tanggal', coalesce(s.tanggal, sabtu_kedua(mm.m)),
                                          'catatan', s.catatan))
      from gdg_groups g
      cross join (select d::date as m
                    from generate_series(date_trunc('month', current_date)::date - interval '1 month',
                                         date_trunc('month', current_date)::date + interval '4 months',
                                         interval '1 month') d) mm
      left join gdg_sessions s on s.group_id = g.id and s.bulan = mm.m
      where g.is_active and coalesce(s.status, 'terjadwal') = 'terjadwal'), '[]'::jsonb)
  );
end;
$$;

-- =====================================================================
-- Hak eksekusi
-- =====================================================================
revoke execute on function public.event_daftar() from public, anon;
revoke execute on function public.absensi_event_list(uuid) from public, anon;
revoke execute on function public.set_hadir_event(uuid, uuid, boolean) from public, anon;
revoke execute on function public.set_tamu_event(uuid, int) from public, anon;
revoke execute on function public.simpan_absensi_event(uuid, boolean) from public, anon;
revoke execute on function public.jemaat_gdg_lain(uuid) from public, anon;
revoke execute on function public.gdg_tamu_list(uuid) from public, anon;
revoke execute on function public.reset_kalender_token() from public, anon;
revoke execute on function public.kalender_feed(text) from public;
grant execute on function public.event_daftar(), public.absensi_event_list(uuid),
  public.set_hadir_event(uuid, uuid, boolean), public.set_tamu_event(uuid, int),
  public.simpan_absensi_event(uuid, boolean), public.jemaat_gdg_lain(uuid),
  public.gdg_tamu_list(uuid), public.reset_kalender_token() to authenticated;
grant execute on function public.kalender_feed(text) to anon, authenticated;
