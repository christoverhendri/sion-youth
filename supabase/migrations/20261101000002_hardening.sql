-- Rekomendasi Supabase security advisor
alter function public.kategori_gdg(text) set search_path = public;
alter function public.normalisasi_hp(text) set search_path = public;
alter function public.sabtu_kedua(date) set search_path = public;

-- Fungsi trigger & helper internal tidak perlu dipanggil lewat API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.jemaat_before_write() from public, anon, authenticated;
revoke execute on function public.jemaat_after_write() from public, anon, authenticated;
revoke execute on function public.gdg_group_after_insert() from public, anon, authenticated;
revoke execute on function public.pilih_grup_gdg(text) from public, anon, authenticated;
revoke execute on function public.my_role() from public, anon;
