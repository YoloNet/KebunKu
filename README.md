# KebunKu

**KebunKu** ialah aplikasi log kerja kebun untuk petani yang bekerja sendiri — direka untuk menggantikan catatan dalam notes yang susah dicari balik.

> English summary: KebunKu is an offline-first farm work-log app for solo farmers. Android first (via Capacitor WebView), web now, iOS later. No backend and no login yet in this MVP — all data is stored on the device.

## Untuk siapa?

Petani solo dengan beberapa kebun — contohnya koko, sawit, durian dan lain-lain — yang pecahkan kerja ikut blok. Contoh: Blok 1 hari ini, Blok 2 esok atau lusa.

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

- Semua data disimpan dalam `localStorage` pelayar / WebView, dengan kunci `kebunku_data_v1`.
- Tiada pelayan, tiada akaun, tiada log masuk dalam MVP ini.
- Aplikasi berfungsi tanpa internet di kebun. Bila ada internet pun, data kekal dalam peranti — tiada sync automatik lagi.
- **Sandaran penting:** eksport JSON selalu, kerana data `localStorage` boleh hilang jika data pelayar dipadam atau aplikasi dinyahpasang.

## Had / batasan MVP ini (jujur)

- **Foto belum disimpan.** Butang foto sengaja tidak dimasukkan dalam MVP ini kerana menyimpan gambar dalam `localStorage` mudah mencecah had storan dan merosakkan aplikasi. Foto akan ditambah kemudian dengan storan fail sebenar (contohnya Capacitor Filesystem), bukan `localStorage`.
- **APK release belum dibuat.** APK debug boleh dibina ikut langkah di atas untuk ujian. APK/AAB release yang ditandatangani memerlukan keystore sendiri (lihat langkah release di atas) dan belum dibuat kerana keystore tidak boleh dijana bagi pihak pengguna tanpa kata laluan yang selamat.
- **iOS belum dibuat.** Hanya langkah masa depan didokumenkan di atas.
- **Tiada multi-pengguna lagi.** Semua orang yang guna peranti yang sama akan nampak data yang sama. Lihat bahagian seterusnya untuk reka bentuk masa depan.

## Struktur data — direka supaya boleh dikomersialkan kemudian

Data sekarang diasingkan dengan jelas, supaya boleh dipindah ke pangkalan data sebenar tanpa reka semula:

- `kebuns[]` — `{ id, nama }`
- `bloks[]` — `{ id, kebunId, nama, tanaman, tanamanLain }`
- `kerjas[]` — `{ id, kebunId, blokId, jenis, jenisLain, tarikhRancang, tarikhSiap, status, peratus, bahan, dos, kos, nota }`

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
