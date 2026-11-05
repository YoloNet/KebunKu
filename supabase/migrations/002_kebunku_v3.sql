-- KebunKu — migrasi Supabase 002 (v3)
-- ============================================================
-- CARA GUNA:
--   1. Pastikan migrasi 001_kebunku.sql sudah dijalankan dahulu.
--   2. Dalam Supabase Dashboard, pergi ke SQL Editor > New query
--   3. Tampal keseluruhan fail ini dan tekan Run
--   4. Kemudian tekan Sync Sekarang dalam aplikasi KebunKu.
--
-- IDEMPOTEN (boleh dijalankan semula dengan selamat):
--   - Lajur ditambah hanya jika belum wujud (ADD COLUMN IF NOT EXISTS)
--   - Jadual bahans dicipta hanya jika belum wujud
--   - Indeks / polisi dibuang dahulu (IF EXISTS) sebelum dicipta semula
--
-- APA YANG DITAMBAH (v3, daripada log Excel sebenar pengguna):
--   - bloks.peringkat — Bibit / Anak, Matang, Berbuah, Semua Peringkat
--   - kerjas.zon — Semua Zon, Atas, Bawah, Tengah, Atas & Tengah,
--     Tengah & Bawah, Atas & Bawah
--   - kerjas.dos_jumlah / dos_unit / dos_per — dos berstruktur,
--     contoh: 200 g /pokok, 5 ml /sprayer, 1 karung /kawasan.
--     Lajur dos (teks) lama dikekalkan untuk paparan dan keserasian.
--   - kerjas.next_syarat — syarat kerja seterusnya, contoh:
--     "Jika belum mula berbuah", "Jika masih ada simptom"
--   - kerjas.next_tukar_bahan / next_bahan — tukar bahan lain kali,
--     contoh: "Racun kulat lain"
--   - Jadual baharu public.bahans — pustaka bahan:
--     nama, jenis_kerja, unit_lalai, dos_lalai, dengan RLS owner-only
--     yang sama seperti jadual lain.
--   - Gambar masih TIDAK disimpan di sini (tempatan sahaja).
-- ============================================================

-- ---------- bloks: peringkat ----------
alter table public.bloks
  add column if not exists peringkat text not null default 'Semua Peringkat';

-- ---------- kerjas: zon, dos berstruktur, syarat seterusnya ----------
alter table public.kerjas
  add column if not exists zon text not null default 'Semua Zon';
alter table public.kerjas
  add column if not exists dos_jumlah numeric;
alter table public.kerjas
  add column if not exists dos_unit text not null default '';
alter table public.kerjas
  add column if not exists dos_per text not null default '';
alter table public.kerjas
  add column if not exists next_syarat text not null default 'Tiada syarat';
alter table public.kerjas
  add column if not exists next_tukar_bahan boolean not null default false;
alter table public.kerjas
  add column if not exists next_bahan text not null default '';

-- ---------- bahans (pustaka bahan) ----------
create table if not exists public.bahans (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  nama text not null,
  jenis_kerja text not null default '',
  unit_lalai text not null default '',
  dos_lalai text not null default '',
  contoh boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists bahans_user_updated_idx
  on public.bahans (user_id, updated_at);

-- ---------- Row Level Security: bahans ----------
alter table public.bahans enable row level security;

drop policy if exists bahans_owner_select on public.bahans;
create policy bahans_owner_select on public.bahans
  for select using (auth.uid() = user_id);
drop policy if exists bahans_owner_insert on public.bahans;
create policy bahans_owner_insert on public.bahans
  for insert with check (auth.uid() = user_id);
drop policy if exists bahans_owner_update on public.bahans;
create policy bahans_owner_update on public.bahans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists bahans_owner_delete on public.bahans;
create policy bahans_owner_delete on public.bahans
  for delete using (auth.uid() = user_id);
