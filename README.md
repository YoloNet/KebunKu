# KebunKu

**KebunKu** ialah aplikasi log kerja kebun untuk petani yang bekerja sendiri — direka untuk menggantikan catatan dalam notes yang susah dicari balik.

> English summary: KebunKu is an offline-first farm work-log app for solo farmers. Android first (via Capacitor WebView), web now, iOS later. No backend and no login yet in this MVP — all data is stored on the device.

## Untuk siapa?

Petani solo dengan beberapa kebun — contohnya koko, sawit, durian dan lain-lain — yang pecahkan kerja ikut blok. Contoh: Blok 1 hari ini, Blok 2 esok atau lusa.

## KebunKu v3 — log daripada Excel sebenar, dropdown hampir semua

v3 dibina daripada fail log Excel sebenar pengguna (13 rekod kerja 2010). Matlamatnya: rekod kerja dalam masa kurang 30 saat, hampir tanpa menaip — hampir semua pilihan adalah dropdown.

### Apa yang baharu dalam v3

1. **Zon / bahagian kawasan** — setiap kerja ada Zon (dropdown): Semua Zon, Atas, Bawah, Tengah, Atas & Tengah, Tengah & Bawah, Atas & Bawah. Blok pula boleh dipilih "Semua Blok (seluruh kebun)" jika kerja itu meliputi seluruh kebun.
2. **Tanaman & peringkat blok** — tanaman blok sekarang: Koko, Sawit, Durian, Lada, Sayur, Lada & Sayur, Lain-lain. Setiap blok juga ada Peringkat (dropdown): Bibit / Anak, Matang, Berbuah, Semua Peringkat. Senarai blok memaparkan "Nama — Tanaman (Peringkat)".
3. **Pustaka bahan** — bahan tidak lagi ditaip bebas. Dalam borang kerja: pilih Jenis Kerja dahulu, kemudian Bahan (dropdown yang ditapis ikut jenis kerja sahaja). Pustaka lalai diambil daripada log Excel (ejaan dibetulkan: **Imidacloprid**, **Metalaxyl**): NPK 16-16-16, NPK 12-12-17, NPK 8-9-30, Imidacloprid, Halexyl, Metalaxyl, Antracol, Monex, Baja NPK 15-15-15, Glyphosate. Urus pustaka dalam tab Kebun → Pustaka Bahan (tambah/padam bahan; setiap bahan ada jenis kerja, unit lalai dan dos lalai).
4. **Dos berstruktur** — dos bukan lagi teks bebas, tetapi tiga medan kecil dalam satu baris: Jumlah (nombor) + Unit (g, kg, ml, L, sudu, karung, pek, botol) + Per (Tiada, /pokok, /sprayer, /kawasan, /liter air). Paparan automatik: 200 + g + /pokok = "200g/pokok"; 1 + karung + /kawasan = "1 karung/kawasan".
5. **Bahan & dos terakhir automatik** — bila Blok + Jenis Kerja dipilih, aplikasi isi Bahan dan Dos daripada kerja siap terakhir untuk blok+jenis itu, dengan nota "Terakhir: … — tekan Guna Semula" supaya anda boleh ubah atau isi semula.
6. **Kerja seterusnya bersyarat** — selain selang masa (termasuk pilihan baharu **3 Minggu**), ada Syarat (dropdown): Tiada syarat, Jika belum mula berbuah, Jika masih ada simptom, Jika masih ada rumput, Jika hujan / cuaca tidak mengizinkan, Lain-lain (taip sendiri). Ada juga kotak "Tukar bahan lain kali" + ruangan bahan baharu — jika ditanda, kerja susulan automatik akan **mengosongkan bahan** dan menulis nota "Tukar bahan: guna [bahan baharu] — bukan [bahan lama]". Jika tidak ditanda, susulan menyalin bahan dan dos ke hadapan.
7. **Sejarah & Ringkasan** — tapisan baharu: Bahan dan Zon; carian kini meliputi bahan dan dos. Ringkasan kini visual, bukan teks sahaja (v3.2): 4 kad nombor besar (Siap / Belum Siap / Tertunggak / Kos bulan ini), carta donut % siap bulan ini, bar kerja siap 7 hari terakhir, bar kemajuan ikut kebun, dan bar "Bahan Paling Kerap Digunakan — Bulan Ini". Semua carta dibina dengan SVG + CSS sahaja (tiada CDN), supaya kekal offline.
8. **Muat Contoh Log Lama** — dalam Ringkasan → Data Saya, butang "Muat Contoh Log Lama (13 rekod)" memuatkan 13 rekod kerja sebenar daripada log Excel lama (2010) ke dalam kebun "Kebun Contoh — Log Lama" (5 blok ikut kumpulan tanaman), dengan bahan/dos/zon dan kerja seterusnya + syarat yang sudah dihuraikan. Ia hanya dimuatkan sekali (tekan lagi tidak menduakan) dan boleh dibuang dengan "Padam Data Contoh Sahaja". Nota: fail Excel itu mengandungi 13 rekod kerja, bukan 17 — 20 baris fail termasuk tajuk dan baris kosong pemisah.
9. **Migrasi automatik v2 → v3** — data lama dikekalkan sepenuhnya; teks dos lama dihuraikan kepada bahagian berstruktur bila boleh ("200g/pokok" → 200/g//pokok, "5ml/sprayer", "1 karung semua kawasan" → 1/karung//kawasan); teks yang tidak dapat dihuraikan ("Ikut label") dikekalkan sebagai teks. Data disimpan dengan kunci `kebunku_data_v3`.

## KebunKu v3.4 — Ringkasan untuk pengguna akhir: tiada kunci dalam UI + panduan Cara Guna

v3.4 memuktamadkan Ringkasan untuk pengguna biasa — mereka hanya belajar guna aplikasi, tidak pernah nampak kunci sensitif:

1. **Tiada medan kunci dalam UI.** Medan Supabase URL, Anon Key, butang tunjuk/sembunyi kunci, dan pilihan backend sudah dibuang sepenuhnya daripada Ringkasan. Pengguna hanya nampak: status akaun (email + cara log masuk + terakhir sync), butang Google, log masuk email / kod pengesahan, Sync Sekarang, dan Log Keluar.
2. **Tetapan sambungan kini dalam fail `www/supabase-config.js`** (diisi SEKALI oleh pemilik): `window.KEBUNKU_SUPABASE = { url: "", anon: "" }`. Pemilik salin Project URL dan anon public key daripada Supabase Dashboard > Project Settings > API. Fail yang dihantar dalam repo ini dibiarkan KOSONG — jangan commit kunci sebenar. Jika fail kosong, aplikasi masih berfungsi dengan tetapan yang pernah disimpan dalam peranti itu (`kebunku_supabase_config_v1`); jika tiada langsung, pengguna nampak mesej mesra "Aplikasi ini belum dikonfigurasi oleh pemilik."
3. **Butang "Log Keluar & Padam Sesi Dari Peranti Ini"** (dahulu "Padam Tetapan Supabase") kini hanya memadam SESI log masuk dari peranti itu. Tetapan aplikasi tidak disentuh dan data dalam akaun tidak dipadam.
4. **Panduan "Cara Guna KebunKu"** di atas Ringkasan: 5 langkah bernombor — log masuk, tambah kebun & blok, rekod kerja (50% / 100%), semak Hari Ini, dan data tersimpan automatik.
5. Kad Akaun, Notifikasi, dan Data Saya yang lain tidak berubah fungsi; Ringkasan visual (kad stat, donut, bar 7 hari, bar kebun/bahan) juga tidak berubah.

### Nota jujur tentang anon key (penting untuk pemilik)

Anon key ialah kunci **awam mengikut reka bentuk** — sesiapa yang mahir teknikal boleh sentiasa melihatnya dalam trafik rangkaian mana-mana aplikasi client, walau apa pun dilakukan. Jadi ia tidak boleh benar-benar disembunyikan. Yang melindungi data ialah **Row Level Security (RLS)** — setiap pengguna hanya boleh capai barisnya sendiri — dan hakikat bahawa **service_role key tidak pernah** dimasukkan dalam aplikasi. Penambahbaikan v3.4 ialah kunci tidak lagi dipaparkan dalam UI dan pengguna akhir tidak perlu menaipnya; ia bukan penyembunyian kriptografi.

## KebunKu v3.3 — log masuk Google & kod pengesahan (OTP)

v3.3 menambah log masuk pengguna ke kad Supabase dalam Ringkasan → Akaun & Sandaran, masih melalui REST Supabase Auth terus (tanpa SDK, tanpa CDN):

1. **Log Masuk dengan Google** — butang putih di atas kad Supabase. Tekan, pilih akaun Google, dan anda kembali ke KebunKu sudah log masuk. Status memaparkan "Log masuk sebagai … (Google)". Pengguna Google tiada kata laluan — Log Keluar berfungsi sama seperti pengguna email.
2. **Daftar dengan kod pengesahan (OTP)** — laluan daftar utama sekarang. Isi email, tekan "Daftar (Kod Pengesahan)", dan kod 6 digit dihantar ke email itu. Masukkan kod + cipta kata laluan (min. 6 aksara), tekan "Sahkan & Daftar". Hanya pemilik email yang memegang kod itu boleh siapkan pendaftaran — ini yang menghalang pendaftaran spam. Selepas daftar, kata laluan turut ditetapkan supaya akaun itu boleh log masuk dengan email + kata laluan kemudian.
3. **Log Masuk dengan Kod** — untuk akaun sedia ada yang terlupa kata laluan: isi email, tekan "Log Masuk dengan Kod", masukkan kod 6 digit yang dihantar. Jika kod tidak diterima, guna log masuk kata laluan biasa.
4. **Log masuk email + kata laluan** — kekal seperti sebelum ini, tidak berubah.
5. **Anti-spam** — butang "Hantar Semula Kod" dikunci 60 saat dengan kira detik; Supabase sendiri menghadkan kadar permintaan OTP; kod tidak pernah disimpan dalam peranti. Sesi menyimpan medan `kaedah` ("google" / "otp" / "email") supaya status menunjukkan cara log masuk; sesi lama tanpa medan itu dianggap "email". Pautan kecil "Daftar cara lama (pautan email)" masih ada sebagai sandaran jika Email provider belum dihidupkan.

### Setup dashboard yang Jean MESTI buat sendiri (tidak boleh dibuat dari kod)

1. **Google (Authentication > Providers > Google):** hidupkan provider Google. Di [Google Cloud Console](https://console.cloud.google.com/apis/credentials), cipta projek + OAuth consent screen + OAuth client ID (jenis Web application); salin **Client ID** dan **Client Secret** ke dalam Supabase (Authentication > Providers > Google). Dalam Supabase, salin **Callback URL** yang dipaparkan (bentuk `https://<projek>.supabase.co/auth/v1/callback`) dan tampalkannya sebagai **Authorized redirect URI** dalam Google Cloud Console. Dalam Supabase (Authentication > URL Configuration), pastikan **Site URL** ialah URL aplikasi anda dan tambah URL aplikasi ke **Redirect URLs** yang dibenarkan.
2. **Email OTP (Authentication > Providers > Email):** hidupkan provider Email dan hidupkan pengesahan email (Confirm Email) supaya kod OTP dihantar. Semak juga tetapan **SMTP** — projek percuma Supabase menghantar email melalui SMTP lalai Supabase (ada had harian); untuk penggunaan ramai, sambungkan SMTP sendiri (contoh: Gmail / SendGrid) dalam Authentication > Settings.
3. **CAPTCHA (disyorkan, anti-spam tambahan):** dalam Supabase, Authentication > Settings > Bot and Abuse Protection, hidupkan CAPTCHA (hCaptcha) untuk endpoint daftar/OTP jika anda bercadang membuka pendaftaran kepada orang ramai.
4. **Uji:** daftar akaun ujian dengan kod OTP, log keluar, log masuk semula dengan Google, kemudian Sync Sekarang.

### Troubleshooting log masuk

- **"Google belum dihidupkan" / "provider not enabled":** hidupkan Google dalam Authentication > Providers dan pastikan Client ID/Secret sudah disimpan.
- **"redirect_uri_mismatch" / kembali ke halaman kosong selepas Google:** Redirect URL dalam Google Cloud Console mesti sama tepat dengan Callback URL Supabase (termasuk `https://` dan tanpa slash tambahan); Site URL dalam Supabase mesti URL aplikasi anda.
- **Kod salah / kod tamat tempoh:** kod OTP Supabase hanya sah beberapa minit. Tekan "Hantar Semula Kod" (tunggu kira detik 60 saat) dan guna kod terkini — kod lama tidak lagi sah selepas kod baharu dihantar.
- **Kod tidak sampai (inbox kosong):** semak folder Spam/Promotions; jika masih tiada, semak had SMTP projek dalam Supabase (projek percuma ada had email harian).
- **"Terlalu banyak permintaan kod":** Supabase menghadkan kadar OTP. Tunggu lebih kurang 1 minit kemudian cuba lagi.
- **Google login dalam APK Android (Capacitor WebView):** aliran redirect web di atas berfungsi dalam pelayar. Dalam WebView, redirect balik ke aplikasi memerlukan deep link (cth. skema `com.kebunku.app://`) yang didaftarkan sebagai Redirect URL — itu langkah masa depan, bukan dalam v3.3.
- **Jujur:** Google + OTP dalam v3.3 **tidak diuji terhadap projek Supabase sebenar** di sini (tiada kredensial live) — hanya terhadap endpoint mock dalam ujian automatik. Sila uji dengan projek anda mengikut langkah 4 di atas sebelum mengharapkannya berfungsi sepenuhnya.

### Supabase v3

Jalankan migrasi baharu **selepas** 001: `supabase/migrations/002_kebunku_v3.sql` (lihat langkah setup Supabase di bawah — langkah 2 kini merangkumi kedua-dua fail). Ia menambah `bloks.peringkat`, `kerjas.zon/dos_jumlah/dos_unit/dos_per/next_syarat/next_tukar_bahan/next_bahan`, dan jadual baharu `public.bahans` (pustaka bahan) dengan RLS owner-only yang sama. Pustaka bahan turut di-sync (tarik, gabung, upsert, tombstone) seperti kebun/blok/kerja.

## KebunKu v2 — aliran rekod baharu

Aliran yang diminta pengguna, dilaksanakan sepenuhnya dalam aplikasi:

1. **Datang ke kebun, siap kerja, kemudian masuk rekod** — tarikh, kebun, blok, dan kerja yang dibuat.
2. **Kerja Seterusnya** — dalam borang kerja, pilih: Tiada, 1 Minggu, 2 Minggu, 1 Bulan, 2 Bulan, 3 Bulan, 6 Bulan, 1 Tahun, atau Tarikh Custom (ruangan tarikh hanya muncul untuk pilihan custom).
3. **Susulan automatik** — jika kerja *baharu* disimpan dengan kerja seterusnya, satu kerja susulan yang dirancang (kebun/blok/jenis yang sama, status Dirancang) dicipta automatik pada tarikh itu dan muncul dalam Hari Ini / senarai akan datang. Jika anda *mengubah* kerja sedia ada, tarikh seterusnya hanya disimpan/dipaparkan — tiada susulan berganda dicipta.
4. **Kiraan tarikh bulan/tahun yang betul** — bukan +30 hari. Contoh: 31 Jan + 1 bulan = 28 Feb (29 Feb pada tahun lompat), 15 Dis + 2 bulan = 15 Feb tahun berikutnya.

### Jenis kerja v2

Membaja, Meracun Rumput, Racun Kulat, Racun Serangga, **Menuai, Pruning / Memangkas, Potong Rumput / Grasscutter, Menanam, Menyiram**, Lain-lain. Jenis lama masih boleh dibuka dan dipaparkan — "Membersihkan" (nama lama untuk Potong Rumput) dinormalkan automatik kepada "Potong Rumput" semasa data dimuatkan. Ikon SVG baharu dalam `www/assets/icons/`: `menuai.svg`, `pruning.svg`, `potong-rumput.svg`, `menanam.svg`, `menyiram.svg`.

### Notifikasi — 2 hari sebelum

- Suis hidup/mati dalam Ringkasan → Notifikasi, disimpan dalam tetapan (lalai: HIDUP).
- Bila HIDUP, Hari Ini memaparkan senarai "Akan Datang (2 hari lagi)" untuk kerja yang belum siap yang dijadualkan hari ini, esok, dan tepat 2 hari lagi.
- Bila MATI, tiada notifikasi pelayar dan senarai peringatan disembunyikan.
- **Web:** notifikasi pelayar hanya dihantar bila aplikasi dibuka dan izin sudah diberi. Aplikasi *tidak* meminta izin automatik semasa load — tekan "Benarkan Notifikasi" untuk meminta izin. Ia **tidak** berfungsi bila aplikasi ditutup sepenuhnya di web.
- **Android:** kod integrasi Capacitor LocalNotifications (`@capacitor/local-notifications` dalam `package.json`) disediakan dan dijaga (tidak buat apa-apa di web jika plugin tiada). Ia hanya berkuat kuasa selepas build Android (`npm install`, `npx cap sync`, bina semula). Notifikasi latar belakang sebenar di Android memerlukan build itu — bukan sekadar membuka versi web.

### Gambar — 1 gambar setiap kerja, dimampatkan, pilihan

- Dalam borang kerja, satu ruangan fail gambar (terima `image/*`, kamera pada telefon).
- Bila dipilih, gambar dimampatkan dengan canvas: dimensi maks 1280px, JPEG kualiti 0.82. Aplikasi memaparkan saiz asal vs saiz mampat (KB) dan pratonton. Memilih gambar baharu menggantikan gambar lama — hadnya tegas: 1 gambar sahaja.
- Kad kerja memaparkan thumbnail jika ada.
- **Gambar disimpan tempatan sahaja** dan tidak termasuk dalam eksport JSON biasa, untuk jimat storan. Pada masa depan, jika ada hosting, gambar boleh dibackup ke hosting — itu langkah seterusnya, bukan sekarang.

### Sandaran, database & retrieve selepas uninstall — penjelasan jujur

Data v2 disimpan dengan kunci `kebunku_data_v2` (migrasi automatik daripada `kebunku_data_v1`, kebun/blok/kerja dikekalkan, medan baharu ditambah: `nextTarikh`, `image`, `settings`, `updatedAt`).

**Tetapi aplikasi peranti sahaja tidak boleh survive uninstall.** Yang dilaksanakan sekarang:

- Model data berversi v2 + lapisan adapter sync dalam `app.js` (`Sync.toCloudPayload()` yang membuang gambar, `Sync.fromCloudPayload()` yang menggabung ikut id dengan last-updated-wins).
- Ringkasan → Akaun memaparkan status sandaran dalam bahasa biasa. (Sejak v3.4, tiada lagi pilihan backend atau medan kunci dalam UI — tetapan sambungan kini dalam fail `www/supabase-config.js` yang diisi pemilik; lihat bahagian v3.4.)
- Eksport JSON biasa sekarang **tanpa gambar** (label jelas). Ada juga butang berasingan "Eksport Penuh (Termasuk Gambar)" yang hanya berjalan selepas pengesahan eksplisit pengguna.

**Yang pengguna mesti putuskan sebelum retrieve selepas uninstall boleh berfungsi:** (1) backend awan mana (Supabase, Firebase, atau pelayan sendiri), (2) sistem akaun/log masuk, (3) hosting gambar jika gambar juga mahu dibackup. Sehingga itu diputuskan dan disambung, sandaran sebenar pengguna ialah fail eksport JSON (tanpa gambar) — eksport selalu sebelum uninstall / tukar telefon.

## Supabase — sync awan (pilihan pengguna, dilaksanakan)

Pengguna memilih **Supabase** sebagai backend awan. Pelaksanaan ini guna REST terus (Auth + PostgREST) melalui `fetch`, **tanpa CDN SDK**, supaya aplikasi kekal berfungsi offline dalam WebView dan tiada pergantungan luar baharu.

### Langkah setup (wajib, mengikut turutan)

1. **Cipta projek Supabase percuma** di https://supabase.com (New project, pilih rantau terdekat, tetapkan kata laluan database).
2. **Jalankan migrasi SQL** — dalam Supabase Dashboard, pergi ke **SQL Editor > New query**, tampal keseluruhan fail `supabase/migrations/001_kebunku.sql`, dan tekan **Run**. Fail ini mencipta jadual `kebuns`, `bloks`, `kerjas` dalam skema `public`, menghidupkan Row Level Security (RLS) pada ketiga-tiganya, menambah polisi "hanya baris sendiri" (`user_id = auth.uid()`), dan indeks `(user_id, updated_at)`. Ia idempotent untuk polisi/indeks (boleh dijalankan semula). **Kemudian jalankan fail kedua, `supabase/migrations/002_kebunku_v3.sql`, dengan cara yang sama** — ia menambah lajur v3 (`peringkat`, `zon`, dos berstruktur, syarat kerja seterusnya) dan jadual `public.bahans` dengan RLS owner-only. Fail 002 juga idempotent (ADD COLUMN IF NOT EXISTS) dan mesti dijalankan selepas 001.
3. **Isi fail config pemilik (sekali sahaja)** — buka `www/supabase-config.js` dan isi `url` dan `anon` dengan Project URL dan anon public key daripada **Project Settings > API** (contoh URL: `https://abcxyz.supabase.co`). Anon key ini selamat untuk aplikasi client kerana RLS melindungi data. JANGAN letak `service_role` key di sini — kunci itu rahsia pelayan sahaja. Fail ini TIDAK disertakan dengan kunci sebenar dalam repo; isi ia dalam salinan deployment anda. (Peranti yang sudah pernah menyimpan tetapan sebelum v3.4 masih berfungsi melalui tetapan simpanan itu walaupun fail ini kosong.)
4. **Log masuk dalam KebunKu** — buka **Ringkasan > Akaun**, kemudian log masuk: butang **Log Masuk dengan Google**, atau isi Email dan Kata Laluan dan tekan **Log Masuk**, atau tekan **Daftar (Kod Pengesahan)** untuk akaun baharu (lihat bahagian v3.3 di atas untuk setup Google/OTP dalam dashboard Supabase).
5. **Sync Sekarang** — tekan butang ini untuk sync pertama. Status akan memaparkan "Sync siap: X dihantar, Y diterima" atau mesej ralat yang jelas jika ada masalah.
6. **Uji retrieve selepas uninstall** — pada peranti / pelayar lain (atau selepas memadam data tempatan — pastikan eksport JSON dibuat dahulu sebagai sandaran keselamatan), buka aplikasi yang sama (dengan fail config yang sama), log masuk dengan **akaun yang sama**, dan tekan **Sync Sekarang**. Kebun, blok dan kerja anda (tanpa gambar) akan dimuat turun semula.

### Apa yang di-sync, dan apa yang tidak

- **Di-sync:** kebun (`id, nama, contoh`), blok (`id, kebun_id, nama, tanaman, tanaman_lain, peringkat, contoh`), kerja (`id, kebun_id, blok_id, jenis, jenis_lain, tarikh_rancang, tarikh_siap, status, peratus, bahan, dos, kos, nota, next_tarikh, zon, dos_jumlah, dos_unit, dos_per, next_syarat, next_tukar_bahan, next_bahan, contoh`, dan `updated_at` untuk last-updated-wins), dan bahan pustaka (`id, nama, jenis_kerja, unit_lalai, dos_lalai, contoh`). Id aplikasi dikekalkan sebagai `id` TEXT dalam Supabase, jadi rekod tempatan dan awan dipadankan satu-ke-satu.
- **Tidak di-sync:** gambar kerja (medan `image` sengaja dibuang daripada payload awan), `nextPilihan` (pilihan label sahaja — `next_tarikh` yang di-sync), dan tetapan tempatan lain. Gambar kekal dalam peranti sahaja.
- **Padam:** padam tempatan direkod sebagai senarai tombstone dan dihantar sebagai `deleted_at` semasa sync, supaya peranti lain tahu baris itu dipadam. Baris aktif sentiasa `deleted_at IS NULL`.
- **Gabungan (merge):** last-updated-wins ikut `updated_at`. Jika rekod jarak jauh lebih baharu, ia menggantikan tempatan (gambar tempatan dikekalkan). Jika tempatan lebih baharu, ia dihantar dan menang. Sync direka untuk seorang pengguna dengan beberapa peranti, bukan untuk suntingan serentak oleh ramai orang pada rekod yang sama.
- **Offline:** simpanan tempatan tidak pernah dihalang oleh sync. Jika tiada internet atau sync gagal, data tempatan tetap tersimpan dan sync akan dicuba semula pada Sync Sekarang seterusnya, atau secara automatik pada simpanan seterusnya bila suis Sync Automatik HIDUP dan ada internet (dengan kelewatan 1.5 saat, tidak menghalang).

### Keselamatan

- Tetapan sambungan dibaca daripada fail `www/supabase-config.js` (diisi pemilik) dahulu, kemudian daripada tetapan yang pernah disimpan dalam peranti (`kebunku_supabase_config_v1`). Sesi log masuk disimpan **dalam peranti ini sahaja**, dalam kunci `localStorage` yang berasingan (`kebunku_supabase_session_v1`, `kebunku_supabase_sync_v1`). Tiada satu pun daripadanya dimasukkan dalam eksport data utama, dan tiada kunci sebenar dalam repo ini — fail config yang dihantar dibiarkan kosong.
- RLS memastikan pengguna yang log masuk hanya boleh SELECT / INSERT / UPDATE / DELETE baris dengan `user_id = auth.uid()` sendiri, walaupun anon key diketahui umum (lihat nota jujur dalam bahagian v3.4 di atas).
- Token akses disimpan tempatan dan disegarkan automatik melalui `refresh_token` bila tamat tempoh. Log Keluar memadam sesi tempatan sahaja (data awan tidak dipadam). Butang "Log Keluar & Padam Sesi Dari Peranti Ini" hanya memadam sesi log masuk dari peranti itu — tetapan aplikasi dan data dalam akaun tidak disentuh.

### Troubleshooting

- **"Aplikasi ini belum dikonfigurasi oleh pemilik":** fail `www/supabase-config.js` masih kosong dan peranti itu belum pernah menyimpan tetapan. Pemilik: isi `url` (mesti bermula `https://`, tanpa slash di hujung) dan `anon` dalam fail itu (bukan `service_role` key — jangan sesekali guna service_role key dalam aplikasi).
- **Sync gagal (kod 404 / 406 / "relation does not exist"):** fail SQL migrasi belum dijalankan, atau dijalankan dalam projek yang salah. Jalankan semula `001_kebunku.sql` (dan `002_kebunku_v3.sql` untuk v3 — ralat tentang `bahans` atau lajur `peringkat`/`zon`/`dos_jumlah` bermaksud 002 belum dijalankan) dalam SQL Editor projek yang betul.
- **Log masuk gagal / "Email not confirmed":** dalam Supabase, pergi ke **Authentication > Providers > Email** dan semak tetapan **Confirm Email**. Jika ia HIDUP, pengguna mesti sahkan email melalui inbox dahulu sebelum boleh log masuk. Untuk ujian solo, anda boleh matikan Confirm Email, atau sahkan email tersebut — aplikasi akan memberitahu anda jika pendaftaran memerlukan pengesahan email.
- **Data tidak muncul pada peranti kedua:** pastikan kedua-dua peranti membuka aplikasi yang sama (fail config yang sama) dan log masuk dengan akaun yang sama, kemudian tekan Sync Sekarang pada kedua-duanya. Semak status "Terakhir sync" dalam aplikasi.
- **Data lama kembali selepas dipadam:** itu berlaku jika padam dibuat sebelum sync sempat menghantar tombstone, atau pada peranti yang belum sync. Padam, kemudian tekan Sync Sekarang pada peranti itu sebelum sync pada peranti lain.
- **Had PostgREST:** sync mengambil semua baris pengguna dalam satu panggilan setiap jadual (had lalai PostgREST 1000 baris). Untuk petani solo ini lebih daripada mencukupi; jika suatu hari melebihi 1000 rekod, pagination perlu ditambah.

### Masa depan (bukan sekarang)

- **Supabase Storage untuk gambar:** backup gambar ke Storage dengan rujukan fail dalam rekod kerja, bukan data URL dalam pangkalan data. Ini memerlukan polisi Storage dan kod muat naik/muat turun yang berasingan — belum dilaksanakan dalam versi ini.

## Apa yang ada dalam MVP Fasa 1?

1. **Kebun & Blok** — tambah kebun, kemudian blok dalam kebun itu. Setiap blok ada tanaman: Koko, Sawit, Durian, atau Lain-lain (isi sendiri).
2. **Kerja** — jenis kerja: Membaja, Meracun Rumput, Racun Kulat, Racun Serangga, Lain-lain. Setiap kerja simpan kebun, blok, tanaman, tarikh dirancang, tarikh siap, status (Dirancang, Dalam Proses, Siap Sebahagian, Siap, Tertangguh), peratus siap, bahan, dos/kuantiti, kos (RM) dan nota ringkas.
3. **Hari Ini** — senarai kerja dirancang hari ini **ditambah** kerja tertunggak. Kerja tertunggak tidak hilang senyap-senyap; ia dibawa ke hadapan sehingga siap.
4. **Pecah & sambung kerja** — tandakan siap sebahagian dengan peratus (dropdown 50% atau 100% sahaja), kemudian tekan “Bawa ke Esok” atau “Bawa ke Lusa” untuk baki kerja itu. Kerja yang dirancang untuk masa depan disimpan 0% sehingga dikemaskini.
5. **Rekod pantas** — butang template untuk jenis kerja yang selalu diulang, dan butang “Salin kerja semalam ke hari ini”. Borang direka supaya siap dalam masa kurang 30 saat.
6. **Sejarah & carian** — tapis ikut kebun, blok, tanaman, jenis kerja, tarikh, dan bahan/nota. Ada juga alat “Bila kali terakhir kerja ini dibuat?” — contohnya pilih Blok 1 + Membaja untuk jawab bila Blok 1 terakhir dibaja.
7. **Ringkasan** — 7 hari terakhir dan bulan ini: kerja siap vs belum siap, dan jumlah kos kerja siap, termasuk pecahan ikut kebun.
8. **Data contoh, eksport & import** — kali pertama dibuka, aplikasi memuatkan data contoh (Kebun Contoh, Blok 1 Koko, dll). Tekan “Padam Data Contoh Sahaja” untuk mula kosong tanpa memadam data anda. Eksport JSON untuk sandaran, dan import JSON untuk pulihkan data.

## Cara jalankan di web (tanpa build)

Aplikasi ini guna stack web tanpa build — tiada CDN, semua fail tempatan dalam `www/`. Jadi ia boleh dibuka terus dalam pelayar dan dalam WebView.

```bash
cd www
python3 -m http.server 8000
```

Kemudian buka http://localhost:8000

> Nota: Membuka `index.html` terus dari fail juga berfungsi untuk kebanyakan pelayar, tetapi menjalankan pelayan tempatan di atas adalah cara yang lebih boleh dipercayai, terutamanya untuk WebView.

## Reka bentuk UI

UI direka supaya nampak profesional dan kemas, bukan seperti aplikasi generik: hijau ladang gelap (`#1E4D2B`) dengan warna krim/batu yang hangat, hanya satu aksen emas, tiada gradient, tiada glassmorphism. Navigasi bawah pada telefon, butang sekurang-kurangnya 48px, kontras tinggi untuk bacaan di bawah matahari, dan ikon SVG tempatan (bukan emoji) untuk tanaman dan jenis kerja. Semua aset dalam `www/assets/` — tiada URL luar, jadi aplikasi kekal berfungsi offline dalam WebView.

- `www/assets/logo.svg` — logo KebunKu (daun + baris ladang)
- `www/assets/illustration-empty.svg` — ilustrasi ringkas untuk keadaan kosong
- `www/assets/icons/` — ikon Koko, Sawit, Durian, Membaja, Meracun Rumput, Racun Kulat, Racun Serangga
- `www/assets/nav/` — ikon navigasi bawah
- `assets/icon.png` — ikon pelancar Android 512×512 (sumber untuk ikon dalam `android/app/src/main/res/mipmap-*/`)

## Cara bina aplikasi Android (Capacitor)

Prasyarat: Node.js, npm, JDK 17, dan Android SDK (command-line tools sudah memadai untuk binaan debug; Android Studio hanya diperlukan jika mahu jalankan pada emulator atau urus peranti).

Bina APK debug (boleh dipasang untuk ujian, tidak ditandatangani untuk Play Store):

```bash
npm install
npx cap add android   # hanya sekali, jika folder android/ belum wujud
npx cap sync
export ANDROID_HOME="$HOME/Android/Sdk"   # atau lokasi SDK anda
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
cd android
./gradlew assembleDebug
```

APK debug akan terhasil di:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Pasang pada telefon dengan USB debugging dihidupkan:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Setiap kali anda ubah fail dalam `www/`, jalankan `npx cap sync` semula sebelum bina lagi. Untuk jalankan dalam Android Studio, gunakan `npx cap open android` dan tekan **Run**.

Konfigurasi sudah disediakan dalam `capacitor.config.json`:

- `appId`: `com.kebunku.app`
- `appName`: `KebunKu`
- `webDir`: `www`

### APK release yang ditandatangani (langkah masa depan, keystore TIDAK boleh di-commit)

APK debug di atas **bukan** untuk Play Store. Untuk release:

```bash
keytool -genkeypair -v -keystore kebunku-release.keystore -alias kebunku \
  -keyalg RSA -keysize 2048 -validity 10000
```

Simpan keystore dan kata laluannya di luar repo (jangan commit — `.gitignore` sudah menyekat `*.keystore`). Kemudian tambah signing config dalam `android/app/build.gradle` yang membaca kata laluan dari pemboleh ubah persekitaran atau `local.properties` (fail ini juga diabaikan git), dan bina:

```bash
cd android
./gradlew bundleRelease   # untuk AAB Play Store
# atau
./gradlew assembleRelease # untuk APK release
```

## iOS — pada masa depan sahaja

Projek iOS **tidak** dibuat dalam MVP ini. Bila bersedia, dari folder yang sama:

```bash
npx cap add ios
npx cap sync
npx cap open ios
```

Kemudian bina dan jalankan dalam Xcode. Kod web yang sama dalam `www/` akan digunakan semula — tiada kod berasingan perlu ditulis untuk iOS pada peringkat ini.

## Offline-first — bagaimana data disimpan?

- Semua data disimpan dalam `localStorage` pelayar / WebView, dengan kunci `kebunku_data_v3` (migrasi automatik daripada `kebunku_data_v2` dan `kebunku_data_v1`).
- **Sync awan (jika dikonfigurasi pemilik):** jika pengguna log masuk dalam Ringkasan > Akaun, data tanpa gambar di-sync ke akaun pengguna (lihat bahagian Supabase di atas). Tetapan sambungan dibaca daripada `www/supabase-config.js`; sesi disimpan dalam kunci berasingan dan tidak dieksport.
- Aplikasi berfungsi tanpa internet di kebun. Bila ada internet dan pengguna sudah log masuk dengan suis Sync Automatik HIDUP, sync dicuba automatik selepas simpanan tempatan; jika tidak, sync hanya berlaku bila pengguna tekan Sync Sekarang.
- **Sandaran penting:** eksport JSON selalu, kerana data `localStorage` boleh hilang jika data pelayar dipadam atau aplikasi dinyahpasang — kecuali anda sudah sync ke Supabase dan boleh retrieve semula dengan log masuk yang sama.

## Had / batasan MVP ini (jujur)

- **Foto kini 1 gambar setiap kerja, dimampatkan, tempatan sahaja.** Lihat bahagian v2 di atas. Storan fail sebenar (contohnya Capacitor Filesystem) masih merupakan penambahbaikan masa depan jika `localStorage` menjadi sempit; buat masa ini gambar kekal dalam rekod kerja tempatan dan tidak termasuk dalam eksport biasa.
- **APK release belum dibuat.** APK debug boleh dibina ikut langkah di atas untuk ujian. APK/AAB release yang ditandatangani memerlukan keystore sendiri (lihat langkah release di atas) dan belum dibuat kerana keystore tidak boleh dijana bagi pihak pengguna tanpa kata laluan yang selamat.
- **iOS belum dibuat.** Hanya langkah masa depan didokumenkan di atas.
- **Tiada multi-pengguna lagi.** Semua orang yang guna peranti yang sama akan nampak data yang sama. Lihat bahagian seterusnya untuk reka bentuk masa depan.

## Struktur data — direka supaya boleh dikomersialkan kemudian

Data sekarang diasingkan dengan jelas, supaya boleh dipindah ke pangkalan data sebenar tanpa reka semula:

- `kebuns[]` — `{ id, nama }`
- `bloks[]` — `{ id, kebunId, nama, tanaman, tanamanLain, peringkat }`
- `kerjas[]` — `{ id, kebunId, blokId, zon, jenis, jenisLain, tarikhRancang, tarikhSiap, status, peratus, bahan, bahanId, dos, dosJumlah, dosUnit, dosPer, kos, nota, nextTarikh, nextPilihan, nextSyarat, nextSyaratLain, nextTukarBahan, nextBahan, image, updatedAt }` (v3; `dos` dikekalkan sebagai teks terhasil daripada bahagian berstruktur)
- `bahans[]` — `{ id, nama, jenisKerja, unitLalai, dosLalai, nota, contoh, updatedAt }` (pustaka bahan, v3)

Hubungan ini kekal sama bila naik taraf nanti. Yang perlu ditambah kemudian, tanpa ubah konsep asas:

- `pengguna / tenant` — setiap pelanggan ada kebun sendiri, data diasingkan ikut `tenantId`.
- `peranan` — pemilik, pekerja, penyelia; tugasan boleh diagih, bukan hanya untuk diri sendiri.
- `langganan` — akaun percuma vs berbayar, had kebun/blok.
- `pelayan + sync` — gantikan `localStorage` dengan API + pangkalan data, tetapi kekalkan mod offline-first (simpan tempatan dahulu, sync kemudian).
- `laporan` — eksport PDF, graf kos, dan sejarah penuh ikut kebun.

Dengan kata lain: MVP ini kekal ringkas untuk seorang petani, tetapi strukturnya tidak menghalang versi komersial nanti.

## Fail projek

```
kebunku/
├── www/
│   ├── index.html   # Antara muka (Bahasa Malaysia, mobile-first, navigasi bawah)
│   ├── styles.css   # Sistem reka bentuk: hijau gelap + krim, butang min 48px
│   ├── app.js       # Logik aplikasi, localStorage
│   └── assets/      # logo, ilustrasi kosong, ikon tanaman/kerja/navigasi (SVG tempatan)
├── assets/
│   └── icon.png     # Ikon pelancar Android 512×512
├── supabase/
│   └── migrations/
│       ├── 001_kebunku.sql  # Migrasi Supabase: jadual kebuns/bloks/kerjas + RLS
│       └── 002_kebunku_v3.sql  # Migrasi v3: peringkat, zon, dos berstruktur, syarat seterusnya, jadual bahans + RLS
├── android/         # Projek Android Capacitor (dibina dengan Gradle, lihat di atas)
├── package.json
├── capacitor.config.json
├── .gitignore
└── README.md
```
