-- KebunKu — migrasi Supabase 001
-- ============================================================
-- CARA GUNA:
--   1. Cipta projek Supabase percuma di https://supabase.com
--   2. Dalam Supabase Dashboard, pergi ke SQL Editor > New query
--   3. Tampal keseluruhan fail ini dan tekan Run
--   4. Salin Project URL dan anon public key dari
--      Project Settings > API, kemudian tampal dalam aplikasi
--      KebunKu > Ringkasan > Akaun & Sandaran > Supabase
--
-- IDEMPOTEN (boleh dijalankan semula dengan selamat):
--   - Jadual dicipta hanya jika belum wujud (CREATE TABLE IF NOT EXISTS)
--   - Indeks dicipta hanya jika belum wujud (CREATE INDEX IF NOT EXISTS)
--   - RLS dihidupkan semula setiap kali (idempotent)
--   - Polisi lama dibuang dahulu (DROP POLICY IF EXISTS) sebelum dicipta semula
--   NOTA: Jika jadual sudah wujud dengan skema lama yang berbeza,
--   CREATE TABLE IF NOT EXISTS tidak akan mengubah lajur sedia ada.
--   Untuk projek baharu, fail ini mencipta skema yang betul dari awal.
--
-- REKA BENTUK:
--   - id adalah TEXT, bukan uuid — ia mestilah sama dengan id yang dijana
--     aplikasi (contoh: "id_xxxx"), supaya rekod tempatan dan awan boleh
--     dipadankan satu-ke-satu semasa sync.
--   - user_id merujuk auth.users, dan Row Level Security (RLS) memastikan
--     setiap pengguna hanya nampak / ubah barisnya sendiri, walaupun
--     anon key diketahui umum.
--   - kebun_id / blok_id adalah TEXT tanpa foreign key ke jadual kebuns/bloks.
--     Ini disengajakan: sync boleh upsert dalam apa-apa susunan tanpa gagal
--     kerana susunan foreign key, dan pemilikan dikuatkuasakan oleh RLS
--     melalui user_id, bukan melalui rantaian foreign key.
--   - deleted_at ialah tombstone: baris yang dipadam tidak dibuang terus,
--     ia ditandakan deleted_at, supaya peranti lain tahu baris itu dipadam
--     semasa sync. Baris aktif sentiasa mempunyai deleted_at IS NULL.
--   - Gambar TIDAK disimpan di sini dalam versi ini. Medan image aplikasi
--     tidak pernah dihantar ke Supabase — gambar kekal tempatan sahaja.
--     Backup gambar ke Supabase Storage ialah langkah masa depan.
-- ============================================================

-- ---------- kebuns ----------
create table if not exists public.kebuns (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  nama text not null,
  contoh boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- bloks ----------
create table if not exists public.bloks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kebun_id text not null,
  nama text not null,
  tanaman text not null,
  tanaman_lain text not null default '',
  contoh boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- kerjas ----------
create table if not exists public.kerjas (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kebun_id text not null,
  blok_id text not null,
  jenis text not null,
  jenis_lain text not null default '',
  tarikh_rancang date,
  tarikh_siap date,
  status text not null,
  peratus integer not null default 0,
  bahan text not null default '',
  dos text not null default '',
  kos numeric not null default 0,
  nota text not null default '',
  next_tarikh date,
  contoh boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- indeks (user_id, updated_at) ----------
create index if not exists kebuns_user_updated_idx
  on public.kebuns (user_id, updated_at);
create index if not exists bloks_user_updated_idx
  on public.bloks (user_id, updated_at);
create index if not exists kerjas_user_updated_idx
  on public.kerjas (user_id, updated_at);

-- ---------- Row Level Security ----------
alter table public.kebuns enable row level security;
alter table public.bloks enable row level security;
alter table public.kerjas enable row level security;

-- kebuns: hanya baris sendiri
drop policy if exists kebuns_owner_select on public.kebuns;
create policy kebuns_owner_select on public.kebuns
  for select using (auth.uid() = user_id);
drop policy if exists kebuns_owner_insert on public.kebuns;
create policy kebuns_owner_insert on public.kebuns
  for insert with check (auth.uid() = user_id);
drop policy if exists kebuns_owner_update on public.kebuns;
create policy kebuns_owner_update on public.kebuns
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists kebuns_owner_delete on public.kebuns;
create policy kebuns_owner_delete on public.kebuns
  for delete using (auth.uid() = user_id);

-- bloks: hanya baris sendiri
drop policy if exists bloks_owner_select on public.bloks;
create policy bloks_owner_select on public.bloks
  for select using (auth.uid() = user_id);
drop policy if exists bloks_owner_insert on public.bloks;
create policy bloks_owner_insert on public.bloks
  for insert with check (auth.uid() = user_id);
drop policy if exists bloks_owner_update on public.bloks;
create policy bloks_owner_update on public.bloks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists bloks_owner_delete on public.bloks;
create policy bloks_owner_delete on public.bloks
  for delete using (auth.uid() = user_id);

-- kerjas: hanya baris sendiri
drop policy if exists kerjas_owner_select on public.kerjas;
create policy kerjas_owner_select on public.kerjas
  for select using (auth.uid() = user_id);
drop policy if exists kerjas_owner_insert on public.kerjas;
create policy kerjas_owner_insert on public.kerjas
  for insert with check (auth.uid() = user_id);
drop policy if exists kerjas_owner_update on public.kerjas;
create policy kerjas_owner_update on public.kerjas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists kerjas_owner_delete on public.kerjas;
create policy kerjas_owner_delete on public.kerjas
  for delete using (auth.uid() = user_id);
