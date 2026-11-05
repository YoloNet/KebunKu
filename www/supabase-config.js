/* KebunKu — tetapan sambungan awan. Fail ini diisi SEKALI oleh PEMILIK aplikasi.
   Pengguna akhir TIDAK perlu melihat atau mengisi apa-apa di sini.
   Pemilik: salin Project URL dan anon public key daripada
   Supabase Dashboard > Project Settings > API, kemudian isi di bawah.
   Anon key ialah kunci awam (public client key) — ia selamat dihantar
   bersama aplikasi client kerana Row Level Security (RLS) memastikan
   setiap pengguna hanya boleh capai barisnya sendiri.
   JANGAN sesekali letak service_role key di sini — kunci itu rahsia
   pelayan sahaja dan boleh membaca/mengubah SEMUA data.
   Jika fail ini dibiarkan kosong, aplikasi masih berfungsi dengan
   tetapan yang pernah disimpan dalam peranti itu (jika ada); jika
   tiada langsung, pengguna akan nampak mesej "belum dikonfigurasi". */
window.KEBUNKU_SUPABASE = {
  url: "",
  anon: ""
};
