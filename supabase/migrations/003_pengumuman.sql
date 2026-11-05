-- KebunKu — migrasi Supabase 003 (v3.6): pengumuman pembangun
-- ============================================================
-- CARA GUNA:
--   1. Pastikan migrasi 001_kebunku.sql dan 002_kebunku_v3.sql
--      sudah dijalankan dahulu.
--   2. Dalam Supabase Dashboard, pergi ke SQL Editor > New query
--   3. Tampal keseluruhan fail ini dan tekan Run
--   4. Kemudian hantar pengumuman pertama (lihat contoh INSERT di bawah).
--
-- IDEMPOTEN (boleh dijalankan semula dengan selamat):
--   - Jadual dicipta hanya jika belum wujud
--   - Polisi dibuang dahulu (IF EXISTS) sebelum dicipta semula
--
-- APA YANG DITAMBAH (v3.6 — Mesej Pembangun):
--   - Jadual baharu public.pengumuman — mesej daripada pemilik/pembangun
--     kepada semua pengguna aplikasi:
--       id      — teks, kunci utama (pemilik tetapkan sendiri, cth 'v36-01')
--       tajuk   — tajuk ringkas pengumuman
--       mesej   — isi mesej
--       jenis   — 'makluman' (lalai), 'kemaskini', 'penting'
--       tarikh  — masa pengumuman dibuat (lalai: sekarang)
--       aktif   — true (lalai); false = disembunyikan daripada aplikasi
--   - Row Level Security: SEMUA orang (anon + authenticated) boleh BACA
--     pengumuman aktif sahaja — ini yang aplikasi panggil.
--     TIADA polisi tulis untuk anon/authenticated: hanya pemilik boleh
--     tulis, melalui SQL Editor (atau service_role key di server) —
--     pengguna aplikasi TIDAK BOLEH menghantar pengumuman.
--   - Aplikasi mengambil 5 pengumuman aktif terkini, mengikut tarikh
--     menurun, dan memaparkannya sebagai kad "Mesej Pembangun" di atas
--     tab Hari Ini. Pengguna boleh tanda "Sudah Dibaca" — yang sudah
--     dibaca tidak muncul lagi.
--
-- CONTOH — hantar pengumuman pertama (jalankan dalam SQL Editor):
--   insert into public.pengumuman (id, tajuk, mesej, jenis, aktif)
--   values ('v36-01', 'KebunKu v3.6 sudah keluar!',
--     'Kemas kini aplikasi anda: Sejarah kini ada paparan Kalendar, senarai Kerja dipaginasi, dan kerja siap tidak lagi bercampur dengan kerja belum siap. Terima kasih kerana menggunakan KebunKu.',
--     'kemaskini', true);
--
-- CONTOH — sembunyikan pengumuman lama (tanpa memadamnya):
--   update public.pengumuman set aktif = false where id = 'v36-01';
--
-- CONTOH — padam pengumuman:
--   delete from public.pengumuman where id = 'v36-01';
-- ============================================================

create table if not exists public.pengumuman (
  id text primary key,
  tajuk text not null,
  mesej text not null,
  jenis text not null default 'makluman',
  tarikh timestamptz not null default now(),
  aktif boolean not null default true
);

create index if not exists pengumuman_aktif_tarikh_idx
  on public.pengumuman (aktif, tarikh desc);

-- ---------- Row Level Security: pengumuman ----------
-- Baca: semua orang (anon + authenticated) — pengumuman aktif sahaja.
-- Tulis: TIADA polisi — hanya pemilik (SQL Editor / service_role).
alter table public.pengumuman enable row level security;

drop policy if exists pengumuman_public_select on public.pengumuman;
create policy pengumuman_public_select on public.pengumuman
  for select to anon, authenticated using (aktif = true);
