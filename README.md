# KebunKu

**KebunKu** ialah aplikasi log kerja kebun untuk petani yang bekerja sendiri — direka untuk menggantikan catatan dalam notes yang susah dicari balik.

> English summary: KebunKu is an offline-first farm work-log app for solo farmers. Android first (via Capacitor WebView), web now, iOS later. No backend and no login yet in this MVP — all data is stored on the device.

## Untuk siapa?

Petani solo dengan beberapa kebun — contohnya koko, sawit, durian dan lain-lain — yang pecahkan kerja ikut blok. Contoh: Blok 1 hari ini, Blok 2 esok atau lusa.

## KebunKu v2 — aliran rekod baharu

Aliran yang diminta pengguna, dilaksanakan sepenuhnya dalam aplikasi:

1. **Datang ke kebun, siap kerja, kemudian masuk rekod** — tarikh, kebun, blok, dan kerja yang dibuat.
2. **Kerja Seterusnya** — dalam borang kerja, pilih: Tiada, 1 Minggu, 2 Minggu, 1 Bulan, 2 Bulan, 3 Bulan, 6 Bulan, 1 Tahun, atau Tarikh Custom (ruangan tarikh hanya muncul untuk pilihan custom).
3. **Susulan automatik** — jika kerja *baharu* disimpan dengan kerja seterusnya, satu kerja susulan yang dirancang (kebun/blok/jenis yang sama, status Dirancang) dicipta automatik pada tarikh itu dan muncul dalam Hari Ini / senarai akan datang. Jika anda *mengubah* kerja sedia ada, tarikh seterusnya hanya disimpan/dipaparkan — tiada susulan berganda dicipta.
4. **Kiraan tarikh bulan/tahun yang betul** — bukan +30 hari. Contoh: 31 Jan + 1 bulan = 28 Feb (29 Feb pada tahun lompat), 15 Dis + 2 bulan = 15 Feb tahun berikutnya.

### Jenis kerja v2

Membaja, Meracun Rumput, Racun Kulat, Racun Serangga, **Menuai, Pruning / Memangkas, Membersihkan, Menanam, Menyiram**, Lain-lain. Jenis lama masih boleh dibuka dan dipaparkan. Ikon SVG baharu dalam `www/assets/icons/`: `menuai.svg`, `pruning.svg`, `membersihkan.svg`, `menanam.svg`, `menyiram.svg`.

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
- Ringkasan → Akaun & Sandaran memaparkan status ini dalam bahasa biasa, dan pilihan backend direkod (`belum disambung` / Supabase / Firebase / Pelayan Sendiri) — pilihan itu hanya direkod, **tiada sync berlaku**.
- Eksport JSON biasa sekarang **tanpa gambar** (label jelas). Ada juga butang berasingan "Eksport Penuh (Termasuk Gambar)" yang hanya berjalan selepas pengesahan eksplisit pengguna.

**Yang pengguna mesti putuskan sebelum retrieve selepas uninstall boleh berfungsi:** (1) backend awan mana (Supabase, Firebase, atau pelayan sendiri), (2) sistem akaun/log masuk, (3) hosting gambar jika gambar juga mahu dibackup. Sehingga itu diputuskan dan disambung, sandaran sebenar pengguna ialah fail eksport JSON (tanpa gambar) — eksport selalu sebelum uninstall / tukar telefon.

## Apa yang ada dalam MVP Fasa 1?

1. **Kebun & Blok** — tambah kebun, kemudian blok dalam kebun itu. Setiap blok ada tanaman: Koko, Sawit, Durian, atau Lain-lain (isi sendiri).
2. **Kerja** — jenis kerja: Membaja, Meracun Rumput, Racun Kulat, Racun Serangga, Lain-lain. Setiap kerja simpan kebun, blok, tanaman, tarikh dirancang, tarikh siap, status (Dirancang, Dalam Proses, Siap Sebahagian, Siap, Tertangguh), peratus siap, bahan, dos/kuantiti, kos (RM) dan nota ringkas.
3. **Hari Ini** — senarai kerja dirancang hari ini **ditambah** kerja tertunggak. Kerja tertunggak tidak hilang senyap-senyap; ia dibawa ke hadapan sehingga siap.
4. **Pecah & sambung kerja** — tandakan siap sebahagian dengan peratus, kemudian tekan “Bawa ke Esok” atau “Bawa ke Lusa” untuk baki kerja itu.
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

- Semua data disimpan dalam `localStorage` pelayar / WebView, dengan kunci `kebunku_data_v2` (migrasi automatik daripada `kebunku_data_v1`).
- Tiada pelayan, tiada akaun, tiada log masuk dalam MVP ini.
- Aplikasi berfungsi tanpa internet di kebun. Bila ada internet pun, data kekal dalam peranti — tiada sync automatik lagi.
- **Sandaran penting:** eksport JSON selalu, kerana data `localStorage` boleh hilang jika data pelayar dipadam atau aplikasi dinyahpasang.

## Had / batasan MVP ini (jujur)

- **Foto kini 1 gambar setiap kerja, dimampatkan, tempatan sahaja.** Lihat bahagian v2 di atas. Storan fail sebenar (contohnya Capacitor Filesystem) masih merupakan penambahbaikan masa depan jika `localStorage` menjadi sempit; buat masa ini gambar kekal dalam rekod kerja tempatan dan tidak termasuk dalam eksport biasa.
- **APK release belum dibuat.** APK debug boleh dibina ikut langkah di atas untuk ujian. APK/AAB release yang ditandatangani memerlukan keystore sendiri (lihat langkah release di atas) dan belum dibuat kerana keystore tidak boleh dijana bagi pihak pengguna tanpa kata laluan yang selamat.
- **iOS belum dibuat.** Hanya langkah masa depan didokumenkan di atas.
- **Tiada multi-pengguna lagi.** Semua orang yang guna peranti yang sama akan nampak data yang sama. Lihat bahagian seterusnya untuk reka bentuk masa depan.

## Struktur data — direka supaya boleh dikomersialkan kemudian

Data sekarang diasingkan dengan jelas, supaya boleh dipindah ke pangkalan data sebenar tanpa reka semula:

- `kebuns[]` — `{ id, nama }`
- `bloks[]` — `{ id, kebunId, nama, tanaman, tanamanLain }`
- `kerjas[]` — `{ id, kebunId, blokId, jenis, jenisLain, tarikhRancang, tarikhSiap, status, peratus, bahan, dos, kos, nota, nextTarikh, nextPilihan, image, updatedAt }` (v2)

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
├── android/         # Projek Android Capacitor (dibina dengan Gradle, lihat di atas)
├── package.json
├── capacitor.config.json
├── .gitignore
└── README.md
```
