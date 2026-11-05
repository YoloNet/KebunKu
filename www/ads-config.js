/* KebunKu — tetapan iklan. Fail ini diisi SEKALI oleh PEMILIK aplikasi.
   Pengguna akhir TIDAK perlu melihat atau mengisi apa-apa di sini.
   Iklan DIMATIKAN secara lalai (diaktifkan: false) — selagi suis itu
   false, aplikasi TIDAK memuat sebarang skrip iklan dan tiada ruang
   iklan yang muncul.
   ------------------------------------------------------------------
   DUA JALAN IKLAN (jangan campur aduk):
   - AdSense = untuk versi WEB sahaja. Polisi Google melarang iklan
     AdSense dipaparkan dalam WebView aplikasi — memaparkannya dalam
     APK boleh menyebabkan akaun AdSense disekat. Jadi diaktifkan
     AdSense hanya berkesan bila aplikasi dibuka di pelayar web.
   - AdMob = untuk APK Android. Ini produk yang betul untuk aplikasi.
     Perlukan App ID + unit banner daripada akaun AdMob, dan meta-data
     APPLICATION_ID dalam AndroidManifest.xml (lihat README).
   ------------------------------------------------------------------
   Medan yang perlu diisi (bila sudah ada akaun iklan):
   - adsense.publisherId: ID penerbit AdSense, nombor sahaja
     (contoh: "1234567890123456" — aplikasi akan tambah "ca-pub-" sendiri).
     Boleh juga diisi penuh "ca-pub-1234567890123456".
   - adsense.slotRingkasan / slotSejarah: ID unit iklan (nombor sahaja)
     untuk banner di bawah tab Ringkasan dan Sejarah.
   - admob.appId: App ID AdMob (contoh: "ca-app-pub-1234567890123456~1234567890").
   - admob.bannerRingkasan / bannerSejarah: ID unit banner AdMob
     (contoh: "ca-app-pub-1234567890123456/1234567890").
   - modPratonton: true = tunjuk kotak "Ruang Iklan — pratonton sahaja"
     di kedudukan slot sebenar, TANPA memuat sebarang iklan sebenar.
     Guna ini untuk melihat kedudukan iklan sebelum akaun iklan siap.
   Polisi kekerapan (dikuatkuasakan dalam kod, bukan sekadar janji):
   maksima 2 banner dalam seluruh aplikasi (Ringkasan + Sejarah),
   maksima 1 iklan kelihatan pada satu masa, minima 60 saat antara
   muatan iklan baharu, tiada interstitial / rewarded / popup,
   tiada iklan dalam borang Kerja, Hari Ini, onboarding atau log masuk. */
window.KEBUNKU_ADS = {
  diaktifkan: false,
  modPratonton: false,
  adsense: {
    publisherId: "",
    slotRingkasan: "",
    slotSejarah: ""
  },
  admob: {
    appId: "",
    bannerRingkasan: "",
    bannerSejarah: ""
  }
};
