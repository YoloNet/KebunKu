# KebunKu

**KebunKu** ialah aplikasi rekod kerja kebun untuk petani yang bekerja sendiri — direka untuk menggantikan catatan dalam notes yang susah dicari balik.

> English summary: KebunKu is an offline-first farm work-log app for solo farmers. Android first (via Capacitor WebView), web now, iOS later. Supabase cloud sync + Google/email/OTP login (v3.3–v3.5) — all data is stored on the device first, then synced to the user's own account when logged in.

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

## KebunKu v3.6 — anti-spam, perkataan "rekod", tiada contoh, Sejarah Kalendar, Mesej Pembangun

v3.6 membaiki 8 perkara yang Jean jumpa semasa menguji APK (item 9 dalam mesejnya kosong — tiada apa-apa):

1. **Anti-spam Simpan Kerja.** Butang Simpan dikunci serta-merta semasa simpanan berjalan (termasuk butang Rekod Pantas) dan satu bendera `_simpanKerja` mengabaikan submit berganda. Tambahan pula semakan idempotensi: kerja baharu yang sama (kebun, blok, jenis, bahan, dos, tarikh) dalam 60 saat terakhir disekat dengan mesej "Kerja ini sudah disimpan." Kerja susulan automatik juga tidak dicipta dua kali untuk tarikh/jenis yang sama, dan "Salin kerja semalam" melangkau kerja yang sudah disalin hari ini.
2. **Perkataan "log" → "rekod".** Semua perkataan "log" yang merujuk kepada rekod kerja ditukar kepada "rekod" dalam UI — tajuk, tagline header kini **"Semua Rekod Kebun, Dalam Satu Tempat."**, butang dan mesej. "Log Masuk"/"Log Keluar" (istilah log masuk) turut ditukar kepada **"Daftar Masuk"** / **"Keluar"** supaya perkataan "log" tidak lagi muncul dalam UI. Tagline grafik Play Store dalam `scripts/make-assets.py` juga dikemas kini.
3. **Tiada lagi data contoh.** Butang "Muat Contoh Log Lama" dan import 13 rekod contoh dibuang sepenuhnya, dan pemasangan baharu TIDAK lagi mencipta "Kebun Contoh" automatik — pengguna isi kebun/blok sendiri dari kosong. Data contoh pengguna lama yang sudah dimuatkan TIDAK dipadam; butang "Padam Data Contoh Sahaja" masih ada tetapi hanya muncul bila ada data contoh.
4. **Pustaka bahan bermula kosong.** 10 bahan lalai dibuang — pemasangan baharu mula dengan pustaka kosong. Dropdown bahan menunjukkan "Tiada bahan — tambah baharu" dan aliran "Tambah bahan baharu…" masih berfungsi; bahan pengguna lama dikekalkan.
5. **Senarai Kerja dipaginasi.** Tab Kerja menunjukkan 10 kerja terkini dahulu, butang "Tunjuk Lagi" memuat 10 lagi setiap kali.
6. **Kerja siap keluar dari tab Kerja.** Kerja berstatus "Siap" (100%) tidak lagi disenaraikan dalam tab Kerja — ia hanya dalam Sejarah. "Siap Sebahagian" (50%) dan kerja dirancang / dalam proses kekal dalam Kerja.
7. **Sejarah — Kalendar bulan + Senarai.** Paparan lalai kini Kalendar: grid bulan dengan navigasi bulan lepas/depan, sel hari menunjukkan lencana bilangan kerja pada hari itu, tekan satu hari untuk lihat kerja hari itu di bawah. Tapisan sedia ada (kebun, blok, tanaman, jenis, bahan, zon, carian, julat tarikh) menapis titik kalendar DAN senarai hari. Suis "Kalendar | Senarai" bertukar ke paparan Senarai — dikumpulkan mengikut tajuk bulan dan dipaginasi 20 demi 20 dengan "Tunjuk Lagi". Tarikh paparan kerja ialah tarikhSiap jika ada, jika tidak tarikhRancang.
8. **Mesej Pembangun (pengumuman) — infrastruktur untuk notifikasi masa depan.** Migrasi baharu `supabase/migrations/003_pengumuman.sql` mencipta jadual `public.pengumuman` (id, tajuk, mesej, jenis, tarikh, aktif) dengan RLS: semua orang boleh BACA pengumuman aktif sahaja; TIADA polisi tulis — hanya pemilik boleh tulis melalui SQL Editor / service_role. Aplikasi mengambil 5 pengumuman aktif terkini bila log masuk / sync (tetamu dan tanpa config dilangkau) dan memaparkannya sebagai kad "Mesej Pembangun" di atas tab Hari Ini, dengan butang "Tanda Sudah Dibaca" (yang sudah dibaca tidak muncul lagi). Jika migrasi 003 belum dijalankan, pengambilan gagal secara senyap dan aplikasi tidak terjejas. Plugin `@capacitor/push-notifications` ditambah dan kod pendaftaran FCM (minta izin + simpan token dalam `kebunku_push_token_v1`) disediakan secara guarded — hanya berjalan dalam APK, tidak buat apa-apa di web.

### Cara Jean menghantar pengumuman (mesej pembangun)

1. Jalankan `supabase/migrations/003_pengumuman.sql` dalam Supabase SQL Editor (selepas 001 dan 002).
2. Hantar pengumuman pertama dalam SQL Editor:
   ```sql
   insert into public.pengumuman (id, tajuk, mesej, jenis, aktif)
   values ('v36-01', 'KebunKu v3.6 sudah keluar!',
     'Kemas kini aplikasi anda: Sejarah kini ada paparan Kalendar, senarai Kerja dipaginasi, dan kerja siap tidak lagi bercampur dengan kerja belum siap. Terima kasih kerana menggunakan KebunKu.',
     'kemaskini', true);
   ```
3. Pengguna akan nampak kad "Mesej Pembangun" di atas tab Hari Ini pada log masuk / sync seterusnya. Sembunyikan pengumuman lama dengan `update public.pengumuman set aktif = false where id = 'v36-01';`.

### Notifikasi push sebenar (FCM) — masih perlu disediakan kemudian

Pengumuman dalam aplikasi (di atas) berfungsi SEKARANG selepas 003 dijalankan — ia tidak memerlukan Firebase. Untuk notifikasi push sebenar (mesej sampai walaupun aplikasi ditutup), Jean masih perlu sediakan kemudian: (1) cipta projek Firebase dan daftarkan aplikasi Android `com.kebunku.app`; (2) muat turun `google-services.json` dan letakkan dalam `android/app/` (jangan commit kunci server); (3) dalam Firebase Console, hantar mesej melalui Cloud Messaging (FCM HTTP v1 API) kepada token yang disimpan dalam `kebunku_push_token_v1` — token itu perlu dihantar ke server sendiri atau disimpan dalam jadual Supabase pada masa depan (belum dibuat). Kod dalam aplikasi sudah bersedia menerima dan menyimpan token itu.

### Versi Android (v3.6)

`android/app/build.gradle`: `versionCode 3`, `versionName "3.6.0"`. `package.json` versi `3.6.0`.

## KebunKu v3.8 — Bahasa (BM / English) + header diperkemas

v3.8 menambah penukar bahasa dalam aplikasi dan memperkemas bahagian atas (header + tajuk tab), tanpa mengubah warna atau susunan sedia ada.

### Bahasa / Language

- **Dua bahasa:** Bahasa Malaysia (lalai) dan English. Tukar dalam **Ringkasan > Tetapan > Bahasa / Language** — bahasa ditukar serta-merta, disimpan dalam peranti, dan kekal selepas aplikasi dibuka semula.
- **Semua teks antara muka diterjemah:** label navigasi bawah, header, tajuk tab, borang Kerja (label, placeholder, pilihan status/peratus/jenis kerja/zon/tanaman/peringkat/syarat), salam dashboard, kalendar Sejarah (nama bulan + hari), kad Ringkasan, panduan Cara Guna, kad Notifikasi/Akaun/Data Saya, onboarding, dan mesej/toast.
- **Data pengguna TIDAK diterjemah:** nama kebun, blok, bahan, nota dan nama paparan kekal seperti yang anda taip — hanya teks antara muka bertukar bahasa.
- **Halaman privasi** (`www/privacy.html`) kekal dalam Bahasa Malaysia buat masa ini.
- **Menambah bahasa ketiga (untuk developer):** tambah satu objek bahasa baharu dalam `www/i18n.js` (salin semua kunci dari `ms`/`en` — setiap kunci mesti wujud dalam semua bahasa), tambah satu `<option>` dalam dropdown `#bahasaSelect` di `www/index.html`, dan benarkan kod bahasa itu dalam `normalData()` (`www/app.js`). Semak dengan skrip kelengkapan kamus — tiada kunci boleh hilang.

### Header + tajuk tab diperkemas

- Header kini **sticky** (kekal di atas semasa skrol), dengan jubin logo berbayang lembut, tajuk lebih besar/tebal, tagline lebih kecil dalam hijau pudar, dan garis emas nipis di bawah header.
- Setiap tab kini ada **eyebrow emas** (label kecil huruf besar) di atas tajuk tab yang lebih besar — Hari Ini (dalam blok salam), Kebun, Kerja, Sejarah, Ringkasan. Warna, navigasi bawah dan semua fungsi kekal sama.

### Versi Android (v3.8)

`android/app/build.gradle`: `versionCode 5`, `versionName "3.8.0"`. `package.json` versi `3.8.0`.

## KebunKu v3.7 — Iklan (infrastruktur, belum dihidupkan)

v3.7 menyediakan infrastruktur iklan Google untuk masa depan. Iklan **DIMATIKAN secara lalai** (`diaktifkan: false` dalam `www/ads-config.js`) — selagi suis itu false, aplikasi tidak memuat sebarang skrip iklan dan tiada ruang iklan yang muncul. Semua ID dihantar sebagai placeholder kosong; tiada ID penerbit/unit sebenar dalam repo.

### Perbezaan jujur — AdSense vs AdMob (penting untuk pemilik)

- **AdSense = versi WEB sahaja.** Polisi Google melarang iklan AdSense dipaparkan dalam WebView aplikasi. Memaparkan AdSense dalam APK boleh menyebabkan akaun AdSense disekat. Jadi laluan AdSense dalam kod hanya berjalan bila aplikasi dibuka di pelayar web (tiada `window.Capacitor`).
- **AdMob = APK Android.** Ini produk yang betul untuk aplikasi. Laluan AdMob hanya berjalan dalam Capacitor. Plugin `@capacitor-community/admob@6.2.0` dipasang dan didaftar melalui `npx cap sync` (`android/app/src/main/assets/capacitor.plugins.json`).

### Kedudukan & polisi kekerapan (dikuatkuasakan dalam kod — objek `Iklan` dalam `app.js`)

- **Maksima 2 banner** dalam seluruh aplikasi: satu di bawah tab **Ringkasan** (selepas semua kad, sebelum footer) dan satu di bawah tab **Sejarah** (selepas kalendar/senarai dan butang "Tunjuk Lagi"). Kedua-duanya berlabel "Iklan" dalam teks kecil pudar.
- **Maksima 1 iklan kelihatan pada satu masa** — hanya slot tab aktif boleh dimuat; slot lain tersembunyi bersama tabnya. Banner AdMob natif ditunjukkan hanya semasa tab Ringkasan/Sejarah aktif dan disembunyikan pada semua tab lain.
- **Minima 60 saat antara muatan iklan baharu** untuk slot/unit yang sama — tukar tab berulang kali tidak memuat iklan baharu.
- **Tiada interstitial, tiada rewarded, tiada popup.** Tiada iklan dalam borang Kerja, Hari Ini, onboarding, atau aliran daftar masuk.
- **Tiada anjakan layout:** bekas slot disembunyikan sepenuhnya bila iklan dimatikan / tiada ID (tiada ruang kosong), dan ruang menyimpan ketinggian tetap (min 100px) bila iklan dimuat. Banner AdMob natif diletakkan `BOTTOM_CENTER` dengan margin 76dp supaya ia duduk di atas bar navigasi bawah, bukan menutupnya.

### Cara hidupkan — versi web (AdSense)

1. Cipta akaun Google AdSense dan dapatkan **ID penerbit** (`ca-pub-...`) dan **ID unit iklan** untuk dua slot banner.
2. Isi dalam `www/ads-config.js`: `adsense.publisherId` (nombor sahaja pun diterima — kod tambah `ca-pub-` sendiri), `adsense.slotRingkasan`, `adsense.slotSejarah`.
3. Tetapkan `diaktifkan: true`.
4. Tambah fail `ads.txt` pada laman web yang menghoskan versi web (AdSense memerlukannya untuk pengesahan penerbit).

### Cara hidupkan — APK (AdMob)

1. Cipta akaun Google AdMob dan daftarkan aplikasi Android `com.kebunku.app`; dapatkan **App ID** (`ca-app-pub-...~...`) dan **dua ID unit banner**.
2. Tambah meta-data ini dalam `android/app/src/main/AndroidManifest.xml` (dalam `<application>`, gantikan `APP_ID_SEBENAR` dengan App ID anda — JANGAN commit App ID palsu; tanpa meta-data ini SDK AdMob tidak akan berfungsi):
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY" />
   ```
3. Isi dalam `www/ads-config.js`: `admob.appId`, `admob.bannerRingkasan`, `admob.bannerSejarah`.
4. Tetapkan `diaktifkan: true`, jalankan `npx cap sync android`, dan build semula APK/AAB.
5. Semasa menguji, guna **test ad unit IDs** Google dahulu (banner test: `ca-app-pub-3940256099942544/6300978111`) — JANGAN klik iklan sendiri dalam aplikasi sebenar.

### Mod pratonton

Tetapkan `modPratonton: true` dalam `www/ads-config.js` (suis `diaktifkan` boleh kekal `false`) — kedua-dua slot memaparkan kotak berlabel "Ruang Iklan — pratonton sahaja. Tiada iklan sebenar dimuatkan." di kedudukan sebenar, **tanpa** memuat sebarang skrip iklan luar. Guna ini untuk melihat kedudukan iklan sebelum akaun iklan siap.

### Versi Android (v3.7)

`android/app/build.gradle`: `versionCode 4`, `versionName "3.7.0"`. `package.json` versi `3.7.0`.

## KebunKu v3.5 — Android / Play Store: onboarding, nama paparan, dashboard, deep link Google

v3.5 menyediakan aplikasi untuk build Android dan muat naik Play Store (Fasa 1 — perubahan aplikasi; build AAB dijalankan dalam Fasa 2 melalui GitHub Actions):

1. **Onboarding — Log Masuk atau Tetamu.** Pada pemasangan baharu (tiada sesi dan mod belum dipilih), skrin penuh "Selamat Datang ke KebunKu" muncul dengan dua pilihan: **Log Masuk** (pergi ke Ringkasan &gt; Akaun) atau **Teruskan sebagai Tetamu** (`settings.mod = "tetamu"`). Pengguna yang sudah log masuk tidak pernah nampak skrin ini. Log keluar memadam `mod`, jadi pengguna kembali ke pilihan ini.
2. **Mod Tetamu (tempatan sahaja).** Bila `mod = "tetamu"`, `syncPenuh()` dan `jadualAutoSync()` menolak sync terus — data tetamu tidak pernah dihantar ke Supabase. Butang **Sync Sekarang** dilumpuhkan dengan hint "Log masuk untuk backup data anda ke cloud", dan kad Akaun menunjukkan "Mod Tetamu — data hanya dalam peranti ini" + butang **Log Masuk untuk Backup**. Jika tetamu kemudian log masuk, data tempatannya digabungkan ke cloud melalui sync biasa (last-updated-wins).
3. **Nama paparan.** Selepas sebarang log masuk yang berjaya (Google/email/OTP), jika tiada nama disimpan, aplikasi cuba ambil `user_metadata.nama_paparan` (atau `full_name` untuk Google); jika masih tiada, modal "Nama yang anda ingin gunakan?" muncul sekali sahaja — butang **Langkau** mencatatkan `namaDitanya` supaya tidak mengganggu setiap kali dibuka. Nama disimpan dalam `settings.namaPaparan` DAN ke akaun melalui `PUT /auth/v1/user { data: { nama_paparan } }` (best effort — kegagalan tidak menghalang simpanan tempatan). Medan "Nama Paparan" + "Simpan Nama" juga ada dalam kad Akaun untuk diubah bila-bila masa. Nama dipaparkan dalam sapaan dashboard dan baris status Akaun.
4. **Dashboard Hari Ini.** Blok sapaan di atas tab Hari Ini: sapaan ikut masa (Selamat pagi &lt;12, Selamat tengah hari 12–15, Selamat petang 15–19, Selamat malam ≥19) + nama jika ada + tarikh hari ini; di bawahnya 3 jubin mini: Kerja Hari Ini / Tertunggak / Siap Hari Ini. Senarai peringatan, senarai kerja dan Rekod Pantas tidak berubah.
5. **Hak cipta.** Footer setiap paparan: "© 2026 RJ TECH SOLUTIONS — Hak cipta terpelihara." + pautan **Privasi** ke `www/privacy.html`. `package.json` kini ada `"author": "RJ TECH SOLUTIONS"`.
6. **Google login dalam APK (deep link).** Butang Google kini mengesan Capacitor: dalam APK ia membuka URL authorize melalui plugin **Browser** (`@capacitor/browser`) dan mendengar redirect `com.kebunku.app://login-callback` melalui plugin **App** (`@capacitor/app`, `appUrlOpen`). Token dihurai oleh fungsi `SB.terimaTokenDariUrl(url)` — fungsi yang sama digunakan oleh aliran hash web — dan sesi disimpan sama seperti sebelum ini. `AndroidManifest.xml` ada intent-filter kedua untuk skema `com.kebunku.app` / hos `login-callback` (intent-filter MAIN/LAUNCHER asal tidak disentuh). Aliran web tidak berubah bila Capacitor tiada. **Setup yang Jean MESTI buat:** tambah `com.kebunku.app://login-callback` ke Supabase **Authentication &gt; URL Configuration &gt; Redirect URLs**. Deep link ini diuji dengan URL mock, bukan dengan build APK sebenar (Fasa 2).
7. **Ikon / splash / aset.** PNG tidak boleh dihantar melalui snapshot push, jadi aset binari **tidak di-commit**. Skrip `scripts/make-assets.py` (Python + PIL, tanpa rangkaian) menjana semula aset daripada `www/assets/logo.svg`: `assets/icon.png` (512×512), `assets/splash.png` (1024×1024 atas krim), dan grafik ciri Play Store 1024×500 ke `~/workspace/kebunku-play-assets/feature-graphic.png` (di luar repo — Jean muat naik manual dalam Play Console). Jalankan dengan `python3 scripts/make-assets.py`. Build GitHub Actions menjalankan skrip ini SEBELUM `npx @capacitor/assets generate`. `capacitor.config.json` kini ada tetapan SplashScreen (`backgroundColor #F7F4EC`, `launchShowDuration 1500`).
8. **Versi Android.** `android/app/build.gradle`: `versionCode 2`, `versionName "3.5.0"` (daripada 1 / "1.0"). SDK (daripada `android/variables.gradle`): `compileSdk 34`, `targetSdk 34`, `minSdk 22`. `package.json` versi `3.5.0`.

### Play Store — senarai semak

- **AAB, bukan APK debug.** Play Store memerlukan Android App Bundle yang ditandatangani: `./gradlew bundleRelease`. APK debug tidak diterima.
- **Keystore milik Jean.** Keystore release dicipta oleh Jean sendiri (`keytool -genkeypair ...`) dan **TIDAK PERNAH di-commit**. Build release membacanya daripada GitHub Secrets (lihat bawah) — kata laluan keystore juga rahsia.
- **versionCode naik setiap release.** Setiap AAB baharu mesti ada `versionCode` lebih tinggi daripada yang sebelumnya (kini 2). `versionName` pula untuk paparan (kini 3.5.0).
- **Tahap API sasaran (target API level).** Kini `targetSdk 34` (Android 14). Semak keperluan Play Store semasa sebelum hantar — jika Play memerlukan tahap lebih baharu, naikkan `targetSdkVersion` dalam `android/variables.gradle` dan uji semula.
- **Dasar privasi (URL).** Hoskan `www/privacy.html` (contoh: di hosting web anda) dan tampal URL penuhnya dalam Play Console &gt; App content &gt; Privacy policy. Fail itu menerangkan: email, nama paparan, log kerja kebun; simpanan Supabase dengan RLS (setiap pengguna hanya nampak datanya sendiri); log masuk Google; iklan (buat masa ini tiada — seksyen 8 dalam `privacy.html` menerangkan iklan masa depan); tiada jualan data; cara memadam akaun/data (log keluar + hubungi pemilik).
- **Ikon aplikasi 512×512** — `assets/icon.png` (dijana oleh `scripts/make-assets.py`).
- **Grafik ciri 1024×500** — `kebunku-play-assets/feature-graphic.png` (dijana oleh skrip yang sama; muat naik manual dalam Play Console &gt; Store listing).
- **Penilaian kandungan (content rating).** Jawab soal selidik dalam Play Console &gt; App content &gt; Content rating — KebunKu tiada kandungan sensitif, tiada pembelian dalam aplikasi. Iklan: buat masa ini tiada (iklan dimatikan secara lalai); jika iklan AdMob dihidupkan kemudian, jawab semula bahagian iklan dalam soal selidik ini.
- **Borang Data Safety.** Isytiharkan: data yang dikumpul ialah email, nama paparan, dan log kerja kebun; data disulitkan semasa transit (HTTPS); buat masa ini tiada iklan — jika iklan AdMob dihidupkan kemudian, isytiharkan juga bahawa Google AdMob boleh mengumpul pengecam peranti (advertising ID) untuk iklan; data tidak dikongsi dengan pihak ketiga untuk pengiklanan; pengguna boleh meminta pemadaman akaun/data (hubungi pemilik, lihat `privacy.html`).

### Kunci Supabase dalam aplikasi Android (tepat)

Aplikasi Android membaca fail yang **sama**, `www/supabase-config.js`, yang dibundel ke dalam APK oleh `npx cap sync` — tiada fail config berasingan untuk Android. Untuk build release GitHub Actions (Fasa 2), workflow menulis fail itu daripada GitHub Secrets, supaya kunci tidak masuk ke dalam repo:

- Repo **Settings &gt; Secrets and variables &gt; Actions &gt; New repository secret**:
  - `SUPABASE_URL` — Project URL Supabase (cth. `https://abcxyz.supabase.co`)
  - `SUPABASE_ANON_KEY` — anon public key (bukan `service_role` — jangan sesekali guna service_role key dalam aplikasi)
- Workflow menulis `www/supabase-config.js` dengan dua nilai itu sebelum `npx cap sync`. Fail yang di-commit dalam repo ini kekal KOSONG (placeholder sahaja).
- **Juga tambah dalam Supabase:** Authentication &gt; URL Configuration &gt; Redirect URLs — `com.kebunku.app://login-callback` (untuk log masuk Google dalam APK).

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
- **Google login dalam APK Android (Capacitor WebView):** dilaksanakan dalam v3.5 — plugin Browser + App, deep link `com.kebunku.app://login-callback` (lihat bahagian v3.5). Pastikan URL itu didaftarkan dalam Supabase &gt; Authentication &gt; URL Configuration &gt; Redirect URLs.
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
- **APK release belum dibuat.** APK debug boleh dibina ikut langkah di atas untuk ujian. APK/AAB release yang ditandatangani memerlukan keystore sendiri (lihat langkah release di atas) dan belum dibuat kerana keystore tidak boleh dijana bagi pihak pengguna tanpa kata laluan yang selamat. **v3.5:** Fasa 1 (perubahan aplikasi) sudah siap — termasuk deep link Google, ikon/splash yang dijana oleh skrip, dan senarai semak Play Store di atas. Fasa 2 (build AAB melalui GitHub Actions) masih berasingan dan belum dijalankan.
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
│   ├── privacy.html # Dasar Privasi (Bahasa Malaysia) — pautan dari footer
│   └── assets/      # logo, ilustrasi kosong, ikon tanaman/kerja/navigasi (SVG tempatan)
├── scripts/
│   └── make-assets.py # Jana icon.png / splash.png / feature-graphic.png (PIL, tanpa rangkaian)
├── assets/
│   ├── icon.png     # Ikon pelancar Android 512×512 (dijana — TIDAK di-commit)
│   └── splash.png   # Splash 1024×1024 (dijana — TIDAK di-commit)
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
