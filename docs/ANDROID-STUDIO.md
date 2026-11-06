# KebunKu — Panduan Compile dalam Android Studio

Panduan langkah demi langkah untuk compile KebunKu (v3.10.0) menjadi APK debug
(untuk ujian di telefon) dan AAB release (untuk upload ke Google Play Store).

Repo: https://github.com/YoloNet/KebunKu — branch `main`

> **Android ialah platform utama KebunKu** — semua ciri terkini dibina dan disahkan untuk APK. Versi web ialah kod yang sama dan dikekalkan untuk ujian pantas sahaja.

> Nota: fail workflow GitHub Actions (`.github/workflows/build-apk.yml`) TIDAK ada
> dalam repo ini — ia hanya wujud setempat kerana GitHub App yang digunakan
> untuk push tidak mempunyai kebenaran Workflows. Fail itu TIDAK diperlukan
> untuk compile dalam Android Studio. Jika anda mahu build automatik kemudian,
> tambah fail itu sendiri melalui laman web GitHub (Add file > Create new file).

---

## 1. Apa yang perlu dipasang dahulu

| Perkara | Versi / nota |
|---|---|
| Android Studio | Otter 2025.2.1 atau lebih baharu (wajib untuk Capacitor 8). **Jean sudah ada Rabbit 2 | 2026.2.2 Patch 1 — lebih baharu daripada minimum, tiada perlu naik taraf.** Muat turun dari https://developer.android.com/studio |
| JDK | **21** — Android Studio Otter+ sudah membundel JDK 21 (embedded JDK). Tidak perlu pasang JDK berasingan. |
| Android SDK | API 36 (Android 16) + build-tools 36.0.0 — pasang melalui SDK Manager dalam Android Studio. **Penting: API 36 MESTI dipasang walaupun anda sudah ada API 37 (Android 17)** — `compileSdkVersion` projek ini ialah 36 dan Gradle memerlukan platform 36 yang tepat; API 37 tidak menggantikannya. Jangan tukar compile/target ke 37 (Capacitor 8 direka untuk 36). Jika build-tools yang sepadan tiada, Gradle sync akan menawarkan untuk memasangnya. |
| Node.js | 22 LTS + npm (dari https://nodejs.org). Capacitor 8 memerlukan Node 22+. Diperlukan untuk `npm install` dan `npx cap sync`. |
| Python 3 + Pillow | Pilihan sahaja — hanya jika anda mahu jana semula ikon/splash (langkah 5). |

Semak versi selepas pasang (dalam terminal / Command Prompt):

```bash
node -v        # patut tunjuk v20.x
npm -v
```

---

## 2. Clone repo dan pasang dependencies

```bash
git clone https://github.com/YoloNet/KebunKu.git
cd KebunKu
npm install
```

`npm install` memasang Capacitor dan plugin-pluginnya
(`@capacitor/browser` dan `@capacitor/app` untuk login Google dalam APK).

---

## 3. Isi key Supabase (WAJIB untuk login/sync dalam APK)

Apps Android membaca fail yang sama seperti versi web:

```
www/supabase-config.js
```

Buka fail itu dan isi `url` dan `anon` dengan nilai dari
Supabase Dashboard > Project Settings > API:

```js
window.KEBUNKU_SUPABASE = {
  url: "https://<projek-anda>.supabase.co",
  anon: "<anon public key anda>"
};
```

Peraturan penting:

- Guna **anon public key** sahaja. JANGAN sesekali letak `service_role` key.
- Tanpa config ini, apps masih boleh dibuka dalam **mod Tetamu**
  (data hanya dalam telefon, tiada backup), tetapi login akan tunjuk
  mesej "belum dikonfigurasi".
- Redirect URL `com.kebunku.app://login-callback` mesti sudah ditambah
  dalam Supabase (Authentication > URL Configuration > Redirect URLs)
  supaya login Google berfungsi dalam APK — ini sudah ditambah.

---

## 4. Sync kod web ke dalam projek Android

Setiap kali anda ubah apa-apa dalam `www/`, jalankan:

```bash
npx cap sync android
```

Perintah ini menyalin `www/` (termasuk `supabase-config.js` yang anda isi
di langkah 3) ke dalam `android/app/src/main/assets/public/`.

---

## 5. (Pilihan) Jana semula ikon dan splash screen

Ikon dan splash dijana daripada logo SVG dengan skrip Python:

```bash
python3 scripts/make-assets.py
npx @capacitor/assets generate --android
```

Skrip itu menjana `assets/icon.png` (1024×1024) dan `assets/splash.png`
(2732×2732). Langkah ini pilihan — jika dilangkau, APK akan guna ikon
lalai Capacitor.

---

## 6. Buka projek dalam Android Studio

1. Buka Android Studio.
2. Pilih **Open** dan pilih folder **`android/`** di dalam repo ini
   (BUKAN folder repo utama — buka folder `android` sebagai projek).
3. Tunggu **Gradle sync** selesai. Sync pertama memuat turun Gradle 9.8.2
   dan dependencies — perlukan internet dan mengambil masa beberapa minit.
   Ini normal.
4. Pastikan Gradle menggunakan JDK 21:
   File > Settings > Build, Execution, Deployment > Build Tools > Gradle >
   **Gradle JDK** — pilih **21** (embedded JDK).

---

## 7. Compile APK debug (untuk ujian di telefon)

**Cara A — terus run ke telefon:**

1. Pada telefon, hidupkan **Developer options > USB debugging**,
   sambungkan telefon ke PC dengan kabel USB, dan benarkan debugging.
2. Dalam Android Studio, pilih telefon anda pada dropdown peranti,
   kemudian tekan butang **Run** (▶).

**Cara B — bina fail APK:**

1. Menu **Build > Build App Bundle(s) / APK(s) > Build APK(s)**.
2. Tunggu sehingga muncul notifikasi "Build APK(s) completed".
3. Fail APK ada di:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

4. Salin fail itu ke telefon dan install. Benarkan **"Install unknown apps"**
   bila telefon bertanya.

**Apa yang perlu diuji dalam APK debug:**

1. Skrin selamat datang muncul — cuba **Teruskan sebagai Tetamu** dahulu.
   Rekod satu kerja dan pastikan ia tersimpan.
2. Log keluar, kemudian cuba **Log Masuk dengan Google** — pilih akaun
   Google, pastikan anda kembali ke apps dan nama anda ditanya.
3. Cuba log masuk dengan email/kod OTP.
4. Tekan **Sync Sekarang** dalam Ringkasan dan pastikan data sampai
   (semak dalam Supabase > Table Editor).

---

## 8. Bina AAB release untuk Google Play Store

Play Store menerima **AAB** (Android App Bundle), bukan APK debug.

1. Menu **Build > Generate Signed App Bundle / APK**.
2. Pilih **Android App Bundle** > Next.
3. Pada bahagian Key store:
   - **Create new...** jika ini keystore pertama anda.
   - Isi laluan fail `.jks`, kata laluan keystore, alias, dan kata laluan key.
   - **SIMPAN fail `.jks` ini di tempat yang SELAMAT di luar repo dan buat
     backup.** Jika fail ini hilang, anda TIDAK BOLEH lagi update apps
     ini di Play Store — Google tidak boleh pulihkannya.
   - JANGAN commit fail `.jks` atau kata laluannya ke GitHub.
4. Pilih build variant **release** > Finish.
5. Fail AAB ada di:

```
android/app/build/outputs/bundle/release/app-release.aab
```

6. Upload fail `.aab` itu dalam **Google Play Console** (Create app >
   Production > Create new release).
7. Untuk setiap release baharu, naikkan `versionCode` (+1) dan `versionName`
   dalam `android/app/build.gradle` (semasa: `versionCode 8`,
   `versionName "3.10.0"`).

> Nota v3.9: gambar kerja dimatikan buat sementara sehingga hosting gambar sendiri disediakan — input gambar disembunyikan dalam aplikasi (bendera `GAMBAR_DIMATIKAN` dalam `www/app.js`); data gambar lama tidak dipadam.

**Iklan AdMob (pilihan, masa depan):** Infrastruktur iklan sudah ada dalam aplikasi (v3.7) tetapi **dimatikan secara lalai** — AAB yang anda bina sekarang tiada iklan. Jika anda mahu hidupkan iklan AdMob kemudian, lihat seksyen v3.7 dalam README: dapatkan App ID + dua ID unit banner dari akaun AdMob, tambah meta-data `com.google.android.gms.ads.APPLICATION_ID` dalam `android/app/src/main/AndroidManifest.xml`, isi `www/ads-config.js`, tetapkan `diaktifkan: true`, jalankan `npx cap sync android`, dan build semula. Semasa menguji, guna test ad unit IDs Google dahulu — jangan klik iklan sendiri dalam aplikasi sebenar.

**Senarai semak Play Store:**

- AAB bertandatangan (langkah 8 di atas).
- Ikon apps 512×512 dan feature graphic 1024×500
  (feature graphic dijana oleh `scripts/make-assets.py`).
- Polisi privasi: fail `www/privacy.html` sudah disediakan dalam Bahasa
  Malaysia — hostkannya di mana-mana (contohnya GitHub Pages) dan tampal
  URL itu dalam Play Console.
- Content rating (soal selidik dalam Play Console).
- Data Safety form: apps mengumpul email, nama paparan, dan log kerja
  kebun; data disimpan dalam Supabase; buat masa ini tiada iklan (iklan
  dimatikan secara lalai — jika AdMob dihidupkan kemudian, isytiharkan
  juga pengecam peranti untuk iklan); tiada penjualan data.

---

## 9. Troubleshooting

| Masalah | Penyelesaian |
|---|---|
| Gradle sync gagal: AGP 9.5.0 memerlukan Gradle 9.6.0+ | Pastikan wrapper 9.8.2 — semak `android/gradle/wrapper/gradle-wrapper.properties` mengandungi `gradle-9.8.2-all.zip`. Jangan turunkan Gradle ke 8.x (projek ini kini AGP 9.5.0). |
| Ralat `ClassCastException` (BaseExtension) / kotlin-android tidak serasi | Jalan keluar sementara yang didokumenkan Google: tambah `android.newDsl=false` dalam `android/gradle.properties`, sync semula, dan laporkan teks ralat penuh kepada Muse. |
| Gradle sync gagal / ralat JDK | Gradle JDK mesti 21 (langkah 6, nombor 4). Jangan guna JDK 8 atau 17. |
| "SDK location not found" | Buka SDK Manager dan pasang API 36; atau pastikan `local.properties` mengandungi `sdk.dir` (Android Studio menciptanya automatik). |
| `npx cap sync` gagal | Jalankan `npm install` semula, kemudian `npx cap sync android` semula. |
| Apps tunjuk "belum dikonfigurasi" | `www/supabase-config.js` masih kosong — isi key (langkah 3), kemudian `npx cap sync android` semula dan build semula. |
| Login Google tidak kembali ke apps | Pastikan redirect URL `com.kebunku.app://login-callback` ada dalam Supabase (langkah 3). |
| Build pertama sangat perlahan | Normal — Gradle memuat turun dependencies sekali sahaja. |
| `gradlew` tidak boleh dijalankan | Dalam Android Studio, Gradle diuruskan oleh IDE — anda tidak perlu jalankan `./gradlew` sendiri. Jika mahu guna terminal, `cd android` dahulu. |

---

## 10. Maklumat versi semasa

- `applicationId`: `com.kebunku.app`
- `versionName`: `3.11.2` — `versionCode`: `11`
- `compileSdk` / `targetSdk`: `36` — `minSdk`: `24` (Android 7.0 ke atas)
- Gradle: `9.8.2` — Capacitor: `8.6.0` — AGP: `9.5.0` — Kotlin: `2.4.10` — google-services: `4.5.0`
- Pemilik apps: **© 2026 RJ TECH SOLUTIONS**

### Patch node_modules (patch-package)
- Plugin AdMob perlu patch untuk AGP 9: `patches/@capacitor-community+admob+8.3.0.patch` (guard `kotlin-android` + `kotlin { jvmToolchain(21) }`). Patch dipakai automatik oleh skrip `postinstall` setiap kali `npm install` — **pastikan `npm install` dijalankan selepas `git pull`**, atau jalankan `npx patch-package` secara manual. Jika patch gagal dipakai selepas kemas kini plugin, maklumkan kepada Muse.
- Jangan edit fail dalam `node_modules` secara terus — suntingan itu hilang apabila `npm install` dijalankan semula; edit melalui patch-package (`npx patch-package <nama-pakej>`) supaya patch baharu terhasil dalam folder `patches/`.

### Laporan Problems (amaran deprecation) selepas build
- Laporan `android/build/reports/problems/problems-report.html` hanya mengandungi **amaran (WARNING), bukan ralat (ERROR)** — build berjaya dan APK terhasil walaupun amaran disenaraikan. Jangan panik melihat jumlahnya.
- Amaran *"Implicit lookup of properties in parent projects"* dalam `android/app/build.gradle` sudah dibaiki dalam v3.11.1 (kini guna `${rootProject.ext.…}` secara eksplisit).
- Baki amaran yang sama datang daripada fail janaan Capacitor (`capacitor-cordova-android-plugins/cordova.variables.gradle` — jangan edit, ia dijana semula oleh `npx cap sync`) dan library dalam `node_modules` — tunggu patch Capacitor akan datang; ia tidak menghalang build.
- Amaran *"Configuration.setVisible(boolean) has been deprecated"* datang daripada dalam AGP 9.5.0 sendiri — bukan kod projek; Google akan membaikinya sebelum Gradle 11.
