"use strict";
/* KebunKu v3 — offline-first. Sync awan dilaksanakan melalui objek SB di
   bawah, terus dengan REST (Auth + PostgREST), tanpa CDN SDK, supaya aplikasi
   kekal berfungsi offline di dalam WebView. Tetapan sambungan dibaca
   daripada fail www/supabase-config.js (diisi pemilik) atau tetapan
   peranti yang disimpan sebelum ini — tiada medan tetapan dalam UI.
   Sesi daftar masuk disimpan dalam kunci localStorage yang berasingan dan
   TIDAK pernah dimasukkan dalam eksport data utama. Gambar tidak pernah
   dihantar ke awan.
   v3 (dari rekod Excel sebenar pengguna): zon, bahan berstruktur (jumlah+unit+per),
   pustaka bahan, peringkat blok, syarat kerja seterusnya + tukar bahan. */
var KEY = "kebunku_data_v3";
var OLD_KEY = "kebunku_data_v2";
var OLD_KEY_V1 = "kebunku_data_v1";
var JENIS_KERJA = ["Membaja", "Meracun Rumput", "Racun Kulat", "Racun Serangga", "Menuai", "Pruning", "Potong Rumput", "Menanam", "Menyiram", "Lain-lain"];
var TANAMAN_LIST = ["Koko", "Sawit", "Durian", "Lada", "Sayur", "Lada & Sayur", "Lain-lain"];
var PERINGKAT_LIST = ["Bibit / Anak", "Matang", "Berbuah", "Semua Peringkat"];
var ZON_LIST = ["Semua Zon", "Atas", "Bawah", "Tengah", "Atas & Tengah", "Tengah & Bawah", "Atas & Bawah"];
var DOS_UNIT_LIST = ["g", "kg", "ml", "L", "sudu", "karung", "pek", "botol"];
var DOS_PER_LIST = ["", "/pokok", "/sprayer", "/kawasan", "/liter air"];
var SYARAT_LIST = ["Tiada syarat", "Jika belum mula berbuah", "Jika masih ada simptom", "Jika masih ada rumput", "Jika hujan / cuaca tidak mengizinkan", "Lain-lain"];
function dosPerLabel(p) { return p ? p : "Tiada"; }
/* "Membersihkan" ialah nama lama untuk kerja ini — dipaparkan dan
   dinormalkan kepada "Potong Rumput" supaya rekod lama tidak hilang. */
function jenisLabel(j) {
  if (j === "Pruning") return "Pruning / Memangkas";
  if (j === "Potong Rumput" || j === "Membersihkan") return "Potong Rumput / Grasscutter";
  return j;
}

function $(id) { return document.getElementById(id); }
function uid() { return "id_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 100000).toString(36); }
function todayStr() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function addDays(dateStr, n) { var d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
/* Tambah bulan/tahun dengan betul: 31 Jan + 1 bulan = 28/29 Feb, bukan 3 Mac.
   Hari dikekang kepada hari terakhir bulan sasaran (termasuk tahun lompat). */
function addMonths(dateStr, n) {
  var p = dateStr.split("-"); var y = Number(p[0]), m = Number(p[1]) - 1, d = Number(p[2]);
  var total = m + n; var y2 = y + Math.floor(total / 12); var m2 = ((total % 12) + 12) % 12;
  var last = new Date(y2, m2 + 1, 0).getDate(); var d2 = Math.min(d, last);
  return y2 + "-" + String(m2 + 1).padStart(2, "0") + "-" + String(d2).padStart(2, "0");
}
function nextTarikhFrom(base, pilihan, custom) {
  if (!base) return "";
  if (pilihan === "1 Minggu") return addDays(base, 7);
  if (pilihan === "2 Minggu") return addDays(base, 14);
  if (pilihan === "3 Minggu") return addDays(base, 21);
  if (pilihan === "1 Bulan") return addMonths(base, 1);
  if (pilihan === "2 Bulan") return addMonths(base, 2);
  if (pilihan === "3 Bulan") return addMonths(base, 3);
  if (pilihan === "6 Bulan") return addMonths(base, 6);
  if (pilihan === "1 Tahun") return addMonths(base, 12);
  if (pilihan === "Tarikh Custom") return custom || "";
  return "";
}
function fmtDate(s) { if (!s) return "-"; var p = s.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
function fmtRM(n) { return "RM " + (Number(n) || 0).toFixed(2); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

/* Dos berstruktur: "200g/pokok" -> {jumlah:200, unit:"g", per:"/pokok"};
   "1 karung semua kawasan" -> {jumlah:1, unit:"karung", per:"/kawasan"};
   "500g sepokok" (data contoh lama) -> {jumlah:500, unit:"g", per:"/pokok"};
   "7sudu" -> {jumlah:7, unit:"sudu", per:""}. Tidak dapat dihuraikan -> kosong. */
function parseDos(str) {
  var r = { jumlah: "", unit: "", per: "" };
  if (!str) return r;
  var t = String(str).trim().toLowerCase().replace(/\s+/g, " ");
  var m = t.match(/^(\d+(?:[.,]\d+)?)\s*(karung|pek|botol|sudu|kg|g|ml|liter|l)\b\s*(.*)$/);
  if (!m) return r;
  var n = parseFloat(m[1].replace(",", "."));
  if (isNaN(n)) return r;
  r.jumlah = n;
  var u = m[2];
  r.unit = (u === "liter" || u === "l") ? "L" : u;
  var rest = m[3] || "";
  if (rest.indexOf("pokok") >= 0) r.per = "/pokok";
  else if (rest.indexOf("sprayer") >= 0) r.per = "/sprayer";
  else if (rest.indexOf("kawasan") >= 0) r.per = "/kawasan";
  else if (rest.indexOf("liter air") >= 0) r.per = "/liter air";
  return r;
}
function composeDos(k) {
  if (k.dosJumlah === "" || k.dosJumlah === null || k.dosJumlah === undefined) return k.dos || "";
  var s = String(k.dosJumlah) + (k.dosUnit || "");
  if (k.dosPer) s += k.dosPer;
  return s;
}
function dosPaparan(k) { var c = composeDos(k); return c || "-"; }

function tetapanLalai() { return { notifikasiHidup: true, backend: "belum disambung", mod: "", namaPaparan: "", namaDitanya: false }; }
/* mod: "" (belum pilih) | "tetamu" (guest, tempatan sahaja) | "akaun" (daftar masuk).
   namaPaparan: nama yang dipaparkan pada dashboard; namaDitanya: true bila
   prompt nama sudah ditunjuk / dilangkau / disimpan, supaya tidak mengganggu
   setiap kali aplikasi dibuka. */
function normalKerja(k) {
  var r = Object.assign({ nextTarikh: "", nextPilihan: "", image: null, updatedAt: 0, contoh: false,
    zon: "Semua Zon", bahanId: "", dosJumlah: "", dosUnit: "", dosPer: "",
    nextSyarat: "Tiada syarat", nextSyaratLain: "", nextTukarBahan: false, nextBahan: "" }, k || {});
  if (!r.nextTarikh) r.nextTarikh = "";
  if (r.jenis === "Membersihkan") r.jenis = "Potong Rumput";
  if (!r.zon) r.zon = "Semua Zon";
  if (!r.nextSyarat) r.nextSyarat = "Tiada syarat";
  /* Migrasi v2 -> v3: huraikan dos teks lama ("200g/pokok") kepada bahagian
     berstruktur; jika tidak dapat dihuraikan, teks asal dikekalkan. */
  if ((r.dosJumlah === "" || r.dosJumlah === null || r.dosJumlah === undefined) && r.dos) {
    var p = parseDos(r.dos);
    if (p.jumlah !== "") { r.dosJumlah = p.jumlah; r.dosUnit = p.unit; r.dosPer = p.per; }
  }
  if (r.dosJumlah !== "" && r.dosJumlah !== null && r.dosJumlah !== undefined) r.dos = composeDos(r);
  return r;
}
function normalBlok(b) {
  var r = Object.assign({ peringkat: "Semua Peringkat", tanamanLain: "", contoh: false, updatedAt: 0 }, b || {});
  if (!r.peringkat) r.peringkat = "Semua Peringkat";
  return r;
}
function normalBahan(b) {
  var r = Object.assign({ nama: "", jenisKerja: "", unitLalai: "", dosLalai: "", nota: "", contoh: false, updatedAt: 0 }, b || {});
  return r;
}
/* v3.6: tiada lagi pustaka bahan lalai — pengguna baharu mula dengan
   pustaka kosong dan tambah bahan sendiri. Data sedia ada (termasuk
   bahan pengguna lama) tidak disentuh oleh migrasi. */
function emptyData() { return { version: 3, kebuns: [], bloks: [], kerjas: [], bahans: [], settings: tetapanLalai() }; }
function normalData(d) {
  var r = { version: 3, kebuns: [], bloks: [], kerjas: [], bahans: [], settings: tetapanLalai() };
  if (!d) return r;
  if (Array.isArray(d.kebuns)) r.kebuns = d.kebuns;
  if (Array.isArray(d.bloks)) r.bloks = d.bloks.map(normalBlok);
  if (Array.isArray(d.kerjas)) r.kerjas = d.kerjas.map(normalKerja);
  /* Data lama (v1/v2) tiada bahans: mula dengan pustaka kosong (v3.6).
     Jika pengguna sudah ada pustaka (walaupun kosong kerana dipadam
     semua), hormati pilihannya. */
  if (Array.isArray(d.bahans)) r.bahans = d.bahans.map(normalBahan);
  else r.bahans = [];
  if (d.settings && typeof d.settings === "object") {
    if (typeof d.settings.notifikasiHidup === "boolean") r.settings.notifikasiHidup = d.settings.notifikasiHidup;
    if (typeof d.settings.backend === "string" && d.settings.backend) r.settings.backend = d.settings.backend;
    if (typeof d.settings.mod === "string") r.settings.mod = d.settings.mod;
    if (typeof d.settings.namaPaparan === "string") r.settings.namaPaparan = d.settings.namaPaparan;
    if (typeof d.settings.namaDitanya === "boolean") r.settings.namaDitanya = d.settings.namaDitanya;
  }
  return r;
}
/* ===== SYNC ADAPTER (persediaan awan — belum disambung ke mana-mana backend) =====
   toCloudPayload() membuang gambar dengan sengaja: gambar kekal tempatan sahaja
   sehingga ada hosting gambar pada masa depan. fromCloudPayload() menggabung ikut
   id, last-updated-wins (updatedAt lebih besar menang). */
var Sync = {
  toCloudPayload: function (d) {
    var x = normalData(d);
    return {
      version: 3,
      kebuns: x.kebuns, bloks: x.bloks, bahans: x.bahans,
      kerjas: x.kerjas.map(function (k) {
        var c = Object.assign({}, k); c.image = null; return c;
      }),
      settings: { notifikasiHidup: x.settings.notifikasiHidup, backend: x.settings.backend, namaPaparan: x.settings.namaPaparan || "" }
      /* mod TIDAK di-sync — mod tetamu/akaun ialah keadaan peranti ini sahaja. */
    };
  },
  fromCloudPayload: function (payload, tempatan) {
    var awan = normalData(payload); var t = normalData(tempatan);
    function gabung(a, b) {
      var m = {}; a.forEach(function (x) { m[x.id] = x; });
      b.forEach(function (x) { if (!m[x.id] || (Number(x.updatedAt) || 0) >= (Number(m[x.id].updatedAt) || 0)) m[x.id] = x; });
      return Object.keys(m).map(function (k) { return m[k]; });
    }
    var hasil = { version: 3, kebuns: gabung(t.kebuns, awan.kebuns), bloks: gabung(t.bloks, awan.bloks),
      bahans: gabung(t.bahans, awan.bahans).map(normalBahan),
      kerjas: gabung(t.kerjas, awan.kerjas).map(normalKerja), settings: t.settings };
    if (awan.settings && awan.settings.backend && awan.settings.backend !== "belum disambung") hasil.settings.backend = awan.settings.backend;
    return hasil;
  }
};

/* ===== SUPABASE (SB) — Auth + PostgREST melalui fetch, tanpa CDN SDK =====
   Kunci berasingan (bukan dalam eksport data utama):
     kebunku_supabase_config_v1 — { url, anon } (URL + anon key sahaja)
     kebunku_supabase_session_v1 — { access_token, refresh_token, user_id,
       email, expires_at } (expires_at dalam milisaat epoch)
     kebunku_supabase_sync_v1 — { lastSyncAt, autoSync,
       deleted: { kebuns: [{id, at}], bloks: [...], kerjas: [...] } }
   Pemetaan medan (tempatan camelCase -> lajur snake_case Supabase):
     kebuns: id, nama, contoh
     bloks:  id, kebunId->kebun_id, nama, tanaman, tanamanLain->tanaman_lain, contoh
     kerjas: id, kebunId->kebun_id, blokId->blok_id, jenis, jenisLain->jenis_lain,
             tarikhRancang->tarikh_rancang, tarikhSiap->tarikh_siap, status,
             peratus, bahan, dos, kos, nota, nextTarikh->next_tarikh, contoh
     Medan tempatan sahaja (tidak dihantar): image, nextPilihan, updatedAt
     (updatedAt ditukar kepada updated_at ISO), dan settings.
   Tarikh kosong "" ditukar kepada null untuk lajur date, kerana PostgREST
   menolak rentetan kosong untuk date. */
var SB_CFG_KEY = "kebunku_supabase_config_v1";
var SB_SES_KEY = "kebunku_supabase_session_v1";
var SB_SYNC_KEY = "kebunku_supabase_sync_v1";
var SB = {
  _baca: function (kunci, lalai) {
    try { var v = localStorage.getItem(kunci); return v ? JSON.parse(v) : lalai; } catch (e) { return lalai; }
  },
  _tulis: function (kunci, nilai) { try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch (e) {} },
  /* Tetapan sambungan — keutamaan: fail www/supabase-config.js yang diisi
     oleh pemilik (window.KEBUNKU_SUPABASE), kemudian tetapan yang pernah
     disimpan dalam peranti ini (kebunku_supabase_config_v1). Pengguna
     akhir tidak pernah melihat atau mengisi tetapan ini. */
  cfg: function () {
    var kapal = (typeof window !== "undefined" && window.KEBUNKU_SUPABASE) || {};
    var urlKapal = (kapal.url || "").trim(), anonKapal = (kapal.anon || "").trim();
    if (urlKapal && anonKapal) return { url: urlKapal.replace(/\/+$/, ""), anon: anonKapal };
    var c = this._baca(SB_CFG_KEY, {});
    return { url: (c.url || "").replace(/\/+$/, ""), anon: c.anon || "" };
  },
  sesi: function () { return this._baca(SB_SES_KEY, null); },
  simpanSesi: function (s) { this._tulis(SB_SES_KEY, s); },
  clearSesi: function () { try { localStorage.removeItem(SB_SES_KEY); } catch (e) {} },
  syncState: function () {
    var s = this._baca(SB_SYNC_KEY, null);
    if (!s || typeof s !== "object") return { lastSyncAt: 0, autoSync: true, deleted: { kebuns: [], bloks: [], kerjas: [], bahans: [] } };
    if (!s.deleted || typeof s.deleted !== "object") s.deleted = { kebuns: [], bloks: [], kerjas: [], bahans: [] };
    ["kebuns", "bloks", "kerjas", "bahans"].forEach(function (t) { if (!Array.isArray(s.deleted[t])) s.deleted[t] = []; });
    if (typeof s.autoSync !== "boolean") s.autoSync = true;
    if (!s.lastSyncAt) s.lastSyncAt = 0;
    return s;
  },
  simpanSyncState: function (s) { this._tulis(SB_SYNC_KEY, s); },
  catatPadam: function (jenis, ids) {
    if (!ids || !ids.length) return;
    var s = this.syncState();
    ids.forEach(function (id) {
      if (!id) return;
      var ada = s.deleted[jenis].some(function (x) { return x.id === id; });
      if (!ada) s.deleted[jenis].push({ id: id, at: Date.now() });
    });
    this.simpanSyncState(s);
  },
  tarikhKeNull: function (s) { return s ? s : null; },
  updatedAtISO: function (rec) {
    var ms = Number(rec && rec.updatedAt) || 0;
    return new Date(ms > 0 ? ms : Date.now()).toISOString();
  },
  keKebunRemote: function (k, uid) {
    return { id: k.id, user_id: uid, nama: k.nama || "", contoh: !!k.contoh,
      updated_at: this.updatedAtISO(k), deleted_at: null };
  },
  keBlokRemote: function (b, uid) {
    return { id: b.id, user_id: uid, kebun_id: b.kebunId || "", nama: b.nama || "",
      tanaman: b.tanaman || "", tanaman_lain: b.tanamanLain || "", peringkat: b.peringkat || "Semua Peringkat",
      contoh: !!b.contoh, updated_at: this.updatedAtISO(b), deleted_at: null };
  },
  keBahanRemote: function (b, uid) {
    return { id: b.id, user_id: uid, nama: b.nama || "", jenis_kerja: b.jenisKerja || "",
      unit_lalai: b.unitLalai || "", dos_lalai: b.dosLalai || "", contoh: !!b.contoh,
      updated_at: this.updatedAtISO(b), deleted_at: null };
  },
  keKerjaRemote: function (k, uid) {
    /* Sengaja tiada image di sini — gambar kekal tempatan sahaja. */
    return { id: k.id, user_id: uid, kebun_id: k.kebunId || "", blok_id: k.blokId || "",
      jenis: k.jenis || "", jenis_lain: k.jenisLain || "",
      tarikh_rancang: this.tarikhKeNull(k.tarikhRancang),
      tarikh_siap: this.tarikhKeNull(k.tarikhSiap),
      status: k.status || "Dirancang", peratus: Number(k.peratus) || 0,
      bahan: k.bahan || "", dos: k.dos || "", kos: Number(k.kos) || 0,
      nota: k.nota || "", next_tarikh: this.tarikhKeNull(k.nextTarikh),
      zon: k.zon || "Semua Zon",
      dos_jumlah: (k.dosJumlah === "" || k.dosJumlah === null || k.dosJumlah === undefined) ? null : Number(k.dosJumlah),
      dos_unit: k.dosUnit || "", dos_per: k.dosPer || "",
      next_syarat: k.nextSyarat || "Tiada syarat",
      next_tukar_bahan: !!k.nextTukarBahan, next_bahan: k.nextBahan || "",
      contoh: !!k.contoh, updated_at: this.updatedAtISO(k), deleted_at: null };
  },
  dariKebunRemote: function (r) {
    return { id: r.id, nama: r.nama || "", contoh: !!r.contoh, updatedAt: Date.parse(r.updated_at) || 0 };
  },
  dariBlokRemote: function (r) {
    return { id: r.id, kebunId: r.kebun_id || "", nama: r.nama || "", tanaman: r.tanaman || "",
      tanamanLain: r.tanaman_lain || "", peringkat: r.peringkat || "Semua Peringkat",
      contoh: !!r.contoh, updatedAt: Date.parse(r.updated_at) || 0 };
  },
  dariBahanRemote: function (r) {
    return { id: r.id, nama: r.nama || "", jenisKerja: r.jenis_kerja || "",
      unitLalai: r.unit_lalai || "", dosLalai: r.dos_lalai || "", nota: "",
      contoh: !!r.contoh, updatedAt: Date.parse(r.updated_at) || 0 };
  },
  dariKerjaRemote: function (r, gambarTempatan) {
    return { id: r.id, kebunId: r.kebun_id || "", blokId: r.blok_id || "", jenis: r.jenis || "",
      jenisLain: r.jenis_lain || "", tarikhRancang: r.tarikh_rancang || "", tarikhSiap: r.tarikh_siap || "",
      status: r.status || "Dirancang", peratus: Number(r.peratus) || 0, bahan: r.bahan || "",
      dos: r.dos || "", kos: Number(r.kos) || 0, nota: r.nota || "",
      nextTarikh: r.next_tarikh || "", nextPilihan: "", image: gambarTempatan || null,
      zon: r.zon || "Semua Zon",
      dosJumlah: (r.dos_jumlah === null || r.dos_jumlah === undefined) ? "" : Number(r.dos_jumlah),
      dosUnit: r.dos_unit || "", dosPer: r.dos_per || "",
      nextSyarat: r.next_syarat || "Tiada syarat", nextSyaratLain: "",
      nextTukarBahan: !!r.next_tukar_bahan, nextBahan: r.next_bahan || "",
      contoh: !!r.contoh, updatedAt: Date.parse(r.updated_at) || 0 };
  },
  ralat: function (j, lalai) {
    if (j && typeof j === "object") return j.msg || j.error_description || j.message || j.error || lalai;
    return lalai;
  },
  /* Tiada lagi medan tetapan dalam UI — tetapan dibaca daripada fail
     config pemilik atau tetapan peranti yang disimpan sebelum ini. */
  bacaCfgDariBorang: function () { return this.cfg(); },
  sahkanCfg: function (cfg) {
    if (!cfg.url || cfg.url.indexOf("https://") !== 0 || !cfg.anon) throw new Error("Aplikasi ini belum dikonfigurasi oleh pemilik. Sila hubungi pemilik aplikasi.");
    return cfg;
  },
  /* Panggilan Auth generik (REST, tanpa SDK): kaedah POST/PUT/GET, dengan
     token Bearer pilihan. Token/kod tidak pernah dilog atau dipaparkan. */
  panggilAuth: function (cfg, kaedah, laluan, badan, token) {
    var headers = { "apikey": cfg.anon, "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(cfg.url + laluan, {
      method: kaedah, headers: headers,
      body: badan ? JSON.stringify(badan) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) throw new Error(SB.ralat(j, "Gagal daftar masuk / daftar (kod " + res.status + "). Semak email dan kata laluan, kemudian cuba lagi."));
        return j;
      });
    });
  },
  authPanggil: function (cfg, laluan, badan) {
    return this.panggilAuth(cfg, "POST", laluan, badan, null);
  },
  /* Bina objek sesi daripada jawapan Supabase yang mengandungi session.
     kaedah: "email" | "otp" | "google" (sesi lama tanpa medan ini = "email"). */
  simpanSesiDariToken: function (j, email, kaedah) {
    var ses = j.session || j;
    if (!ses || !ses.access_token) throw new Error("Daftar masuk tidak mengembalikan sesi. Sila cuba lagi.");
    var pengguna = j.user || ses.user || {};
    this.simpanSesi({ access_token: ses.access_token, refresh_token: ses.refresh_token || "",
      user_id: pengguna.id || "", email: email || pengguna.email || "",
      expires_at: Date.now() + ((Number(ses.expires_in) || 3600) * 1000),
      kaedah: kaedah || "email" });
    return true;
  },
  /* ===== OTP (kod pengesahan email) — anti-spam pendaftaran =====
     Hanya pemilik email yang memegang kod 6 digit boleh siapkan pendaftaran
     atau daftar masuk dengan kod. Supabase sendiri menghadkan kadar permintaan
     OTP; aplikasi menambah cooldown hantar-semula 60 saat (lihat
     mulaCooldownOtp). Kod tidak pernah disimpan dalam localStorage. */
  hantarOtp: function (email, createUser) {
    var cfg = this.sahkanCfg(this.bacaCfgDariBorang());
    if (!email || email.indexOf("@") < 1) throw new Error("Isi email yang sah dahulu.");
    return this.authPanggil(cfg, "/auth/v1/otp", { email: email, create_user: !!createUser });
  },
  sahkanOtp: function (email, kod, jenis) {
    var cfg = this.sahkanCfg(this.bacaCfgDariBorang());
    if (!/^\d{6}$/.test(kod || "")) throw new Error("Kod pengesahan mesti 6 digit nombor.");
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/verify", { email: email, token: kod, type: jenis })
      .catch(function (e) { throw new Error(SB.ralatOtp(e)); })
      .then(function (j) { self.simpanSesiDariToken(j, email, "otp"); return j; });
  },
  /* Tetapkan kata laluan selepas daftar OTP, supaya akaun itu juga boleh
     daftar masuk dengan email + kata laluan kemudian. Gagal di sini tidak
     membatalkan pendaftaran — pengguna masih daftar masuk melalui kod. */
  tetapKataLaluan: function (token, kata) {
    var cfg = this.cfg();
    return this.panggilAuth(cfg, "PUT", "/auth/v1/user", { password: kata }, token);
  },
  ralatOtp: function (e) {
    var m = String((e && e.message) || e || "");
    if (/expired|invalid/i.test(m) && /token|kod/i.test(m)) return "Kod salah atau sudah tamat tempoh. Tekan Hantar Semula Kod untuk kod baharu.";
    if (/Token has expired|invalid/i.test(m)) return "Kod salah atau sudah tamat tempoh. Tekan Hantar Semula Kod untuk kod baharu.";
    if (/rate limit|too many/i.test(m)) return "Terlalu banyak permintaan kod. Tunggu sebentar (lebih kurang 1 minit) kemudian cuba lagi.";
    if (/already registered|already exists/i.test(m)) return "Email ini sudah berdaftar. Guna Daftar Masuk atau Daftar Masuk dengan Kod.";
    if (/not found|user not found/i.test(m)) return "Email ini belum berdaftar. Daftar dahulu dengan kod pengesahan.";
    if (/email.*not confirmed|not confirmed/i.test(m)) return "Email belum disahkan. Minta kod baharu dan sahkan dahulu.";
    return m || "Kod tidak dapat disahkan. Semak kod dan cuba lagi.";
  },
  /* Cooldown hantar-semula: butang dikunci 60 saat dengan kira detik,
     untuk mengelakkan spam permintaan OTP. */
  _otpTimer: null,
  mulaCooldownOtp: function (btn) {
    if (!btn) return;
    var self = this;
    if (this._otpTimer) { try { clearInterval(this._otpTimer); } catch (e) {} }
    var baki = 60;
    btn.disabled = true;
    btn.textContent = "Hantar semula (" + baki + "s)";
    this._otpTimer = setInterval(function () {
      baki--;
      if (baki <= 0) {
        clearInterval(self._otpTimer); self._otpTimer = null;
        btn.disabled = false; btn.textContent = "Hantar Semula Kod";
      } else {
        btn.textContent = "Hantar semula (" + baki + "s)";
      }
    }, 1000);
  },
  /* Terima token daripada mana-mana URL yang membawa access_token — deep link
     APK (com.kebunku.app://login-callback#access_token=...) atau hash web.
     Boleh diuji tanpa Capacitor: beri URL sebagai rentetan. Mengembalikan
     Promise { ok:true, email, metadata } | { ralat } | null (tiada token). */
  terimaTokenDariUrl: function (urlString) {
    var self = this;
    var token = "", refresh = "", tamat = 3600;
    try {
      var u = new URL(urlString);
      var h = new URLSearchParams((u.hash || "").replace(/^#/, ""));
      var q = u.searchParams;
      token = h.get("access_token") || q.get("access_token") || "";
      refresh = h.get("refresh_token") || q.get("refresh_token") || "";
      tamat = Number(h.get("expires_in") || q.get("expires_in")) || 3600;
      var ralat = h.get("error") || q.get("error");
      if (ralat) return Promise.resolve({ ralat: /access_denied/i.test(ralat) ? "Daftar masuk Google dibatalkan." : "Daftar masuk Google gagal: " + ralat });
    } catch (e) { return Promise.resolve({ ralat: "Pautan daftar masuk tidak sah." }); }
    if (!token) return Promise.resolve(null);
    var cfg;
    try { cfg = this.sahkanCfg(this.cfg()); } catch (e2) { return Promise.resolve({ ralat: "Sesi Google diterima, tetapi aplikasi ini belum dikonfigurasi oleh pemilik. Sila hubungi pemilik aplikasi." }); }
    return this.panggilAuth(cfg, "GET", "/auth/v1/user", null, token).then(function (pengguna) {
      var email = (pengguna && pengguna.email) || "";
      var uid = (pengguna && pengguna.id) || "";
      self.simpanSesi({ access_token: token, refresh_token: refresh, user_id: uid, email: email,
        expires_at: Date.now() + (tamat * 1000), kaedah: "google" });
      return { ok: true, email: email, metadata: (pengguna && pengguna.user_metadata) || {} };
    }).catch(function (e) {
      return { ralat: "Sesi Google diterima tetapi tidak dapat disahkan: " + (e.message || e) };
    });
  },
  /* ===== Google login (OAuth) — web + APK Android =====
     Web: redirect penuh ke authorize, token dibaca daripada hash semasa
     kembali (kendaliOAuthCallback). APK (Capacitor): buka authorize dalam
     pelayar sistem melalui plugin Browser, dan tangkap redirect deep link
     com.kebunku.app://login-callback melalui plugin App (appUrlOpen) —
     WebView sendiri tidak boleh menerima redirect itu. Tiada client secret
     dalam aplikasi — secret itu hanya dalam dashboard Supabase.
     Pemilik MESTI tambah com.kebunku.app://login-callback ke Supabase
     Authentication > URL Configuration > Redirect URLs (lihat README). */
  googleLogin: function () {
    var cfg = this.sahkanCfg(this.bacaCfgDariBorang());
    var balik = (location.protocol === "file:")
      ? location.href.split("#")[0].split("?")[0]
      : location.origin + location.pathname;
    var cap = (typeof window !== "undefined" && window.Capacitor) || null;
    var plugins = cap && cap.Plugins ? cap.Plugins : {};
    var Browser = plugins.Browser, App = plugins.App;
    if (cap && Browser && Browser.open && App && App.addListener) {
      var redirect = "com.kebunku.app://login-callback";
      var url = cfg.url + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(redirect);
      var self = this;
      var selesai = false;
      var tutup = function () { try { if (Browser.close) Browser.close(); } catch (e) {} };
      var pendengar = App.addListener("appUrlOpen", function (d) {
        if (selesai || !d || !d.url) return;
        if (d.url.indexOf("com.kebunku.app://login-callback") !== 0) return;
        selesai = true;
        try { if (pendengar && pendengar.remove) pendengar.remove(); } catch (e2) {}
        tutup();
        self.terimaTokenDariUrl(d.url).then(function (hasil) {
          if (typeof selepasGoogleDeepLink === "function") selepasGoogleDeepLink(hasil);
        });
      });
      Browser.open({ url: url }).catch(function () {
        try { if (pendengar && pendengar.remove) pendengar.remove(); } catch (e3) {}
        location.href = url;
      });
      return;
    }
    location.href = cfg.url + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(balik);
  },
  /* Baca profil pengguna semasa (untuk nama paparan daripada user_metadata).
     Kegagalan mengembalikan null — ia tidak membatalkan daftar masuk. */
  ambilProfil: function () {
    var cfg = this.cfg();
    var self = this;
    return this.tokenSah().then(function (token) {
      return self.panggilAuth(cfg, "GET", "/auth/v1/user", null, token);
    }).catch(function () { return null; });
  },
  /* Simpan nama paparan ke akaun (PUT /auth/v1/user { data: { nama_paparan } }).
     Best effort — kegagalan tidak menghalang simpanan tempatan. */
  simpanNamaKeAkaun: function (nama) {
    var cfg = this.cfg();
    var self = this;
    return this.tokenSah().then(function (token) {
      return self.panggilAuth(cfg, "PUT", "/auth/v1/user", { data: { nama_paparan: nama } }, token);
    });
  },
  kendaliOAuthCallback: function () {
    var hash = (location.hash || "").replace(/^#/, "");
    var carian = new URLSearchParams(location.search || "");
    var h = new URLSearchParams(hash);
    var ralat = h.get("error") || carian.get("error");
    var ralatDes = h.get("error_description") || carian.get("error_description") || "";
    if (ralat) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      var msg = /access_denied/i.test(ralat) ? "Daftar masuk Google dibatalkan."
        : (/provider (is )?not enabled|provider_disabled/i.test(ralat + " " + ralatDes) ? "Daftar masuk Google belum dihidupkan untuk aplikasi ini. Sila hubungi pemilik aplikasi."
        : "Daftar masuk Google gagal: " + (decodeURIComponent(ralatDes.replace(/\+/g, " ")) || ralat));
      return Promise.resolve({ ralat: msg });
    }
    var token = h.get("access_token");
    if (!token) return Promise.resolve(null);
    /* Token dalam hash web — sahkan melalui laluan yang sama seperti deep link APK. */
    return this.terimaTokenDariUrl(location.href).then(function (hasil) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e2) {}
      return hasil;
    });
  },
  daftar: function () {
    var cfg = this.sahkanCfg(this.bacaCfgDariBorang());
    var email = $("sbEmail") ? $("sbEmail").value.trim() : "";
    var kata = $("sbPassword") ? $("sbPassword").value : "";
    if (!email || !kata) throw new Error("Isi email dan kata laluan dahulu.");
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/signup", { email: email, password: kata }).then(function (j) {
      if (j.session && j.session.access_token) {
        self.simpanSesi({ access_token: j.session.access_token, refresh_token: j.session.refresh_token || "",
          user_id: (j.user && j.user.id) || (j.session.user && j.session.user.id) || "",
          email: email, expires_at: Date.now() + ((Number(j.session.expires_in) || 3600) * 1000),
          kaedah: "email" });
        return { perluSahkan: false };
      }
      return { perluSahkan: true };
    });
  },
  logMasuk: function () {
    var cfg = this.sahkanCfg(this.bacaCfgDariBorang());
    var email = $("sbEmail") ? $("sbEmail").value.trim() : "";
    var kata = $("sbPassword") ? $("sbPassword").value : "";
    if (!email || !kata) throw new Error("Isi email dan kata laluan dahulu.");
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/token?grant_type=password", { email: email, password: kata }).then(function (j) {
      if (!j.access_token) throw new Error("Daftar masuk gagal. Semak email dan kata laluan, dan pastikan email sudah disahkan jika pengesahan email diperlukan.");
      self.simpanSesi({ access_token: j.access_token, refresh_token: j.refresh_token || "",
        user_id: (j.user && j.user.id) || "", email: email,
        expires_at: Date.now() + ((Number(j.expires_in) || 3600) * 1000),
        kaedah: "email" });
      return true;
    });
  },
  segarToken: function () {
    var cfg = this.cfg(); var s = this.sesi();
    if (!cfg.url || !cfg.anon || !s || !s.refresh_token) return Promise.reject(new Error("Sesi tamat. Sila daftar masuk semula."));
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/token?grant_type=refresh_token", { refresh_token: s.refresh_token }).then(function (j) {
      if (!j.access_token) throw new Error("Sesi tamat. Sila daftar masuk semula.");
      self.simpanSesi({ access_token: j.access_token, refresh_token: j.refresh_token || s.refresh_token,
        user_id: (j.user && j.user.id) || s.user_id, email: s.email,
        expires_at: Date.now() + ((Number(j.expires_in) || 3600) * 1000),
        kaedah: s.kaedah || "email" });
      return j.access_token;
    });
  },
  tokenSah: function () {
    var s = this.sesi();
    if (!s || !s.access_token) return Promise.reject(new Error("Anda belum daftar masuk. Sila daftar masuk dahulu."));
    if (s.expires_at && s.expires_at > Date.now() + 60000) return Promise.resolve(s.access_token);
    return this.segarToken();
  },
  logKeluar: function () {
    var cfg = this.cfg(); var s = this.sesi();
    var p = Promise.resolve();
    if (cfg.url && cfg.anon && s && s.access_token) {
      p = fetch(cfg.url + "/auth/v1/logout", {
        method: "POST",
        headers: { "apikey": cfg.anon, "Authorization": "Bearer " + s.access_token, "Content-Type": "application/json" },
        body: "{}"
      }).catch(function () {}).then(function () {});
    }
    var self = this;
    return p.then(function () { self.clearSesi(); });
  },
  rest: function (token, jadual, kaedah, query, badan, prefer) {
    var cfg = this.cfg();
    var headers = { "apikey": cfg.anon, "Authorization": "Bearer " + token, "Content-Type": "application/json" };
    if (prefer) headers["Prefer"] = prefer;
    return fetch(cfg.url + "/rest/v1/" + jadual + (query || ""), {
      method: kaedah, headers: headers, body: badan ? JSON.stringify(badan) : undefined
    }).then(function (res) {
      return res.text().then(function (teks) {
        var j = null; try { j = teks ? JSON.parse(teks) : null; } catch (e) { j = null; }
        if (!res.ok) throw new Error(SB.ralat(j, "Sync gagal (kod " + res.status + "). Sila daftar masuk semula dan cuba lagi. Jika masalah berterusan, hubungi pemilik aplikasi."));
        return j;
      });
    });
  },
  ambilSemua: function (token, uid, jadual) {
    return this.rest(token, jadual, "GET", "?select=*&user_id=eq." + encodeURIComponent(uid) + "&order=updated_at.asc");
  },
  syncSedangBerjalan: false,
  _autoTimer: null,
  jadualAutoSync: function () {
    if (this.syncSedangBerjalan) return;
    if (this._lastSyncComplete && (Date.now() - this._lastSyncComplete < 5000)) return;
    var st = this.syncState();
    if (!st.autoSync) return;
    /* v3.5 Mod Tetamu: data tetamu tidak pernah dihantar ke awan. */
    try { if (typeof data !== "undefined" && data && data.settings && data.settings.mod === "tetamu") return; } catch (e) {}
    if (!this.sesi() || !this.cfg().url) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    var self = this;
    if (this._autoTimer) clearTimeout(this._autoTimer);
    this._autoTimer = setTimeout(function () {
      self.syncPenuh(true).catch(function (e) {
        try { var el = $("sbStatus"); if (el) el.textContent = "Sync automatik gagal: " + (e.message || e) + " — cuba Sync Sekarang bila ada internet."; } catch (e2) {}
      });
    }, 1500);
  },
  syncPenuh: function (auto) {
    var self = this;
    var cfg;
    try { cfg = this.sahkanCfg(this.cfg()); } catch (e) { return Promise.reject(e); }
    /* v3.5 Mod Tetamu: tolak sync terus — data tetamu kekal tempatan sahaja. */
    try { if (typeof data !== "undefined" && data && data.settings && data.settings.mod === "tetamu") return Promise.reject(new Error("Mod Tetamu — data hanya dalam peranti ini. Daftar masuk untuk backup data anda ke cloud.")); } catch (e2) {}
    if (this.syncSedangBerjalan) return Promise.reject(new Error("Sync sedang berjalan. Sila tunggu."));
    this.syncSedangBerjalan = true;
    var state = this.syncState();
    var sesi = this.sesi();
    if (!sesi) { this.syncSedangBerjalan = false; return Promise.reject(new Error("Anda belum daftar masuk.")); }
    var uid = sesi.user_id;
    if (!uid) { this.syncSedangBerjalan = false; return Promise.reject(new Error("Sesi daftar masuk tidak lengkap (tiada user_id). Sila keluar dan daftar masuk semula.")); }
    return this.tokenSah().then(function (token) {
      /* Langkah 1 — tarik keadaan awan dahulu (aktif + dipadam), supaya
         keputusan last-updated-wins boleh dibuat sebelum apa-apa dihantar. */
      return Promise.all([
        self.ambilSemua(token, uid, "kebuns"),
        self.ambilSemua(token, uid, "bloks"),
        self.ambilSemua(token, uid, "kerjas"),
        self.ambilSemua(token, uid, "bahans")
      ]).then(function (res) {
        var jauh = { kebuns: res[0] || [], bloks: res[1] || [], kerjas: res[2] || [], bahans: res[3] || [] };
        var terima = 0;
        function gambarLama(id) { var l = data.kerjas.find(function (x) { return x.id === id; }); return l ? (l.image || null) : null; }
        /* Padam jarak jauh yang lebih baharu daripada salinan tempatan. */
        ["kebuns", "bloks", "kerjas", "bahans"].forEach(function (jenis) {
          jauh[jenis].forEach(function (r) {
            if (!r.deleted_at) return;
            var senarai = data[jenis];
            var tempatan = senarai.find(function (x) { return x.id === r.id; });
            if (!tempatan) return;
            var jauhMs = Date.parse(r.deleted_at) || 0;
            var tempatanMs = Number(tempatan.updatedAt) || 0;
            if (jauhMs >= tempatanMs) {
              data[jenis] = senarai.filter(function (x) { return x.id !== r.id; });
              terima++;
            }
            /* Jika tempatan lebih baharu, ia akan dihantar semula di bawah
               dengan deleted_at null, jadi padam jarak jauh itu dibatalkan. */
          });
        });
        /* Gabung baris aktif jarak jauh: jauh lebih baharu menang, gambar
           tempatan dikekalkan kerana gambar tidak pernah dihantar. */
        var gabung = function (jenis, dariRemote) {
          jauh[jenis].forEach(function (r) {
            if (r.deleted_at) return;
            var tempatan = data[jenis].find(function (x) { return x.id === r.id; });
            var jauhMs = Date.parse(r.updated_at) || 0;
            if (!tempatan) { data[jenis].push(dariRemote(r)); terima++; }
            else if (jauhMs > (Number(tempatan.updatedAt) || 0)) {
              var ganti = dariRemote(r);
              if (jenis === "kerjas" && tempatan.image) ganti.image = tempatan.image;
              Object.assign(tempatan, ganti); terima++;
            }
          });
        };
        gabung("kebuns", function (r) { return self.dariKebunRemote(r); });
        gabung("bloks", function (r) { return self.dariBlokRemote(r); });
        gabung("kerjas", function (r) { return self.dariKerjaRemote(r, gambarLama(r.id)); });
        gabung("bahans", function (r) { return self.dariBahanRemote(r); });
        /* Langkah 2 — hantar padam tempatan sebagai tombstone. */
        var hantarPadam = [];
        ["kebuns", "bloks", "kerjas", "bahans"].forEach(function (jenis) {
          state.deleted[jenis].forEach(function (e) {
            hantarPadam.push(self.rest(token, jenis, "PATCH", "?id=eq." + encodeURIComponent(e.id),
              { deleted_at: new Date(e.at || Date.now()).toISOString() }, "return=minimal"));
          });
        });
        return Promise.all(hantarPadam).then(function () {
          /* Langkah 3 — upsert semua baris tempatan yang aktif (tanpa gambar),
             dengan deleted_at null supaya padam lama yang sudah dibatalkan
             oleh suntingan tempatan yang lebih baharu tidak kekal. */
          var upserts = [];
          if (data.kebuns.length) upserts.push(self.rest(token, "kebuns", "POST", "?on_conflict=id",
            data.kebuns.map(function (k) { return self.keKebunRemote(k, uid); }), "resolution=merge-duplicates,return=minimal"));
          if (data.bloks.length) upserts.push(self.rest(token, "bloks", "POST", "?on_conflict=id",
            data.bloks.map(function (b) { return self.keBlokRemote(b, uid); }), "resolution=merge-duplicates,return=minimal"));
          if (data.kerjas.length) upserts.push(self.rest(token, "kerjas", "POST", "?on_conflict=id",
            data.kerjas.map(function (k) { return self.keKerjaRemote(k, uid); }), "resolution=merge-duplicates,return=minimal"));
          if (data.bahans.length) upserts.push(self.rest(token, "bahans", "POST", "?on_conflict=id",
            data.bahans.map(function (b) { return self.keBahanRemote(b, uid); }), "resolution=merge-duplicates,return=minimal"));
          var dihantar = data.kebuns.length + data.bloks.length + data.kerjas.length + data.bahans.length + hantarPadam.length;
          return Promise.all(upserts).then(function () {
            /* Berjaya sahaja barulah senarai padam dibersihkan. */
            state.deleted = { kebuns: [], bloks: [], kerjas: [], bahans: [] };
            state.lastSyncAt = Date.now();
            self.simpanSyncState(state);
            data.settings = data.settings || tetapanLalai();
            data.settings.backend = "Supabase";
            /* Simpan hasil gabungan ke peranti — penting untuk sync automatik,
               yang tidak mempunyai pemanggil yang menyimpan selepasnya.
               save() di sini tidak mencetuskan sync semula kerana
               syncSedangBerjalan masih true pada ketika ini. */
            try { save(); } catch (eS) {}
            return { dihantar: dihantar, diterima: terima };
          });
        });
      });
    }).then(function (ringkasan) {
      self.syncSedangBerjalan = false;
      self._lastSyncComplete = Date.now();
      return ringkasan;
    }).catch(function (e) {
      self.syncSedangBerjalan = false;
      throw e;
    });
  },
  kaedahLabel: function (kaedah) {
    if (kaedah === "google") return "Google";
    if (kaedah === "otp") return "Kod Pengesahan";
    return "Email";
  },
  renderStatus: function () {
    var el = $("sbStatus"); if (!el) return;
    var cfg = this.cfg(); var s = this.sesi(); var st = this.syncState();
    if ($("sbAutoToggle")) $("sbAutoToggle").checked = !!st.autoSync;
    if ($("sbEmail") && s && s.email) $("sbEmail").value = s.email;
    var akhir = st.lastSyncAt ? new Date(st.lastSyncAt).toLocaleString("ms-MY") : "belum pernah";
    if (s && s.email) {
      el.textContent = "Daftar masuk sebagai " + s.email + " (" + this.kaedahLabel(s.kaedah) + ") • Terakhir sync: " + akhir +
        " • Sync automatik: " + (st.autoSync ? "HIDUP" : "MATI") + ".";
      if (typeof sbTunjukLangkah === "function") sbTunjukLangkah("logmasuk");
    } else if (cfg.url && cfg.anon) {
      el.textContent = "Belum daftar masuk. Daftar masuk dengan Google, email + kata laluan, atau kod pengesahan, kemudian Sync Sekarang.";
      if (typeof sbTunjukLangkah === "function") sbTunjukLangkah((sbLangkahSemasa === "logmasuk" || !sbLangkahSemasa) ? "utama" : sbLangkahSemasa);
    } else {
      el.textContent = "Aplikasi ini belum dikonfigurasi oleh pemilik. Sila hubungi pemilik aplikasi.";
      if (typeof sbTunjukLangkah === "function") sbTunjukLangkah((sbLangkahSemasa === "logmasuk" || !sbLangkahSemasa) ? "utama" : sbLangkahSemasa);
    }
  }
};

/* v3.6: tiada lagi data contoh automatik — pemasangan baharu bermula
   kosong dan pengguna isi kebun/blok sendiri. Data sedia ada pengguna
   lama (termasuk rekod contoh yang pernah dimuatkan) tidak disentuh. */
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var d = JSON.parse(raw); if (d && Array.isArray(d.kebuns) && Array.isArray(d.bloks) && Array.isArray(d.kerjas)) return normalData(d); }
  } catch (e) { /* abaikan data rosak, cuba migrasi lama */ }
  /* Migrasi v2 -> v3 (dan v1 -> v3 melalui laluan sama): kekalkan
     kebun/blok/kerja, tambah zon, dos berstruktur (dihuraikan daripada
     teks dos lama), peringkat blok, syarat kerja seterusnya dan pustaka bahan. */
  try {
    var lama = localStorage.getItem(OLD_KEY);
    if (lama) { var dv2 = JSON.parse(lama); if (dv2 && Array.isArray(dv2.kerjas)) { var mig = normalData(dv2); localStorage.setItem(KEY, JSON.stringify(mig)); return mig; } }
  } catch (e2) { /* abaikan */ }
  try {
    var lama1 = localStorage.getItem(OLD_KEY_V1);
    if (lama1) { var dv1 = JSON.parse(lama1); if (dv1 && Array.isArray(dv1.kerjas)) { var mig1 = normalData(dv1); localStorage.setItem(KEY, JSON.stringify(mig1)); return mig1; } }
  } catch (e3) { /* abaikan */ }
  return emptyData();
}
/* v3.6: import contoh (13 rekod Excel lama) dibuang — pengguna baharu
   isi kebun/blok sendiri. Rekod contoh yang sudah dimuatkan sebelum ini
   kekal dalam data pengguna dan boleh dibuang dengan butang
   "Padam Data Contoh Sahaja" (hanya muncul bila ada data contoh). */
var data = load();
function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
  /* Sync automatik Supabase: dijadualkan (debounce), tidak menghalang
     simpanan tempatan, dan tidak berjalan semasa sync sedang berlangsung. */
  try { if (typeof SB !== "undefined" && SB && !SB.syncSedangBerjalan) SB.jadualAutoSync(); } catch (e) {}
}

function toast(msg) { var el = $("toast"); el.textContent = msg; el.hidden = false; setTimeout(function () { el.hidden = true; }, 3500); }
function kebunNama(id) { var k = data.kebuns.find(function (x) { return x.id === id; }); return k ? k.nama : "-"; }
function blokById(id) { return data.bloks.find(function (x) { return x.id === id; }); }
function blokNama(id) { if (!id) return "Semua Blok"; var b = blokById(id); return b ? b.nama : "-"; }
function blokLabel(b) { if (!b) return "-"; var tn = b.tanaman === "Lain-lain" && b.tanamanLain ? b.tanamanLain : b.tanaman; return b.nama + " — " + tn + " (" + (b.peringkat || "Semua Peringkat") + ")"; }
function tanamanBlok(id) { var b = blokById(id); if (!b) return "-"; return b.tanaman === "Lain-lain" && b.tanamanLain ? b.tanamanLain : b.tanaman; }
function jenisPaparan(k) { if (k.jenis === "Lain-lain" && k.jenisLain) return k.jenisLain; return jenisLabel(k.jenis); }
function iconKerja(j) { var m = {"Membaja":"membaja.svg","Meracun Rumput":"meracun-rumput.svg","Racun Kulat":"racun-kulat.svg","Racun Serangga":"racun-serangga.svg","Menuai":"menuai.svg","Pruning":"pruning.svg","Potong Rumput":"potong-rumput.svg","Membersihkan":"membersihkan.svg","Menanam":"menanam.svg","Menyiram":"menyiram.svg"}; return m[j] || "lain-kerja.svg"; }
function iconTanaman(tn) { var m = {"Koko":"koko.svg","Sawit":"sawit.svg","Durian":"durian.svg"}; return m[tn] || "lain.svg"; }
function emptyHtml(msg) { return "<div class=\"emptywrap\"><img class=\"empty-art\" src=\"assets/illustration-empty.svg\" alt=\"\"><p class=\"empty\">" + msg + "</p></div>"; }

function fillSelect(el, items, placeholder) {
  el.innerHTML = "";
  if (placeholder) { var o = document.createElement("option"); o.value = ""; o.textContent = placeholder; el.appendChild(o); }
  items.forEach(function (it) { var op = document.createElement("option"); op.value = it.value; op.textContent = it.label; el.appendChild(op); });
}
function refreshSelects() {
  var kebunOpts = data.kebuns.map(function (k) { return { value: k.id, label: k.nama }; });
  fillSelect($("kerjaKebun"), kebunOpts);
  fillSelect($("blokKebun"), kebunOpts);
  fillSelect($("fKebun"), kebunOpts, "Semua Kebun");
  // Blok: kerja form ikut kebun terpilih, selebihnya semua blok
  refreshBlokSelects();
}
function refreshBlokSelects() {
  var kebunId = $("kerjaKebun").value;
  var untukKerja = data.bloks.filter(function (b) { return !kebunId || b.kebunId === kebunId; });
  var curBlok = $("kerjaBlok").value;
  var optsKerja = [{ value: "", label: "Semua Blok (seluruh kebun)" }].concat(untukKerja.map(function (b) { return { value: b.id, label: blokLabel(b) }; }));
  fillSelect($("kerjaBlok"), optsKerja);
  if (curBlok !== undefined && curBlok !== null) $("kerjaBlok").value = curBlok;
  var fKebun = $("fKebun").value;
  var untukTapisan = data.bloks.filter(function (b) { return !fKebun || b.kebunId === fKebun; });
  var cur = $("fBlok").value;
  fillSelect($("fBlok"), untukTapisan.map(function (b) { return { value: b.id, label: b.nama + " (" + kebunNama(b.kebunId) + ")" }; }), "Semua Blok");
  if (cur) $("fBlok").value = cur;
  fillSelect($("qBlok"), data.bloks.map(function (b) { return { value: b.id, label: blokLabel(b) + " (" + kebunNama(b.kebunId) + ")" }; }));
  refreshBahanFilter();
}
function refreshBahanFilter() {
  var el = $("fBahan"); if (!el) return;
  var cur = el.value;
  var nama = [];
  data.bahans.forEach(function (b) { if (nama.indexOf(b.nama) < 0) nama.push(b.nama); });
  data.kerjas.forEach(function (k) { if (k.bahan && nama.indexOf(k.bahan) < 0) nama.push(k.bahan); });
  fillSelect(el, nama.map(function (n) { return { value: n, label: n }; }), "Semua Bahan");
  if (cur) el.value = cur;
}
/* Borang kerja: Bahan ditapis ikut Jenis Kerja, daripada pustaka bahan. */
function refreshBahanSelect() {
  var el = $("kerjaBahan"); if (!el) return;
  var jenis = $("kerjaJenis").value;
  var cur = el.value;
  var senarai = data.bahans.filter(function (b) { return !jenis || b.jenisKerja === jenis || !b.jenisKerja; });
  /* v3.6: pustaka bermula kosong — tunjuk keadaan kosong dengan jelas. */
  var labelKosong = senarai.length ? "Pilih bahan…" : "Tiada bahan — tambah baharu";
  var opts = [{ value: "", label: labelKosong }].concat(senarai.map(function (b) {
    return { value: b.id, label: b.nama + (b.dosLalai ? " (" + b.dosLalai + ")" : "") };
  }));
  opts.push({ value: "__TAMBAH__", label: "+ Tambah bahan baharu…" });
  opts.push({ value: "__LAIN__", label: "Lain-lain (taip sendiri)" });
  fillSelect(el, opts);
  if (cur && senarai.some(function (b) { return b.id === cur; })) el.value = cur;
  else if (cur === "__TAMBAH__" || cur === "__LAIN__") el.value = cur;
  toggleBahanRow();
}
function toggleBahanRow() {
  var v = $("kerjaBahan").value;
  var rBaru = $("kerjaBahanBaruRow"), rLain = $("kerjaBahanLainRow");
  if (rBaru) rBaru.hidden = (v !== "__TAMBAH__");
  if (rLain) rLain.hidden = (v !== "__LAIN__");
}
function bahanTerpilih() {
  var v = $("kerjaBahan").value;
  if (v === "__TAMBAH__") return { id: "", nama: ($("kerjaBahanBaru").value || "").trim(), baru: true };
  if (v === "__LAIN__") return { id: "", nama: ($("kerjaBahanLain").value || "").trim(), baru: false };
  if (!v) return { id: "", nama: "", baru: false };
  var b = data.bahans.find(function (x) { return x.id === v; });
  return { id: v, nama: b ? b.nama : "", baru: false };
}
function isiDosDariBahan(bahanId) {
  var b = data.bahans.find(function (x) { return x.id === bahanId; });
  if (!b || !b.dosLalai) return;
  var p = parseDos(b.dosLalai);
  if (p.jumlah === "") return;
  $("kerjaDosJumlah").value = p.jumlah;
  $("kerjaDosUnit").value = p.unit;
  $("kerjaDosPer").value = p.per;
}
var _hintTerakhir = null;
function kemaskiniHintTerakhir(autofill) {
  var el = $("kerjaHint"), btn = $("kerjaGunaSemulaBtn");
  if (!el) return;
  var blokId = $("kerjaBlok").value, jenis = $("kerjaJenis").value;
  var siap = data.kerjas.filter(function (k) {
    return k.jenis === jenis && (k.status === "Siap" || k.status === "Siap Sebahagian") &&
      (k.tarikhSiap || k.tarikhRancang) && (!blokId || k.blokId === blokId);
  }).sort(function (a, b) { var da = a.tarikhSiap || a.tarikhRancang, db = b.tarikhSiap || b.tarikhRancang; return da < db ? 1 : -1; });
  if (!siap.length) { _hintTerakhir = null; el.textContent = ""; if (btn) btn.hidden = true; return; }
  var k = siap[0];
  _hintTerakhir = k;
  el.textContent = "Terakhir: " + (k.bahan || "—") + (k.dos ? ", " + k.dos : "") + " pada " + fmtDate(k.tarikhSiap || k.tarikhRancang) + " — tekan Guna Semula untuk isi bahan & dos yang sama.";
  if (btn) btn.hidden = false;
  if (autofill && !$("kerjaId").value) gunaSemulaTerakhir(true);
}
function gunaSemulaTerakhir(senyap) {
  var k = _hintTerakhir; if (!k) return;
  if (k.bahanId) { refreshBahanSelect(); $("kerjaBahan").value = k.bahanId; toggleBahanRow(); }
  else if (k.bahan) {
    var b = data.bahans.find(function (x) { return x.nama === k.bahan && x.jenisKerja === k.jenis; });
    if (b) { refreshBahanSelect(); $("kerjaBahan").value = b.id; }
    else { refreshBahanSelect(); $("kerjaBahan").value = "__LAIN__"; toggleBahanRow(); $("kerjaBahanLain").value = k.bahan; }
  }
  if (k.dosJumlah !== "" && k.dosJumlah !== null && k.dosJumlah !== undefined) {
    $("kerjaDosJumlah").value = k.dosJumlah; $("kerjaDosUnit").value = k.dosUnit || ""; $("kerjaDosPer").value = k.dosPer || "";
  } else if (k.dos) { var p = parseDos(k.dos); if (p.jumlah !== "") { $("kerjaDosJumlah").value = p.jumlah; $("kerjaDosUnit").value = p.unit; $("kerjaDosPer").value = p.per; } }
  if (!senyap) toast("Bahan & dos terakhir diisi semula.");
}

function jobCard(k) {
  var t = todayStr();
  var overdue = k.tarikhRancang < t && k.status !== "Siap";
  var div = document.createElement("div");
  div.className = "card job";
  div.innerHTML =
    "<div class=\"jobhead\"><img class=\"jobicon\" src=\"assets/icons/" + iconKerja(k.jenis) + "\" alt=\"\"><p class=\"title\">" + esc(jenisPaparan(k)) + " — " + esc(blokNama(k.blokId)) + "</p></div>" +
    (k.image ? "<img class=\"jobimg\" src=\"" + esc(k.image) + "\" alt=\"Gambar kerja\">" : "") +
    "<p class=\"meta\">" + esc(kebunNama(k.kebunId)) + " • " + esc(tanamanBlok(k.blokId)) + "<br>" +
    "Dirancang: " + esc(fmtDate(k.tarikhRancang)) + (overdue ? " <span class=\"overdue\">• Tertunggak</span>" : "") +
    (k.zon && k.zon !== "Semua Zon" ? "<br>Zon: " + esc(k.zon) : "") +
    (k.nextTarikh ? "<br>Seterusnya: " + esc(fmtDate(k.nextTarikh)) +
      (k.nextSyarat && k.nextSyarat !== "Tiada syarat" ? " • " + esc(k.nextSyarat === "Lain-lain" && k.nextSyaratLain ? k.nextSyaratLain : k.nextSyarat) : "") +
      (k.nextTukarBahan ? " • Tukar bahan" + (k.nextBahan ? ": " + esc(k.nextBahan) : "") : "") : "") +
    (k.tarikhSiap ? "<br>Siap: " + esc(fmtDate(k.tarikhSiap)) : "") +
    (k.bahan ? "<br>Bahan: " + esc(k.bahan) : "") +
    (k.dos ? " • Dos: " + esc(k.dos) : "") +
    "<br>Kos: " + esc(fmtRM(k.kos)) +
    (k.nota ? "<br>Nota: " + esc(k.nota) : "") + "</p>" +
    "<span class=\"status " + esc(k.status) + "\">" + esc(k.status) + "</span>" +
    "<div class=\"progress\"><div style=\"width:" + (Number(k.peratus) || 0) + "%\"></div></div>" +
    "<p class=\"meta\">Siap: " + (Number(k.peratus) || 0) + "%</p>" +
    "<div class=\"pctrow\"><label style=\"flex:0 0 auto\">Peratus:</label><select data-pct=\"" + k.id + "\"><option value=\"0\"" + ((Number(k.peratus) || 0) === 0 ? " selected" : "") + ">0%</option><option value=\"50\"" + ((Number(k.peratus) || 0) === 50 ? " selected" : "") + ">50%</option><option value=\"100\"" + ((Number(k.peratus) || 0) > 50 ? " selected" : "") + ">100%</option></select>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"pct\" data-id=\"" + k.id + "\">Kemaskini %</button></div>" +
    "<div class=\"row\" style=\"margin-top:10px\">" +
    "<button type=\"button\" class=\"btn primary small\" data-act=\"siap\" data-id=\"" + k.id + "\">✓ Tandakan Siap</button>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"esok\" data-id=\"" + k.id + "\">➜ Bawa ke Esok</button>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"lusa\" data-id=\"" + k.id + "\">➜ Bawa ke Lusa</button>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"ubah\" data-id=\"" + k.id + "\">Ubah</button>" +
    "<button type=\"button\" class=\"btn danger small\" data-act=\"padam\" data-id=\"" + k.id + "\">Padam</button></div>";
  return div;
}

function renderHariIni() {
  var t = todayStr();
  var list = data.kerjas.filter(function (k) { return k.status !== "Siap" && (k.tarikhRancang === t || k.tarikhRancang < t); });
  list.sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? -1 : 1; });
  var el = $("hariIniList");
  el.innerHTML = "";
  if (!list.length) { el.innerHTML = emptyHtml("Tiada kerja untuk hari ini. Tahniah — semua sudah siap atau belum dirancang."); return; }
  list.forEach(function (k) { el.appendChild(jobCard(k)); });
}
function renderPeringatan() {
  var el = $("peringatanList"); if (!el) return;
  var s = (data.settings && typeof data.settings.notifikasiHidup === "boolean") ? data.settings.notifikasiHidup : true;
  if (!s) { el.innerHTML = ""; el.hidden = true; return; }
  var t = todayStr(); var esok = addDays(t, 1); var lusa = addDays(t, 2);
  var list = data.kerjas.filter(function (k) { return k.status !== "Siap" && (k.tarikhRancang === t || k.tarikhRancang === esok || k.tarikhRancang === lusa); });
  list.sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? -1 : 1; });
  el.hidden = false;
  if (!list.length) { el.innerHTML = "<div class=\"card\"><h3>Akan Datang</h3><p class=\"hint\">Tiada kerja dalam 2 hari lagi.</p></div>"; return; }
  var rows = list.map(function (k) {
    var bila = k.tarikhRancang === t ? "Hari ini" : (k.tarikhRancang === esok ? "Esok" : "2 hari lagi");
    return "<p>" + esc(jenisPaparan(k)) + " — " + esc(blokNama(k.blokId)) + " (" + esc(kebunNama(k.kebunId)) + ") • " + bila + " (" + esc(fmtDate(k.tarikhRancang)) + ")</p>";
  }).join("");
  el.innerHTML = "<div class=\"card\"><h3>Akan Datang (2 hari lagi)</h3><p class=\"hint\">Peringatan untuk kerja yang dijadualkan hari ini, esok dan 2 hari lagi. Notifikasi pelayar hanya dihantar bila aplikasi dibuka.</p>" + rows + "</div>";
}
function renderNotifikasiStatus() {
  var st = $("notiStatus"); if (!st) return;
  var hidup = data.settings && data.settings.notifikasiHidup;
  var izin = (typeof Notification !== "undefined") ? Notification.permission : "tidak disokong";
  st.textContent = "Notifikasi: " + (hidup ? "HIDUP" : "MATI") + " • Izin pelayar: " + izin +
    (hidup ? " • Notifikasi pelayar hanya dihantar bila aplikasi dibuka; ia tidak berfungsi bila aplikasi ditutup sepenuhnya di web." : " • Tiada notifikasi akan dihantar selagi suis ini MATI.");
  var tog = $("notiToggle"); if (tog) tog.checked = !!hidup;
}
function renderAkaunStatus() {
  var el = $("akaunStatus"); if (!el) return;
  var inpNama = $("akaunNamaPaparan");
  if (inpNama && document.activeElement !== inpNama) inpNama.value = namaPaparan();
  var sbSesi = null, sbCfgAda = false, sbAkhir = "belum pernah";
  try {
    if (typeof SB !== "undefined" && SB) {
      sbSesi = SB.sesi(); var c = SB.cfg(); sbCfgAda = !!(c.url && c.anon);
      var st = SB.syncState(); if (st.lastSyncAt) sbAkhir = new Date(st.lastSyncAt).toLocaleString("ms-MY");
    }
  } catch (e) {}
  if (sbSesi && sbSesi.email) {
    el.innerHTML = "<p><b>Status sandaran:</b> Anda daftar masuk sebagai " + esc(sbSesi.email) +
      (namaPaparan() ? " (Nama paparan: " + esc(namaPaparan()) + ")" : "") +
      ". Terakhir sync: " + esc(sbAkhir) + ". Data tanpa gambar di-sync ke akaun ini.</p>" +
      "<p><b>Jika tukar telefon:</b> daftar masuk dengan akaun yang sama dan tekan Sync Sekarang — kebun, blok dan kerja anda (tanpa gambar) akan dimuat turun semula.</p>" +
      "<p>Gambar disimpan tempatan sahaja dan <b>tidak</b> dihantar dalam versi ini (untuk jimat storan).</p>";
  } else if (sbCfgAda) {
    el.innerHTML = "<p><b>Status sandaran:</b> Anda belum daftar masuk. Data anda sekarang hanya dalam peranti ini + fail eksport JSON anda.</p>" +
      "<p><b>Untuk simpan data dalam akaun,</b> daftar masuk di bawah dengan Google atau email, kemudian tekan Sync Sekarang. Selepas sync pertama berjaya, data tanpa gambar akan tersimpan dalam akaun anda.</p>" +
      "<p>Gambar disimpan tempatan sahaja dan <b>tidak</b> termasuk dalam eksport JSON biasa (untuk jimat storan).</p>";
  } else {
    el.innerHTML = "<p><b>Status sandaran:</b> Aplikasi ini belum dikonfigurasi oleh pemilik, jadi data hanya dalam peranti ini buat masa ini. Sila hubungi pemilik aplikasi.</p>" +
      "<p>Eksport JSON selalu sebagai sandaran — jika aplikasi dinyahpasang tanpa eksport, data akan hilang.</p>" +
      "<p>Gambar disimpan tempatan sahaja dan <b>tidak</b> termasuk dalam eksport JSON biasa (untuk jimat storan).</p>";
  }
}
function semakNotifikasi() {
  try {
    if (!data.settings || !data.settings.notifikasiHidup) return;
    /* Capacitor LocalNotifications — hanya berfungsi selepas build Android.
       Dijaga supaya tidak buat apa-apa di web jika plugin tiada. */
    try {
      var LN = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) ? window.Capacitor.Plugins.LocalNotifications : null;
      if (LN && LN.schedule) {
        var lusa = addDays(todayStr(), 2);
        var due = data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang === lusa; }).slice(0, 5);
        if (due.length) { LN.schedule({ notifications: due.map(function (k, i) { return { title: "KebunKu — Kerja 2 hari lagi", body: jenisPaparan(k) + " — " + blokNama(k.blokId), id: 1000 + i, schedule: { at: new Date(todayStr() + "T08:00:00") } }; }) }).catch(function () {}); }
      }
    } catch (eCap) { /* abaikan di web */ }
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    var lusa2 = addDays(todayStr(), 2);
    data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang === lusa2; }).slice(0, 5).forEach(function (k) {
      try { new Notification("KebunKu — Kerja 2 hari lagi", { body: jenisPaparan(k) + " — " + blokNama(k.blokId) + " (" + fmtDate(k.tarikhRancang) + ")" }); } catch (eN) {}
    });
  } catch (e) {}
}
/* v3.6: senarai Kerja dipaginasi 10 demi 10 (terkini dahulu). Kerja yang
   sudah Siap (100%) TIDAK dipaparkan di sini — ia hanya dalam Sejarah. */
var kerjaHad = 10;
function renderSemuaKerja() {
  var el = $("semuaKerjaList");
  el.innerHTML = "";
  var list = data.kerjas.filter(function (k) { return k.status !== "Siap"; })
    .sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? 1 : -1; });
  if (!list.length) { el.innerHTML = emptyHtml("Belum ada kerja belum siap. Tambah kerja baharu di atas — kerja yang sudah siap ada dalam Sejarah."); return; }
  list.slice(0, kerjaHad).forEach(function (k) { el.appendChild(jobCard(k)); });
  if (list.length > kerjaHad) {
    var baki = list.length - kerjaHad;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn secondary"; btn.textContent = "Tunjuk Lagi (" + baki + " lagi)";
    btn.addEventListener("click", function () { kerjaHad += 10; renderSemuaKerja(); });
    el.appendChild(btn);
  }
}
function renderKebunBlok() {
  var kl = $("kebunList"); kl.innerHTML = "";
  if (!data.kebuns.length) kl.innerHTML = emptyHtml("Belum ada kebun.");
  data.kebuns.forEach(function (k) {
    var d = document.createElement("div"); d.className = "card";
    d.innerHTML = "<p class=\"title\" style=\"font-weight:800\">" + esc(k.nama) + (k.contoh ? " <span class=\"status\">Contoh</span>" : "") + "</p>" +
      "<button type=\"button\" class=\"btn danger small\" data-del-kebun=\"" + k.id + "\">Padam Kebun</button>";
    kl.appendChild(d);
  });
  var bl = $("blokList"); bl.innerHTML = "";
  if (!data.bloks.length) bl.innerHTML = emptyHtml("Belum ada blok.");
  data.bloks.forEach(function (b) {
    var d = document.createElement("div"); d.className = "card";
    d.innerHTML = "<img class=\"blokicon\" src=\"assets/icons/" + iconTanaman(b.tanaman) + "\" alt=\"\"><p class=\"title\" style=\"font-weight:800\">" + esc(b.nama) + " — " + esc(tanamanBlok(b.id)) + " (" + esc(b.peringkat || "Semua Peringkat") + ")" + (b.contoh ? " <span class=\"status\">Contoh</span>" : "") + "</p>" +
      "<p class=\"meta\">" + esc(kebunNama(b.kebunId)) + "</p>" +
      "<button type=\"button\" class=\"btn danger small\" data-del-blok=\"" + b.id + "\">Padam Blok</button>";
    bl.appendChild(d);
  });
  renderBahans();
}
function renderBahans() {
  var el = $("bahanList"); if (!el) return;
  el.innerHTML = "";
  var senarai = data.bahans.slice().sort(function (a, b) {
    if (a.jenisKerja !== b.jenisKerja) return a.jenisKerja < b.jenisKerja ? -1 : 1;
    return a.nama < b.nama ? -1 : 1;
  });
  if (!senarai.length) { el.innerHTML = emptyHtml("Belum ada bahan dalam pustaka. Tambah bahan di atas — bahan yang ditambah akan muncul sebagai pilihan dalam borang kerja."); return; }
  senarai.forEach(function (b) {
    var d = document.createElement("div"); d.className = "card";
    d.innerHTML = "<p class=\"title\" style=\"font-weight:800\">" + esc(b.nama) + "</p>" +
      "<p class=\"meta\">" + esc(b.jenisKerja || "Semua kerja") + (b.dosLalai ? " • Dos lalai: " + esc(b.dosLalai) : "") + (b.nota ? " • " + esc(b.nota) : "") + "</p>" +
      "<button type=\"button\" class=\"btn danger small\" data-del-bahan=\"" + b.id + "\">Padam Bahan</button>";
    el.appendChild(d);
  });
}
/* ===== v3.6 — Sejarah: Kalendar bulan + Senarai =====
   Tarikh paparan kerja ialah tarikhSiap jika ada, jika tidak tarikhRancang.
   Tapisan (kebun/blok/tanaman/jenis/bahan/zon/cari/dari/hingga) menapis
   kedua-dua paparan: titik dalam kalendar DAN senarai hari/senarai penuh. */
function tarikhPaparanKerja(k) { return k.tarikhSiap || k.tarikhRancang; }
var NAMA_BULAN = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
var sejarahMod = "kalendar";
var sejarahBulan = todayStr().slice(0, 7);
var sejarahHari = null;
var sejarahHad = 20;
function tapisanSejarah() {
  var fKebun = $("fKebun").value, fBlok = $("fBlok").value, fTan = $("fTanaman").value, fJen = $("fJenis").value;
  var fBahan = $("fBahan") ? $("fBahan").value : "", fZon = $("fZon") ? $("fZon").value : "";
  var cari = ($("fCari").value || "").toLowerCase(), dari = $("fDari").value, hingga = $("fHingga").value;
  return data.kerjas.filter(function (k) {
    if (fKebun && k.kebunId !== fKebun) return false;
    if (fBlok && k.blokId !== fBlok) return false;
    if (fTan) { var tb = tanamanBlok(k.blokId); var raw = blokById(k.blokId); if (fTan === "Lain-lain" ? !(raw && raw.tanaman === "Lain-lain") : tb !== fTan) return false; }
    if (fJen && k.jenis !== fJen) return false;
    if (fBahan && (k.bahan || "") !== fBahan) return false;
    if (fZon && (k.zon || "Semua Zon") !== fZon) return false;
    if (cari && ((k.bahan || "").toLowerCase().indexOf(cari) < 0 && (k.dos || "").toLowerCase().indexOf(cari) < 0 && (k.nota || "").toLowerCase().indexOf(cari) < 0)) return false;
    if (dari && k.tarikhRancang < dari) return false;
    if (hingga && k.tarikhRancang > hingga) return false;
    return true;
  }).sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? 1 : -1; });
}
function renderSejarah() {
  var list = tapisanSejarah();
  var elKal = $("sejarahKalendar"), elHari = $("sejarahHariList"), elSen = $("sejarahList");
  var bKal = $("sejarahKalendarBtn"), bSen = $("sejarahSenaraiBtn");
  if (bKal) bKal.classList.toggle("active", sejarahMod === "kalendar");
  if (bSen) bSen.classList.toggle("active", sejarahMod === "senarai");
  if (elKal) elKal.hidden = (sejarahMod !== "kalendar");
  if (elHari) elHari.hidden = (sejarahMod !== "kalendar");
  if (elSen) elSen.hidden = (sejarahMod !== "senarai");
  if (sejarahMod === "kalendar") { renderKalendarSejarah(list); return; }
  renderSenaraiSejarah(list);
}
function tukarBulan(bulan, n) {
  var y = Number(bulan.slice(0, 4)), m = Number(bulan.slice(5, 7)) - 1 + n;
  var y2 = y + Math.floor(m / 12); var m2 = ((m % 12) + 12) % 12;
  return y2 + "-" + String(m2 + 1).padStart(2, "0");
}
function renderKalendarSejarah(list) {
  var el = $("sejarahKalendar"); if (!el) return;
  var y = Number(sejarahBulan.slice(0, 4)), m = Number(sejarahBulan.slice(5, 7));
  var label = NAMA_BULAN[m - 1] + " " + y;
  var kira = {};
  list.forEach(function (k) { var d = tarikhPaparanKerja(k); if (!d) return; kira[d] = (kira[d] || 0) + 1; });
  if (!sejarahHari && sejarahBulan === todayStr().slice(0, 7)) sejarahHari = todayStr();
  var hariPertama = new Date(y, m - 1, 1).getDay();
  var hariDalamBulan = new Date(y, m, 0).getDate();
  var t = todayStr();
  var html = "<div class=\"kal-nav\"><button type=\"button\" class=\"btn secondary small\" id=\"kalPrevBtn\">‹ Bulan Lepas</button>" +
    "<p class=\"kal-label\">" + esc(label) + "</p>" +
    "<button type=\"button\" class=\"btn secondary small\" id=\"kalNextBtn\">Bulan Depan ›</button></div>" +
    "<p class=\"hint\">" + Object.keys(kira).length + " hari ada kerja dalam bulan ini • " + list.length + " rekod menepati tapisan. Tekan satu hari untuk lihat kerja hari itu.</p>" +
    "<div class=\"kal-grid\">" +
    ["Aha", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"].map(function (h) { return "<div class=\"kal-hari-nama\">" + h + "</div>"; }).join("");
  for (var i = 0; i < hariPertama; i++) html += "<div class=\"kal-hari kosong\"></div>";
  for (var d = 1; d <= hariDalamBulan; d++) {
    var ds = y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    var n = kira[ds] || 0;
    var kelas = "kal-hari" + (n ? " ada" : "") + (ds === t ? " hari-ini" : "") + (ds === sejarahHari ? " pilih" : "");
    html += "<button type=\"button\" class=\"" + kelas + "\" data-kal-hari=\"" + ds + "\"><span class=\"kal-nombor\">" + d + "</span>" +
      (n ? "<span class=\"kal-badge\">" + n + "</span>" : "") + "</button>";
  }
  html += "</div>";
  el.innerHTML = html;
  var prev = $("kalPrevBtn"), next = $("kalNextBtn");
  if (prev) prev.addEventListener("click", function () { sejarahBulan = tukarBulan(sejarahBulan, -1); sejarahHari = null; renderSejarah(); });
  if (next) next.addEventListener("click", function () { sejarahBulan = tukarBulan(sejarahBulan, 1); sejarahHari = null; renderSejarah(); });
  renderHariSejarah(list);
}
function renderHariSejarah(list) {
  var el = $("sejarahHariList"); if (!el) return;
  el.innerHTML = "";
  if (!sejarahHari) { el.innerHTML = "<p class=\"hint\">Pilih satu hari dalam kalendar di atas untuk lihat kerja hari itu.</p>"; return; }
  var hariList = list.filter(function (k) { return tarikhPaparanKerja(k) === sejarahHari; });
  var h = document.createElement("p"); h.className = "hint";
  h.textContent = hariList.length + " rekod pada " + fmtDate(sejarahHari) + ".";
  el.appendChild(h);
  if (!hariList.length) { el.innerHTML += emptyHtml("Tiada rekod pada hari ini."); return; }
  hariList.forEach(function (k) { el.appendChild(jobCard(k)); });
}
function renderSenaraiSejarah(list) {
  var el = $("sejarahList"); if (!el) return;
  el.innerHTML = "";
  el.innerHTML = "<p class=\"hint\">" + list.length + " rekod dijumpai.</p>";
  if (!list.length) { el.innerHTML += emptyHtml("Tiada rekod menepati tapisan."); return; }
  var tunjuk = list.slice(0, sejarahHad);
  var bulanSkrg = "";
  tunjuk.forEach(function (k) {
    var b = (tarikhPaparanKerja(k) || "").slice(0, 7);
    if (b !== bulanSkrg) {
      bulanSkrg = b;
      var hh = document.createElement("h3"); hh.className = "sejarah-bulan";
      hh.textContent = b ? (NAMA_BULAN[Number(b.slice(5, 7)) - 1] + " " + b.slice(0, 4)) : "Tiada tarikh";
      el.appendChild(hh);
    }
    el.appendChild(jobCard(k));
  });
  if (list.length > sejarahHad) {
    var baki = list.length - sejarahHad;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn secondary"; btn.textContent = "Tunjuk Lagi (" + baki + " lagi)";
    btn.addEventListener("click", function () { sejarahHad += 20; renderSejarah(); });
    el.appendChild(btn);
  }
}
/* Ringkasan visual — kad nombor besar, carta donut, bar 7 hari, bar ikut
   kebun dan bar bahan. Tiada carta luar / CDN: SVG + CSS sahaja, supaya
   kekal offline dalam WebView. */
function renderRingkasan() {
  var t = todayStr();
  var bulan = t.slice(0, 7);
  var mingguMula = addDays(t, -6);
  function kira(dari, hingga) {
    var subset = data.kerjas.filter(function (k) { return k.tarikhRancang >= dari && k.tarikhRancang <= hingga; });
    var siap = subset.filter(function (k) { return k.status === "Siap"; });
    var belum = subset.filter(function (k) { return k.status !== "Siap"; });
    var kos = siap.reduce(function (s, k) { return s + (Number(k.kos) || 0); }, 0);
    return { siap: siap.length, belum: belum.length, kos: kos, jumlah: subset.length };
  }
  var mg = kira(mingguMula, t), bl = kira(bulan + "-01", bulan + "-31");
  var tertunggak = data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang < t; }).length;
  /* Kad stat — 4 nombor besar sepintas lalu. */
  var statEl = $("ringkasanStat");
  if (statEl) {
    statEl.innerHTML = "<div class=\"statgrid\">" +
      "<div class=\"stat\"><p class=\"num\">" + bl.siap + "</p><p class=\"lbl\">Siap — Bulan Ini</p><p class=\"sub\">daripada " + bl.jumlah + " kerja</p></div>" +
      "<div class=\"stat gold\"><p class=\"num\">" + bl.belum + "</p><p class=\"lbl\">Belum Siap — Bulan Ini</p><p class=\"sub\">perlu disiapkan</p></div>" +
      "<div class=\"stat danger\"><p class=\"num\">" + tertunggak + "</p><p class=\"lbl\">Tertunggak</p><p class=\"sub\">melepasi tarikh dirancang</p></div>" +
      "<div class=\"stat\"><p class=\"num\">" + fmtRM(bl.kos) + "</p><p class=\"lbl\">Kos Kerja Siap</p><p class=\"sub\">bulan ini</p></div>" +
      "</div>";
  }
  /* Carta donut — bulan ini. */
  var peratusSiap = bl.jumlah ? Math.round(bl.siap / bl.jumlah * 100) : 0;
  var C = 2 * Math.PI * 54;
  var siapLen = (C * peratusSiap / 100).toFixed(1);
  $("ringkasanBulan").innerHTML = "<h3>Bulan Ini (" + bulan + ")</h3>" +
    "<div class=\"donutwrap\">" +
    "<svg class=\"donut\" viewBox=\"0 0 132 132\" role=\"img\" aria-label=\"" + peratusSiap + "% kerja siap bulan ini\">" +
    "<circle cx=\"66\" cy=\"66\" r=\"54\" fill=\"none\" stroke=\"#EAE6D8\" stroke-width=\"16\"/>" +
    "<circle cx=\"66\" cy=\"66\" r=\"54\" fill=\"none\" stroke=\"#1E4D2B\" stroke-width=\"16\" stroke-linecap=\"round\" stroke-dasharray=\"" + siapLen + " " + C.toFixed(1) + "\" transform=\"rotate(-90 66 66)\"/>" +
    "<text x=\"66\" y=\"62\" text-anchor=\"middle\" class=\"donut-pct\">" + peratusSiap + "%</text>" +
    "<text x=\"66\" y=\"82\" text-anchor=\"middle\" class=\"donut-lbl\">siap</text></svg>" +
    "<div class=\"legend\">" +
    "<p><span class=\"dot\" style=\"background:#1E4D2B\"></span> Siap — <b>" + bl.siap + "</b></p>" +
    "<p><span class=\"dot\" style=\"background:#C08A1A\"></span> Belum siap — <b>" + bl.belum + "</b></p>" +
    "<p><span class=\"dot\" style=\"background:#EAE6D8\"></span> Jumlah — <b>" + bl.jumlah + "</b></p>" +
    "<p>Kos kerja siap: <b>" + fmtRM(bl.kos) + "</b></p>" +
    "</div></div>";
  /* Bar 7 hari — kerja siap setiap hari (ikut tarikh siap, jika tiada ikut tarikh dirancang). */
  var namaHari = ["Aha", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"];
  var barHari = [];
  var maksHari = 0;
  for (var i = 0; i < 7; i++) {
    var hari = addDays(mingguMula, i);
    var n = data.kerjas.filter(function (k) {
      if (k.status !== "Siap") return false;
      var d = k.tarikhSiap || k.tarikhRancang;
      return d === hari;
    }).length;
    if (n > maksHari) maksHari = n;
    barHari.push({ hari: hari, n: n, label: namaHari[new Date(hari + "T00:00:00").getDay()] });
  }
  $("ringkasanMinggu").innerHTML = "<h3>7 Hari Terakhir (" + fmtDate(mingguMula) + " – " + fmtDate(t) + ")</h3>" +
    "<p class=\"hint\">Kerja siap setiap hari. Jumlah: <b>" + mg.siap + " siap</b> daripada " + mg.jumlah + " kerja • Kos: <b>" + fmtRM(mg.kos) + "</b></p>" +
    "<div class=\"weekbars\">" + barHari.map(function (b) {
      var tinggi = maksHari ? Math.max(6, Math.round(b.n / maksHari * 64)) : 4;
      return "<div class=\"weekbar\"><span class=\"cnt\">" + b.n + "</span><div class=\"col" + (b.n === 0 ? " zero" : "") + "\" style=\"height:" + tinggi + "px\"></div><span class=\"day\">" + b.label + "</span><span class=\"day\">" + b.hari.slice(8) + "</span></div>";
    }).join("") + "</div>";
  /* Bar ikut kebun — bulan ini. */
  var perKebun = data.kebuns.map(function (kb) {
    var s = data.kerjas.filter(function (k) { return k.kebunId === kb.id && k.tarikhRancang.slice(0, 7) === bulan; });
    var siap = s.filter(function (k) { return k.status === "Siap"; });
    var kos = siap.reduce(function (a, k) { return a + (Number(k.kos) || 0); }, 0);
    var pct = s.length ? Math.round(siap.length / s.length * 100) : 0;
    return "<div class=\"barrow\"><div class=\"barhead\"><span>" + esc(kb.nama) + "</span><span>" + siap.length + "/" + s.length + " siap • " + fmtRM(kos) + "</span></div>" +
      "<div class=\"bartrack\"><div class=\"barfill\" style=\"width:" + pct + "%\"></div></div></div>";
  }).join("");
  $("ringkasanKebun").innerHTML = "<h3>Ikut Kebun — Bulan Ini</h3>" + (perKebun || emptyHtml("Belum ada kebun."));
  /* Bar bahan — 5 paling kerap, bulan ini. */
  var elBahan = $("ringkasanBahan");
  if (elBahan) {
    var kiraBahan = {};
    data.kerjas.filter(function (k) { return k.status === "Siap" && k.tarikhRancang.slice(0, 7) === bulan && k.bahan; }).forEach(function (k) {
      kiraBahan[k.bahan] = (kiraBahan[k.bahan] || 0) + 1;
    });
    var susun = Object.keys(kiraBahan).sort(function (a, b) { return kiraBahan[b] - kiraBahan[a]; }).slice(0, 5);
    var maksBahan = susun.length ? kiraBahan[susun[0]] : 0;
    elBahan.innerHTML = "<h3>Bahan Paling Kerap Digunakan — Bulan Ini</h3>" +
      (susun.length ? susun.map(function (n) {
        var pctB = maksBahan ? Math.round(kiraBahan[n] / maksBahan * 100) : 0;
        return "<div class=\"barrow\"><div class=\"barhead\"><span>" + esc(n) + "</span><span>" + kiraBahan[n] + " kali</span></div>" +
          "<div class=\"bartrack\"><div class=\"barfill gold\" style=\"width:" + pctB + "%\"></div></div></div>";
      }).join("") : "<p class=\"hint\">Belum ada kerja siap bulan ini.</p>");
  }
}
function renderAll() { refreshSelects(); refreshBahanSelect(); renderDashboard(); renderHariIni(); renderPeringatan(); renderSemuaKerja(); renderKebunBlok(); renderSejarah(); renderRingkasan(); renderNotifikasiStatus(); renderAkaunStatus(); try { if (typeof SB !== "undefined" && SB) SB.renderStatus(); } catch (e) {} tunjukOnboarding(); kemaskiniUiTetamu(); kemaskiniButangContoh(); renderPengumuman(); }

/* v3.6: butang "Padam Data Contoh Sahaja" hanya muncul bila masih ada
   data contoh (pengguna lama yang pernah muat contoh) — pengguna baharu
   tidak pernah nampaknya kerana tiada contoh dimuatkan lagi. */
function adaDataContoh() {
  return data.kebuns.some(function (k) { return k.contoh; }) ||
    data.bloks.some(function (k) { return k.contoh; }) ||
    data.kerjas.some(function (k) { return k.contoh; }) ||
    data.bahans.some(function (k) { return k.contoh; });
}
function kemaskiniButangContoh() {
  var b = $("deleteSampleBtn"); if (!b) return;
  b.hidden = !adaDataContoh();
}

/* ===== v3.6 — Mesej Pembangun (pengumuman) =====
   Jadual public.pengumuman (migrasi 003): pemilik tulis pengumuman
   melalui SQL Editor Supabase; aplikasi mengambil yang aktif (limit 5)
   bila daftar masuk dan ada config. Tetamu dan tanpa config dilangkau.
   Gagal (jadual belum wujud / tiada internet) adalah senyap — aplikasi
   tidak terjejas. Yang sudah dibaca tidak muncul lagi; yang baharu
   muncul pada pengambilan seterusnya. */
var PENG_KEY = "kebunku_pengumuman_v1";
function bacaPengumuman() {
  try { var v = localStorage.getItem(PENG_KEY); if (v) { var p = JSON.parse(v); if (p && Array.isArray(p.items) && Array.isArray(p.dibaca)) return p; } } catch (e) {}
  return { items: [], dibaca: [] };
}
function simpanPengumuman(p) { try { localStorage.setItem(PENG_KEY, JSON.stringify(p)); } catch (e) {} }
function muatPengumuman() {
  try {
    if (typeof SB === "undefined" || !SB) return;
    if (data.settings && data.settings.mod === "tetamu") return;
    var sesi = SB.sesi(); if (!sesi || !sesi.access_token) return;
    var cfg = SB.cfg(); if (!cfg.url || !cfg.anon) return;
    SB.tokenSah().then(function (token) {
      return SB.rest(token, "pengumuman", "GET", "?select=*&aktif=eq.true&order=tarikh.desc&limit=5");
    }).then(function (rows) {
      if (!Array.isArray(rows)) return;
      var s = bacaPengumuman();
      s.items = rows.map(function (r) {
        return { id: String(r.id || ""), tajuk: r.tajuk || "", mesej: r.mesej || "",
          jenis: r.jenis || "makluman", tarikh: r.tarikh || "" };
      }).filter(function (x) { return x.id && x.tajuk; });
      var idBaru = s.items.map(function (x) { return x.id; });
      s.dibaca = s.dibaca.filter(function (id) { return idBaru.indexOf(id) >= 0; });
      simpanPengumuman(s);
      renderPengumuman();
    }).catch(function () { /* senyap — jadual mungkin belum wujud */ });
  } catch (e) {}
}
function renderPengumuman() {
  var el = $("pengumumanList"); if (!el) return;
  var s = bacaPengumuman();
  var belum = s.items.filter(function (x) { return s.dibaca.indexOf(x.id) < 0; });
  el.innerHTML = "";
  if (!belum.length) return;
  belum.forEach(function (x) {
    var d = document.createElement("div");
    d.className = "card pengumuman";
    d.innerHTML = "<p class=\"section-label\">Mesej Pembangun</p>" +
      "<p class=\"title\" style=\"font-weight:800\">" + esc(x.tajuk) + "</p>" +
      "<p class=\"meta\">" + esc(x.mesej) + "</p>" +
      (x.tarikh ? "<p class=\"hint\">" + esc(fmtDate((x.tarikh || "").slice(0, 10))) + "</p>" : "") +
      "<button type=\"button\" class=\"btn secondary small\" data-dismiss-pengumuman=\"" + esc(x.id) + "\">Tanda Sudah Dibaca</button>";
    el.appendChild(d);
  });
}

/* ===== v3.6 — Push notifications (scaffolding) =====
   Hanya berjalan dalam APK (window.Capacitor wujud); di web ia tidak buat
   apa-apa. Semua di dalam try/catch supaya plugin yang tiada / FCM yang
   belum dikonfigurasi tidak pernah merosakkan aplikasi. Token FCM disimpan
   tempatan sahaja (kebunku_push_token_v1). Penghantaran sebenar memerlukan
   projek Firebase + google-services.json — lihat README (bahagian v3.6). */
var PUSH_TOKEN_KEY = "kebunku_push_token_v1";
function daftarPushNotifications() {
  try {
    if (typeof window === "undefined" || !window.Capacitor) return;
    var PN = window.Capacitor.Plugins && window.Capacitor.Plugins.PushNotifications;
    if (!PN) return;
    if (PN.addListener) {
      PN.addListener("registration", function (tok) {
        try { if (tok && tok.value) localStorage.setItem(PUSH_TOKEN_KEY, tok.value); } catch (e) {}
      });
      PN.addListener("registrationError", function () {});
      PN.addListener("pushNotificationReceived", function () {});
      PN.addListener("pushNotificationActionPerformed", function () {});
    }
    if (PN.checkPermissions && PN.requestPermissions && PN.register) {
      PN.checkPermissions().then(function (res) {
        if (res && res.receive === "granted") { PN.register().catch(function () {}); return; }
        PN.requestPermissions().then(function (r2) {
          if (r2 && r2.receive === "granted") PN.register().catch(function () {});
        }).catch(function () {});
      }).catch(function () {});
    }
  } catch (e) {}
}

/* ===== v3.5 — Dashboard, onboarding (tetamu vs daftar masuk), nama paparan ===== */
function salamWaktu() { var jam = new Date().getHours(); if (jam < 12) return "Selamat pagi"; if (jam < 15) return "Selamat tengah hari"; if (jam < 19) return "Selamat petang"; return "Selamat malam"; }
function namaPaparan() { return (data.settings && data.settings.namaPaparan) ? data.settings.namaPaparan.trim() : ""; }
function renderDashboard() {
  var el = $("dashboardSalam"); if (!el) return;
  var t = todayStr();
  var nama = namaPaparan();
  var tarikh = new Date().toLocaleDateString("ms-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  el.innerHTML = "<p class=\"salam-teks\">" + esc(salamWaktu()) + (nama ? ", " + esc(nama) : "") + "</p><p class=\"salam-tarikh\">" + esc(tarikh) + "</p>";
  var stat = $("dashboardStat"); if (!stat) return;
  var hariIni = data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang === t; }).length;
  var tertunggak = data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang < t; }).length;
  var siapHariIni = data.kerjas.filter(function (k) { return k.status === "Siap" && (k.tarikhSiap || k.tarikhRancang) === t; }).length;
  stat.innerHTML = "<div class=\"stat mini\"><p class=\"num\">" + hariIni + "</p><p class=\"lbl\">Kerja Hari Ini</p></div>" +
    "<div class=\"stat mini danger\"><p class=\"num\">" + tertunggak + "</p><p class=\"lbl\">Tertunggak</p></div>" +
    "<div class=\"stat mini\"><p class=\"num\">" + siapHariIni + "</p><p class=\"lbl\">Siap Hari Ini</p></div>";
}
/* Onboarding — hanya pada pemasangan baharu: tiada sesi DAN mod belum dipilih.
   Pengguna lama yang sudah daftar masuk tidak pernah nampaknya; pengguna dengan
   data tempatan tetapi tiada sesi dan tiada mod nampaknya sekali sehingga
   mereka memilih. */
var _onboardingDitutupSesi = false;
function perluOnboarding() {
  if (_onboardingDitutupSesi) return false;
  var sesi = null; try { sesi = SB.sesi(); } catch (e) {}
  return !sesi && !(data.settings && data.settings.mod);
}
function tunjukOnboarding() {
  var el = $("onboardingOverlay"); if (!el) return;
  el.hidden = !perluOnboarding();
}
function tutupOnboarding() { _onboardingDitutupSesi = true; var el = $("onboardingOverlay"); if (el) el.hidden = true; }
function pilihTetamu() {
  data.settings = data.settings || tetapanLalai(); data.settings.mod = "tetamu"; save();
  tutupOnboarding(); renderAll(); toast("Mod Tetamu — data hanya dalam telefon ini.");
}
/* Mod Tetamu dalam UI: Sync Sekarang dilumpuhkan dengan hint, suis sync
   automatik dilumpuhkan, dan kad Akaun menunjukkan butang daftar masuk. */
function kemaskiniUiTetamu() {
  var tetamu = !!(data.settings && data.settings.mod === "tetamu");
  var syncBtn = $("sbSyncBtn");
  if (syncBtn) syncBtn.disabled = tetamu;
  var hint = $("sbSyncHint");
  if (hint) { hint.hidden = !tetamu; if (tetamu) hint.textContent = "Daftar masuk untuk backup data anda ke cloud."; }
  var auto = $("sbAutoToggle");
  if (auto) auto.disabled = tetamu;
  var akaunTetamu = $("akaunTetamu");
  if (akaunTetamu) akaunTetamu.hidden = !tetamu;
}
/* Nama paparan — ditanya sekali selepas daftar masuk jika belum ada. */
function tunjukNamaModal() {
  var m = $("namaModal"); if (!m) return;
  var inp = $("namaPaparanInput"); if (inp) inp.value = namaPaparan();
  m.hidden = false;
}
function sembunyiNamaModal() { var m = $("namaModal"); if (m) m.hidden = true; }
function simpanNamaPaparan(nama, senyap) {
  nama = (nama || "").trim();
  data.settings = data.settings || tetapanLalai();
  data.settings.namaPaparan = nama; data.settings.namaDitanya = true; save();
  sembunyiNamaModal(); renderAll();
  var sesi = null; try { sesi = SB.sesi(); } catch (e) {}
  if (nama && sesi && sesi.access_token) {
    /* Best effort — kegagalan tidak menghalang simpanan tempatan. */
    SB.simpanNamaKeAkaun(nama).catch(function () {});
  }
  if (!senyap) toast(nama ? "Nama paparan disimpan." : "Nama paparan dikosongkan.");
}
/* Selepas daftar masuk: jika tiada nama paparan, cuba ambil daripada akaun
   (user_metadata.nama_paparan, atau full_name untuk Google); jika masih
   tiada, tunjuk prompt sekali sahaja (namaDitanya dicatat bila dilangkau
   atau disimpan, supaya tidak mengganggu setiap kali dibuka). */
function semakNamaPaparan() {
  var sesi = null; try { sesi = SB.sesi(); } catch (e) {}
  if (!sesi) return;
  if (namaPaparan()) return;
  SB.ambilProfil().then(function (pengguna) {
    var md = (pengguna && pengguna.user_metadata) || {};
    var nama = (md.nama_paparan || md.full_name || "").trim();
    if (nama) {
      data.settings = data.settings || tetapanLalai();
      data.settings.namaPaparan = nama; save(); renderAll(); return;
    }
    if (data.settings && data.settings.namaDitanya) return;
    tunjukNamaModal();
  }).catch(function () {
    if (data.settings && !data.settings.namaDitanya) tunjukNamaModal();
  });
}
/* Daftar masuk Google yang berjaya — web (hash) dan APK (deep link) berkongsi
   laluan ini: tandakan mod akaun, ambil nama daripada metadata jika ada,
   dan tunjuk prompt nama jika masih tiada. */
function selepasGoogleBerjaya(hasil) {
  data.settings = data.settings || tetapanLalai();
  data.settings.backend = "Supabase"; data.settings.mod = "akaun"; save(); renderAll();
  var md = (hasil && hasil.metadata) || {};
  var nama = (md.nama_paparan || md.full_name || "").trim();
  if (nama && !namaPaparan()) { data.settings.namaPaparan = nama; save(); renderAll(); }
  else { try { semakNamaPaparan(); } catch (e) {} }
  sbSetStatus("Daftar masuk Google berjaya sebagai " + ((hasil && hasil.email) || "") + ". Tekan Sync Sekarang untuk muat turun / hantar data.");
  toast("Daftar masuk Google berjaya sebagai " + ((hasil && hasil.email) || "") + ".");
  try { muatPengumuman(); } catch (e) {}
}
/* Dipanggil oleh listener AppUrlOpen (plugin App) dalam APK selepas Google
   memulangkan pengguna melalui deep link com.kebunku.app://login-callback. */
function selepasGoogleDeepLink(hasil) {
  if (!hasil) return;
  if (hasil.ok) { selepasGoogleBerjaya(hasil); sbJalankanSync(true); }
  else if (hasil.ralat) { sbSetStatus(hasil.ralat); toast(hasil.ralat); }
}

function setTab(name) {
  document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
  document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(function (b) { b.addEventListener("click", function () { setTab(b.dataset.tab); }); });

// Template pantas
JENIS_KERJA.forEach(function (j) {
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn secondary"; btn.innerHTML = "<img class=\"ticon\" src=\"assets/icons/" + iconKerja(j) + "\" alt=\"\">" + jenisLabel(j);
  btn.addEventListener("click", function () {
    $("kerjaJenis").value = j;
    $("kerjaTarikh").value = todayStr();
    $("kerjaStatus").value = "Dirancang";
    $("kerjaPeratus").value = "100"; syncPeratusStatus();
    $("kerjaId").value = "";
    setTab("kerja");
    toast("Borang pra-isi: " + jenisLabel(j) + ". Pilih kebun & blok, kemudian Simpan.");
  });
  $("templateButtons").appendChild(btn);
});

$("copyYesterdayBtn").addEventListener("click", function () {
  var semalam = addDays(todayStr(), -1);
  var semalamJobs = data.kerjas.filter(function (k) { return k.tarikhRancang === semalam; });
  if (!semalamJobs.length) { toast("Tiada kerja semalam untuk disalin."); return; }
  var disalin = 0;
  semalamJobs.forEach(function (k) {
    /* v3.6: jangan salin dua kali — langkau kerja yang sudah disalin hari ini. */
    var ada = data.kerjas.some(function (x) {
      return x.tarikhRancang === todayStr() && x.kebunId === k.kebunId && (x.blokId || "") === (k.blokId || "") &&
        x.jenis === k.jenis && (x.bahan || "") === (k.bahan || "") && (x.dos || "") === (k.dos || "");
    });
    if (ada) return;
    var salinan = Object.assign({}, k, { id: uid(), tarikhRancang: todayStr(), tarikhSiap: "", status: "Dirancang", peratus: 0, contoh: false, nextTarikh: "", nextPilihan: "", nextSyarat: "Tiada syarat", nextSyaratLain: "", nextTukarBahan: false, nextBahan: "", image: null, updatedAt: Date.now() });
    data.kerjas.push(salinan);
    disalin++;
  });
  save(); renderAll();
  toast(disalin ? disalin + " kerja semalam disalin ke hari ini." : "Kerja semalam sudah disalin ke hari ini.");
});

// Borang kebun / blok
$("kebunForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var nama = $("kebunNama").value.trim();
  if (!nama) return;
  data.kebuns.push({ id: uid(), nama: nama, contoh: false, updatedAt: Date.now() });
  $("kebunNama").value = ""; save(); renderAll(); toast("Kebun ditambah.");
});
$("blokForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var kebunId = $("blokKebun").value, nama = $("blokNama").value.trim(), tan = $("blokTanaman").value;
  if (!kebunId || !nama) { toast("Pilih kebun dan isi nama blok."); return; }
  data.bloks.push({ id: uid(), kebunId: kebunId, nama: nama, tanaman: tan, tanamanLain: $("blokTanamanLain").value.trim(), peringkat: $("blokPeringkat") ? $("blokPeringkat").value : "Semua Peringkat", contoh: false, updatedAt: Date.now() });
  $("blokNama").value = ""; $("blokTanamanLain").value = ""; save(); renderAll(); toast("Blok ditambah.");
});

/* Borang pustaka bahan (Kebun tab) */
$("bahanForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var nama = $("bahanNama").value.trim(), jenis = $("bahanJenis").value;
  if (!nama || !jenis) { toast("Isi nama bahan dan pilih jenis kerja."); return; }
  var ada = data.bahans.find(function (x) { return x.nama.toLowerCase() === nama.toLowerCase() && x.jenisKerja === jenis; });
  if (ada) { toast("Bahan ini sudah ada dalam pustaka untuk " + jenis + "."); return; }
  data.bahans.push({ id: uid(), nama: nama, jenisKerja: jenis, unitLalai: $("bahanUnit").value, dosLalai: ($("bahanDosLalai").value || "").trim(), nota: "", contoh: false, updatedAt: Date.now() });
  $("bahanNama").value = ""; $("bahanDosLalai").value = ""; save(); renderAll(); toast("Bahan ditambah ke pustaka.");
});

// Gambar kerja: maksimum 1, dimampatkan, tempatan sahaja
var gambarSemasa = null;
function setGambarInfo(teks) { var el = $("gambarInfo"); if (el) el.textContent = teks || ""; }
function paparGambarSemasa() {
  var img = $("gambarPreview"); if (!img) return;
  if (gambarSemasa) { img.src = gambarSemasa; img.hidden = false; } else { img.removeAttribute("src"); img.hidden = true; }
}
function buangGambar() {
  gambarSemasa = null; var inp = $("kerjaGambar"); if (inp) inp.value = ""; paparGambarSemasa(); setGambarInfo("Tiada gambar. Gambar adalah pilihan — maksimum 1 gambar setiap kerja.");
}
var _gInput = null;
function daftarGambarInput() {
  var inp = $("kerjaGambar"); if (!inp || inp === _gInput) return; _gInput = inp;
  inp.addEventListener("change", function () {
    var file = inp.files && inp.files[0]; if (!file) return;
    if (!file.type || file.type.indexOf("image/") !== 0) { setGambarInfo("Fail yang dipilih bukan gambar."); return; }
    var asalKB = Math.round(file.size / 1024);
    var url = URL.createObjectURL(file); var img = new Image();
    img.onload = function () {
      try {
        var maks = 1280; var w = img.width, h = img.height; var skala = Math.min(1, maks / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * skala)), ch = Math.max(1, Math.round(h * skala));
        var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
        cv.getContext("2d").drawImage(img, 0, 0, cw, ch);
        cv.toBlob(function (blob) {
          if (!blob) { setGambarInfo("Gagal memampatkan gambar."); return; }
          var r = new FileReader();
          r.onload = function () { gambarSemasa = r.result; paparGambarSemasa(); setGambarInfo("Asal: " + asalKB + " KB → Mampat: " + Math.round(blob.size / 1024) + " KB (JPEG, maks 1280px, kualiti 0.82). Memilih gambar baharu akan menggantikan gambar lama."); };
          r.readAsDataURL(blob);
        }, "image/jpeg", 0.82);
      } catch (e) { setGambarInfo("Gagal memampatkan gambar."); }
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { setGambarInfo("Gambar tidak dapat dibaca."); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
function toggleNextCustom() {
  var row = $("kerjaNextCustomRow"); if (row) row.hidden = ($("kerjaNext").value !== "Tarikh Custom");
  var rS = $("kerjaNextSyaratLainRow"); if (rS) rS.hidden = ($("kerjaNextSyarat").value !== "Lain-lain");
  var rB = $("kerjaNextBahanRow"); if (rB) rB.hidden = !$("kerjaNextTukar").checked;
}
/* Peratus siap hanya 50% atau 100% (pilihan siap). 0% bukan pilihan siap —
   ia hanya keadaan kerja yang belum mula (Dirancang / Tertangguh), jadi
   dropdown dikunci pada 0% selagi status itu dipilih. Status dan peratus
   diselaraskan dua hala supaya tidak bercanggah. */
function syncPeratusStatus() {
  var st = $("kerjaStatus").value, sel = $("kerjaPeratus");
  var opt0 = sel.querySelector('option[value="0"]');
  if (st === "Dirancang" || st === "Tertangguh") {
    if (opt0) opt0.hidden = false;
    sel.value = "0"; sel.disabled = true;
  } else {
    if (opt0) opt0.hidden = true;
    sel.disabled = false;
    if (st === "Siap") sel.value = "100";
    else if (st === "Siap Sebahagian" || st === "Dalam Proses") sel.value = "50";
  }
}
$("kerjaStatus").addEventListener("change", syncPeratusStatus);
$("kerjaPeratus").addEventListener("change", function () {
  var p = Number($("kerjaPeratus").value);
  if (p === 100) $("kerjaStatus").value = "Siap";
  else if (p === 50) $("kerjaStatus").value = "Siap Sebahagian";
});
// Borang kerja — dropdown bertingkat: Kebun -> Blok -> Jenis Kerja -> Bahan -> Dos
$("kerjaKebun").addEventListener("change", function () { refreshBlokSelects(); kemaskiniHintTerakhir(true); });
$("kerjaBlok").addEventListener("change", function () { kemaskiniHintTerakhir(true); });
$("kerjaJenis").addEventListener("change", function () { refreshBahanSelect(); kemaskiniHintTerakhir(true); });
$("kerjaBahan").addEventListener("change", function () {
  toggleBahanRow();
  var v = $("kerjaBahan").value;
  if (v && v.indexOf("__") !== 0 && !$("kerjaDosJumlah").value) isiDosDariBahan(v);
});
$("kerjaNextSyarat").addEventListener("change", toggleNextCustom);
$("kerjaNextTukar").addEventListener("change", toggleNextCustom);
var _gsb = $("kerjaGunaSemulaBtn"); if (_gsb) _gsb.addEventListener("click", function () { gunaSemulaTerakhir(false); });
/* v3.6 anti-spam simpan: bendera + butang dikunci semasa simpanan
   berjalan, supaya tekan berkali-kali tidak mencipta kerja berganda. */
var _simpanKerja = false;
$("kerjaForm").addEventListener("submit", function (e) {
  e.preventDefault();
  if (_simpanKerja) return;
  _simpanKerja = true;
  var _btnSimpan = $("kerjaSimpanBtn");
  if (_btnSimpan) _btnSimpan.disabled = true;
  var _btnPantas = document.querySelectorAll("#templateButtons button, #copyYesterdayBtn");
  _btnPantas.forEach(function (b) { b.disabled = true; });
  var selesaiSimpan = function (lewat) {
    /* Berjaya disimpan: kekalkan butang terkunci 1.5 saat lagi supaya
       tap berturut-turut (selepas borang di-reset) tidak mencipta kerja
       baharu — borang reset masih ada kebun/tarikh yang sah. Gagal
       validasi / duplikat: buka kunci serta-merta supaya pengguna boleh
       betulkan dan hantar semula. */
    if (lewat) {
      setTimeout(function () {
        _simpanKerja = false;
        if (_btnSimpan) _btnSimpan.disabled = false;
        _btnPantas.forEach(function (b) { b.disabled = false; });
      }, 1500);
      return;
    }
    _simpanKerja = false;
    if (_btnSimpan) _btnSimpan.disabled = false;
    _btnPantas.forEach(function (b) { b.disabled = false; });
  };
  var id = $("kerjaId").value;
  /* Status dan peratus sudah diselaraskan oleh syncPeratusStatus — di sini
     hanya dibaca semula supaya simpanan sentiasa konsisten. */
  var status = $("kerjaStatus").value;
  var peratus = Number($("kerjaPeratus").value) || 0;
  if (peratus === 100) status = "Siap";
  else if (peratus === 50 && status !== "Dalam Proses") status = "Siap Sebahagian";
  var pilihanNext = $("kerjaNext").value || "";
  var nextTarikh = nextTarikhFrom($("kerjaTarikh").value, pilihanNext, $("kerjaNextCustom").value);
  var nextSyarat = $("kerjaNextSyarat").value || "Tiada syarat";
  var nextSyaratLain = nextSyarat === "Lain-lain" ? ($("kerjaNextSyaratLain").value || "").trim() : "";
  var nextTukar = $("kerjaNextTukar").checked;
  var nextBahan = nextTukar ? ($("kerjaNextBahan").value || "").trim() : "";
  var bp = bahanTerpilih();
  var jenisKerja = $("kerjaJenis").value;
  var bahanNama = bp.nama, bahanId = bp.id;
  var dosJumlah = $("kerjaDosJumlah").value === "" ? "" : Number($("kerjaDosJumlah").value);
  var dosUnit = $("kerjaDosUnit").value, dosPer = $("kerjaDosPer").value;
  var dosStr = composeDos({ dosJumlah: dosJumlah, dosUnit: dosUnit, dosPer: dosPer, dos: "" });
  /* "Tambah bahan baharu…" — simpan sekali ke pustaka bahan. */
  if (bp.baru && bahanNama) {
    var adaB = data.bahans.find(function (x) { return x.nama.toLowerCase() === bahanNama.toLowerCase() && x.jenisKerja === jenisKerja; });
    if (adaB) bahanId = adaB.id;
    else {
      bahanId = uid();
      data.bahans.push({ id: bahanId, nama: bahanNama, jenisKerja: jenisKerja, unitLalai: dosUnit, dosLalai: dosStr, nota: "Ditambah semasa rekod kerja", contoh: false, updatedAt: Date.now() });
    }
  }
  var rec = {
    kebunId: $("kerjaKebun").value, blokId: $("kerjaBlok").value, zon: $("kerjaZon").value || "Semua Zon",
    jenis: jenisKerja, jenisLain: $("kerjaJenisLain").value.trim(),
    tarikhRancang: $("kerjaTarikh").value, status: status, peratus: peratus,
    bahan: bahanNama, bahanId: bahanId,
    dos: dosStr, dosJumlah: dosJumlah, dosUnit: dosUnit, dosPer: dosPer,
    kos: Number($("kerjaKos").value) || 0, nota: $("kerjaNota").value.trim(),
    tarikhSiap: status === "Siap" ? todayStr() : "", contoh: false,
    nextTarikh: nextTarikh, nextPilihan: pilihanNext,
    nextSyarat: nextSyarat, nextSyaratLain: nextSyaratLain,
    nextTukarBahan: nextTukar, nextBahan: nextBahan,
    image: gambarSemasa, updatedAt: Date.now()
  };
  if (!rec.kebunId || !rec.tarikhRancang) { toast("Lengkapkan kebun dan tarikh. Blok boleh dibiarkan 'Semua Blok'."); selesaiSimpan(); return; }
  if (pilihanNext === "Tarikh Custom" && !nextTarikh) { toast("Pilih tarikh custom untuk kerja seterusnya."); selesaiSimpan(); return; }
  if (nextTukar && !nextBahan) { toast("Anda tandakan 'Tukar bahan lain kali' — isi bahan yang akan digunakan lain kali."); selesaiSimpan(); return; }
  /* v3.6 idempotensi: kerja baharu yang sama (kebun, blok, jenis, bahan,
     dos, tarikh) dalam 60 saat terakhir disekat — elak spam bila butang
     Simpan ditekan berkali-kali. Ubah kerja sedia ada tidak disekat. */
  if (!id) {
    var kiniMs = Date.now();
    var duplikat = data.kerjas.some(function (x) {
      return x.kebunId === rec.kebunId && (x.blokId || "") === (rec.blokId || "") &&
        x.jenis === rec.jenis && (x.bahan || "") === (rec.bahan || "") &&
        (x.dos || "") === (rec.dos || "") && x.tarikhRancang === rec.tarikhRancang &&
        (Number(x.updatedAt) || 0) > kiniMs - 60000;
    });
    if (duplikat) { toast("Kerja ini sudah disimpan."); selesaiSimpan(); return; }
  }
  if (id) {
    var lama = data.kerjas.find(function (k) { return k.id === id; });
    if (lama) { Object.assign(lama, rec); if (lama.status === "Siap" && !lama.tarikhSiap) lama.tarikhSiap = todayStr(); }
    toast("Kerja dikemaskini.");
  } else {
    rec.id = uid(); data.kerjas.push(rec);
    if (nextTarikh) {
      var susulan = { id: uid(), kebunId: rec.kebunId, blokId: rec.blokId, zon: rec.zon,
        jenis: rec.jenis, jenisLain: rec.jenisLain,
        tarikhRancang: nextTarikh, tarikhSiap: "", status: "Dirancang", peratus: 0,
        bahan: rec.bahan, bahanId: rec.bahanId, dos: rec.dos,
        dosJumlah: rec.dosJumlah, dosUnit: rec.dosUnit, dosPer: rec.dosPer, kos: 0,
        nota: "Susulan automatik daripada kerja pada " + fmtDate(rec.tarikhRancang) + ".", contoh: false,
        nextTarikh: "", nextPilihan: "", nextSyarat: "Tiada syarat", nextSyaratLain: "",
        nextTukarBahan: false, nextBahan: "", image: null, updatedAt: Date.now() };
      if (nextSyarat && nextSyarat !== "Tiada syarat") susulan.nota += " Syarat: " + (nextSyarat === "Lain-lain" && nextSyaratLain ? nextSyaratLain : nextSyarat) + ".";
      if (nextTukar) {
        susulan.bahan = ""; susulan.bahanId = ""; susulan.dos = "";
        susulan.dosJumlah = ""; susulan.dosUnit = ""; susulan.dosPer = "";
        susulan.nota = "Tukar bahan: guna " + nextBahan + " — bukan " + (rec.bahan || "bahan lama") + ". Susulan daripada kerja pada " + fmtDate(rec.tarikhRancang) + ".";
      }
      /* v3.6: jangan cipta susulan berganda untuk tarikh/jenis yang sama. */
      var susulanAda = data.kerjas.some(function (x) {
        return x.kebunId === susulan.kebunId && (x.blokId || "") === (susulan.blokId || "") &&
          x.jenis === susulan.jenis && x.tarikhRancang === susulan.tarikhRancang &&
          x.status === "Dirancang" &&
          ((x.nota || "").indexOf("Susulan automatik") >= 0 || (x.nota || "").indexOf("Tukar bahan:") === 0);
      });
      if (!susulanAda) data.kerjas.push(susulan);
      toast("Kerja disimpan. Kerja susulan dijadualkan pada " + fmtDate(nextTarikh) + ".");
    } else { toast("Kerja disimpan."); }
  }
  $("kerjaId").value = ""; e.target.reset(); buangGambar(); $("kerjaTarikh").value = todayStr(); syncPeratusStatus(); toggleNextCustom();
  kerjaHad = 10;
  save(); renderAll(); selesaiSimpan(true);
});
$("kerjaResetBtn").addEventListener("click", function () {
  $("kerjaForm").reset(); buangGambar(); $("kerjaId").value = ""; $("kerjaTarikh").value = todayStr(); syncPeratusStatus(); toggleNextCustom(); refreshBlokSelects();
});

// Aksi pada kad kerja (event delegation)
document.addEventListener("click", function (e) {
  /* v3.6: tekan hari dalam kalendar Sejarah. */
  var kalHari = e.target.closest("[data-kal-hari]");
  if (kalHari) { sejarahHari = kalHari.dataset.kalHari; renderSejarah(); return; }
  /* v3.6: tanda mesej pembangun sudah dibaca. */
  var disP = e.target.closest("[data-dismiss-pengumuman]");
  if (disP) {
    var sp = bacaPengumuman();
    if (sp.dibaca.indexOf(disP.dataset.dismissPengumuman) < 0) sp.dibaca.push(disP.dataset.dismissPengumuman);
    simpanPengumuman(sp); renderPengumuman();
    return;
  }
  var btn = e.target.closest("[data-act]");
  if (btn) {
    var k = data.kerjas.find(function (x) { return x.id === btn.dataset.id; });
    if (!k) return;
    var act = btn.dataset.act;
    if (act === "siap") { k.status = "Siap"; k.peratus = 100; k.tarikhSiap = todayStr(); k.updatedAt = Date.now(); toast("Kerja ditandakan siap."); }
    if (act === "esok") { k.tarikhRancang = addDays(todayStr(), 1); k.updatedAt = Date.now(); if (k.status === "Siap") k.status = "Siap Sebahagian"; if (k.status !== "Siap Sebahagian" && k.peratus > 0) k.status = "Siap Sebahagian"; toast("Baki kerja dibawa ke esok."); }
    if (act === "lusa") { k.tarikhRancang = addDays(todayStr(), 2); k.updatedAt = Date.now(); if (k.peratus > 0 && k.status !== "Siap") k.status = "Siap Sebahagian"; toast("Baki kerja dibawa ke lusa."); }
    if (act === "pct") {
      var inp = document.querySelector('[data-pct="' + k.id + '"]');
      var p = inp ? (Number(inp.value) || 0) : 0;
      if (p !== 0 && p !== 50 && p !== 100) p = 50;
      k.peratus = p; k.updatedAt = Date.now();
      if (p === 100) { k.status = "Siap"; k.tarikhSiap = todayStr(); }
      else if (p === 50) k.status = "Siap Sebahagian";
      else if (k.status === "Siap") { k.status = "Siap Sebahagian"; k.tarikhSiap = ""; }
      toast("Peratus dikemaskini: " + p + "%.");
    }
    if (act === "ubah") {
      $("kerjaId").value = k.id; $("kerjaKebun").value = k.kebunId; refreshBlokSelects();
      $("kerjaBlok").value = k.blokId || ""; $("kerjaZon").value = k.zon || "Semua Zon";
      $("kerjaJenis").value = k.jenis; $("kerjaJenisLain").value = k.jenisLain || "";
      refreshBahanSelect();
      if (k.bahanId) { $("kerjaBahan").value = k.bahanId; }
      else if (k.bahan) {
        var bb = data.bahans.find(function (x) { return x.nama === k.bahan && x.jenisKerja === k.jenis; });
        if (bb) $("kerjaBahan").value = bb.id;
        else { $("kerjaBahan").value = "__LAIN__"; $("kerjaBahanLain").value = k.bahan; }
      } else { $("kerjaBahan").value = ""; }
      toggleBahanRow();
      $("kerjaTarikh").value = k.tarikhRancang; $("kerjaStatus").value = k.status; $("kerjaPeratus").value = (Number(k.peratus) || 0) > 0 && (Number(k.peratus) || 0) < 100 ? "50" : "100"; syncPeratusStatus();
      $("kerjaDosJumlah").value = (k.dosJumlah === "" || k.dosJumlah === null || k.dosJumlah === undefined) ? "" : k.dosJumlah;
      $("kerjaDosUnit").value = k.dosUnit || ""; $("kerjaDosPer").value = k.dosPer || "";
      $("kerjaKos").value = k.kos || ""; $("kerjaNota").value = k.nota || "";
      $("kerjaNext").value = k.nextPilihan || (k.nextTarikh ? "Tarikh Custom" : "");
      $("kerjaNextCustom").value = (k.nextPilihan === "Tarikh Custom") ? (k.nextTarikh || "") : "";
      $("kerjaNextSyarat").value = k.nextSyarat || "Tiada syarat";
      $("kerjaNextSyaratLain").value = k.nextSyaratLain || "";
      $("kerjaNextTukar").checked = !!k.nextTukarBahan;
      $("kerjaNextBahan").value = k.nextBahan || "";
      toggleNextCustom(); gambarSemasa = k.image || null; paparGambarSemasa();
      setGambarInfo(k.image ? "Gambar sedia ada (tempatan sahaja, maksimum 1). Pilih gambar baharu untuk menggantikannya." : "Tiada gambar. Gambar adalah pilihan — maksimum 1 gambar setiap kerja.");
      setTab("kerja"); window.scrollTo(0, 0); return;
    }
    if (act === "padam") {
      if (!confirm("Padam kerja ini?")) return;
      try { if (typeof SB !== "undefined" && SB) SB.catatPadam("kerjas", [k.id]); } catch (e) {}
      data.kerjas = data.kerjas.filter(function (x) { return x.id !== k.id; }); toast("Kerja dipadam.");
    }
    save(); renderAll(); return;
  }
  var delK = e.target.closest("[data-del-kebun]");
  if (delK) {
    if (!confirm("Padam kebun ini? Blok dan kerja di bawahnya juga akan dipadam.")) return;
    var kid = delK.dataset.delKebun;
    try { if (typeof SB !== "undefined" && SB) {
      SB.catatPadam("kebuns", [kid]);
      SB.catatPadam("bloks", data.bloks.filter(function (x) { return x.kebunId === kid; }).map(function (x) { return x.id; }));
      SB.catatPadam("kerjas", data.kerjas.filter(function (x) { return x.kebunId === kid; }).map(function (x) { return x.id; }));
    } } catch (e) {}
    data.kebuns = data.kebuns.filter(function (x) { return x.id !== kid; });
    data.bloks = data.bloks.filter(function (x) { return x.kebunId !== kid; });
    data.kerjas = data.kerjas.filter(function (x) { return x.kebunId !== kid; });
    save(); renderAll(); toast("Kebun dipadam.");
  }
  var delB = e.target.closest("[data-del-blok]");
  if (delB) {
    if (!confirm("Padam blok ini? Kerja di blok ini juga akan dipadam.")) return;
    var bid = delB.dataset.delBlok;
    try { if (typeof SB !== "undefined" && SB) {
      SB.catatPadam("bloks", [bid]);
      SB.catatPadam("kerjas", data.kerjas.filter(function (x) { return x.blokId === bid; }).map(function (x) { return x.id; }));
    } } catch (e) {}
    data.bloks = data.bloks.filter(function (x) { return x.id !== bid; });
    data.kerjas = data.kerjas.filter(function (x) { return x.blokId !== bid; });
    save(); renderAll(); toast("Blok dipadam.");
  }
  var delBh = e.target.closest("[data-del-bahan]");
  if (delBh) {
    if (!confirm("Padam bahan ini dari pustaka? Kerja lama yang sudah guna bahan ini tidak akan berubah.")) return;
    var bhid = delBh.dataset.delBahan;
    try { if (typeof SB !== "undefined" && SB) SB.catatPadam("bahans", [bhid]); } catch (e) {}
    data.bahans = data.bahans.filter(function (x) { return x.id !== bhid; });
    data.kerjas.forEach(function (x) { if (x.bahanId === bhid) x.bahanId = ""; });
    save(); renderAll(); toast("Bahan dipadam dari pustaka.");
  }
});

// Tapisan sejarah
["fKebun", "fBlok", "fTanaman", "fJenis", "fBahan", "fZon", "fCari", "fDari", "fHingga"].forEach(function (id) {
  $(id).addEventListener("input", function () { if (id === "fKebun") refreshBlokSelects(); sejarahHad = 20; renderSejarah(); });
});
/* v3.6: suis paparan Sejarah — Kalendar / Senarai. */
var _skb = $("sejarahKalendarBtn"); if (_skb) _skb.addEventListener("click", function () { sejarahMod = "kalendar"; renderSejarah(); });
var _ssb = $("sejarahSenaraiBtn"); if (_ssb) _ssb.addEventListener("click", function () { sejarahMod = "senarai"; renderSejarah(); });
$("fResetBtn").addEventListener("click", function () {
  ["fKebun", "fBlok", "fTanaman", "fJenis", "fBahan", "fZon", "fCari", "fDari", "fHingga"].forEach(function (id) { $(id).value = ""; });
  refreshBlokSelects(); renderSejarah();
});
$("qBtn").addEventListener("click", function () {
  var blokId = $("qBlok").value, jenis = $("qJenis").value;
  if (!blokId) { $("qResult").textContent = "Sila tambah blok dahulu."; return; }
  var siap = data.kerjas.filter(function (k) { return k.blokId === blokId && k.jenis === jenis && (k.status === "Siap" || k.status === "Siap Sebahagian"); })
    .sort(function (a, b) { var da = a.tarikhSiap || a.tarikhRancang, db = b.tarikhSiap || b.tarikhRancang; return da < db ? 1 : -1; });
  if (!siap.length) { $("qResult").textContent = "Belum ada rekod siap untuk " + jenis + " di " + blokNama(blokId) + "."; return; }
  var k = siap[0];
  $("qResult").textContent = "Terakhir: " + jenis + " di " + blokNama(blokId) + " pada " + fmtDate(k.tarikhSiap || k.tarikhRancang) + (k.bahan ? " — bahan: " + k.bahan : "") + ".";
});

// Eksport / Import / Padam
function muatTurunJSON(obj, nama) {
  var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nama; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
$("exportBtn").addEventListener("click", function () {
  muatTurunJSON(Sync.toCloudPayload(data), "kebunku-export-tanpa-gambar-" + todayStr() + ".json");
  toast("Eksport tanpa gambar dimuat turun.");
});
var _expFull = $("exportFullBtn");
if (_expFull) _expFull.addEventListener("click", function () {
  if (!confirm("Eksport penuh termasuk gambar — fail boleh jadi besar. Teruskan?")) return;
  muatTurunJSON(data, "kebunku-export-penuh-" + todayStr() + ".json");
  toast("Eksport penuh (termasuk gambar) dimuat turun.");
});
$("importFile").addEventListener("change", function (e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var d = JSON.parse(reader.result);
      if (!d || !Array.isArray(d.kebuns) || !Array.isArray(d.bloks) || !Array.isArray(d.kerjas)) throw new Error("format");
      if (!confirm("Import akan menggantikan semua data sekarang. Teruskan?")) return;
      data = normalData(d); save(); renderAll(); toast("Import berjaya.");
    } catch (err) { toast("Fail import tidak sah. Pastikan ia fail JSON eksport KebunKu."); }
  };
  reader.readAsText(file); e.target.value = "";
});
var _notiT = $("notiToggle");
if (_notiT) _notiT.addEventListener("change", function () {
  data.settings = data.settings || tetapanLalai(); data.settings.notifikasiHidup = _notiT.checked; save(); renderAll();
  if (_notiT.checked) semakNotifikasi();
  toast(_notiT.checked ? "Notifikasi dihidupkan." : "Notifikasi dimatikan.");
});
var _notiB = $("notiBenarkanBtn");
if (_notiB) _notiB.addEventListener("click", function () {
  if (typeof Notification === "undefined") { toast("Pelayar ini tidak menyokong notifikasi."); return; }
  Notification.requestPermission().then(function () { renderNotifikasiStatus(); semakNotifikasi(); });
});
$("deleteSampleBtn").addEventListener("click", function () {
  var ada = data.kebuns.some(function (k) { return k.contoh; }) || data.bloks.some(function (k) { return k.contoh; }) || data.kerjas.some(function (k) { return k.contoh; });
  if (!ada) { toast("Tiada data contoh lagi."); return; }
  if (!confirm("Padam semua data contoh sahaja? Data anda yang lain dikekalkan.")) return;
  try { if (typeof SB !== "undefined" && SB) {
    SB.catatPadam("kebuns", data.kebuns.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; }));
    SB.catatPadam("bloks", data.bloks.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; }));
    SB.catatPadam("kerjas", data.kerjas.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; }));
  } } catch (e) {}
  var kebunContoh = data.kebuns.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; });
  data.kebuns = data.kebuns.filter(function (k) { return !k.contoh; });
  data.bloks = data.bloks.filter(function (k) { return !k.contoh && kebunContoh.indexOf(k.kebunId) < 0; });
  data.kerjas = data.kerjas.filter(function (k) { return !k.contoh && kebunContoh.indexOf(k.kebunId) < 0; });
  save(); renderAll(); toast("Data contoh dipadam. Anda boleh mula dengan data kosong.");
});
$("deleteAllBtn").addEventListener("click", function () {
  if (!confirm("Padam SEMUA data? Tindakan ini tidak boleh dibatalkan. Eksport dahulu jika perlu.")) return;
  try { if (typeof SB !== "undefined" && SB) {
    SB.catatPadam("kebuns", data.kebuns.map(function (k) { return k.id; }));
    SB.catatPadam("bloks", data.bloks.map(function (k) { return k.id; }));
    SB.catatPadam("kerjas", data.kerjas.map(function (k) { return k.id; }));
    SB.catatPadam("bahans", data.bahans.map(function (k) { return k.id; }));
  } } catch (e) {}
  data = emptyData(); save(); renderAll(); toast("Semua data dipadam.");
});

/* ===== Supabase — butang dalam Ringkasan > Akaun & Sandaran ===== */
function sbSetStatus(teks) { var el = $("sbStatus"); if (el) el.textContent = teks; }
function sbJalankanSync(manual) {
  sbSetStatus("Sync sedang berjalan…");
  SB.syncPenuh(!manual).then(function (r) {
    data.settings = data.settings || tetapanLalai(); data.settings.backend = "Supabase"; save();
    renderAll();
    try { muatPengumuman(); } catch (e) {}
    sbSetStatus("Sync siap: " + r.dihantar + " dihantar, " + r.diterima + " diterima. Terakhir sync: " + new Date(SB.syncState().lastSyncAt).toLocaleString("ms-MY") + ".");
    toast("Sync siap: " + r.dihantar + " dihantar, " + r.diterima + " diterima.");
  }).catch(function (e) {
    var msg = (e && e.message) ? e.message : String(e);
    sbSetStatus("Sync gagal: " + msg + " — semak daftar masuk dan sambungan internet.");
    if (manual) toast("Sync gagal: " + msg);
    try { SB.renderStatus(); } catch (e2) {}
    /* Kekalkan mesej gagal di atas: renderStatus menulis semula status
       umum, jadi tulis semula mesej gagal selepas itu. */
    sbSetStatus("Sync gagal: " + msg + " — semak daftar masuk dan sambungan internet.");
  });
}
/* ===== Daftar masuk — langkah yang ditunjukkan (satu pada satu masa) ===== */
var sbLangkahSemasa = "utama";
var sbOtpEmailDaftar = "", sbOtpEmailLogin = "";
function sbTunjukLangkah(nama) {
  sbLangkahSemasa = nama;
  var peta = { utama: "sbStepUtama", otpdaftar: "sbStepOtpDaftar", otplogin: "sbStepOtpLogin" };
  ["sbStepUtama", "sbStepOtpDaftar", "sbStepOtpLogin"].forEach(function (id) {
    var el = $(id); if (el) el.hidden = (id !== peta[nama]);
  });
}
function sbEmailUtama() { return $("sbEmail") ? $("sbEmail").value.trim() : ""; }
function sbSelepasLogMasuk(kaedahLabel) {
  data.settings = data.settings || tetapanLalai(); data.settings.backend = "Supabase";
  /* v3.5: daftar masuk berjaya menamatkan onboarding — mod direkodkan supaya
     overlay pilihan tidak muncul lagi, dan tetamu lama yang daftar masuk akan
     sync data tempatannya ke cloud (last-updated-wins, seperti biasa). */
  data.settings.mod = "akaun"; save(); renderAll();
  sbSetStatus("Daftar masuk berjaya (" + kaedahLabel + "). Tekan Sync Sekarang untuk muat turun / hantar data.");
  toast("Daftar masuk berjaya.");
  try { semakNamaPaparan(); } catch (e) {}
  try { muatPengumuman(); } catch (e2) {}
}
/* Google — butang di atas kad Supabase. */
var _sbGoogle = $("sbGoogleBtn");
if (_sbGoogle) _sbGoogle.addEventListener("click", function () {
  try { SB.googleLogin(); } catch (e) { sbSetStatus("Daftar masuk Google gagal: " + (e.message || e)); }
});
/* Daftar baharu — laluan utama: OTP. Kod 6 digit dihantar ke email; hanya
   pemilik email yang ada kod itu boleh siapkan pendaftaran (anti-spam). */
var _sbDaftar = $("sbDaftarBtn");
if (_sbDaftar) _sbDaftar.addEventListener("click", function () {
  var email = sbEmailUtama();
  try {
    SB.hantarOtp(email, true).then(function () {
      sbOtpEmailDaftar = email;
      var info = $("sbOtpDaftarInfo"); if (info) info.textContent = "Kod 6 digit dihantar ke " + email + ". Semak inbox / spam.";
      sbTunjukLangkah("otpdaftar");
      SB.mulaCooldownOtp($("sbOtpHantarSemulaBtn"));
      sbSetStatus("Kod pengesahan dihantar ke " + email + ". Masukkan kod 6 digit dan cipta kata laluan.");
    }).catch(function (e) { sbSetStatus("Gagal hantar kod: " + (e.message || e)); toast("Gagal hantar kod: " + (e.message || e)); });
  } catch (e) { sbSetStatus("Gagal hantar kod: " + (e.message || e)); }
});
var _sbOtpSah = $("sbOtpSahkanBtn");
if (_sbOtpSah) _sbOtpSah.addEventListener("click", function () {
  var kod = $("sbOtpKod") ? $("sbOtpKod").value.trim() : "";
  var kata = $("sbOtpKata") ? $("sbOtpKata").value : "";
  if (!/^\d{6}$/.test(kod)) { sbSetStatus("Kod pengesahan mesti 6 digit nombor."); return; }
  if (!kata || kata.length < 6) { sbSetStatus("Kata laluan baharu mesti sekurang-kurangnya 6 aksara."); return; }
  SB.sahkanOtp(sbOtpEmailDaftar, kod, "signup").then(function (j) {
    var token = j.session ? j.session.access_token : "";
    /* Tetapkan kata laluan supaya akaun ini juga boleh daftar masuk dengan
       email + kata laluan kemudian. Jika langkah ini gagal, pendaftaran
       tetap sah — pengguna masih boleh daftar masuk dengan kod. */
    return SB.tetapKataLaluan(token, kata).catch(function (eKata) {
      toast("Daftar berjaya, tetapi kata laluan tidak dapat ditetapkan — guna Daftar Masuk dengan Kod buat masa ini.");
    }).then(function () { sbSelepasLogMasuk("Kod Pengesahan"); });
  }).catch(function (e) { sbSetStatus("Pengesahan gagal: " + (e.message || e)); toast("Pengesahan gagal: " + (e.message || e)); });
});
var _sbOtpSemula = $("sbOtpHantarSemulaBtn");
if (_sbOtpSemula) _sbOtpSemula.addEventListener("click", function () {
  SB.hantarOtp(sbOtpEmailDaftar, true).then(function () {
    SB.mulaCooldownOtp(_sbOtpSemula);
    sbSetStatus("Kod baharu dihantar ke " + sbOtpEmailDaftar + ".");
  }).catch(function (e) { sbSetStatus("Gagal hantar kod baharu: " + (e.message || e)); });
});
var _sbOtpTukar = $("sbOtpTukarEmailBtn");
if (_sbOtpTukar) _sbOtpTukar.addEventListener("click", function () { sbTunjukLangkah("utama"); });
/* Daftar cara lama (pautan email) — pautan kecil sahaja, untuk kes OTP
   tidak dapat digunakan (contoh: Email provider belum dihidupkan). */
var _sbDaftarLama = $("sbDaftarLamaBtn");
if (_sbDaftarLama) _sbDaftarLama.addEventListener("click", function () {
  try {
    SB.daftar().then(function (h) {
      if (h.perluSahkan) {
        sbSetStatus("Daftar berjaya — sila sahkan email anda dahulu (semak inbox) jika pengesahan email diperlukan, kemudian Daftar Masuk.");
        toast("Daftar berjaya. Sahkan email dahulu jika diminta, kemudian Daftar Masuk.");
      } else {
        sbSelepasLogMasuk("Email");
      }
    }).catch(function (e) { sbSetStatus("Daftar gagal: " + (e.message || e)); toast("Daftar gagal: " + (e.message || e)); });
  } catch (e) { sbSetStatus("Daftar gagal: " + (e.message || e)); }
});
/* Daftar masuk email + kata laluan — kekal seperti sebelum ini. */
var _sbLogin = $("sbLoginBtn");
if (_sbLogin) _sbLogin.addEventListener("click", function () {
  try {
    SB.logMasuk().then(function () {
      sbSelepasLogMasuk("Email");
    }).catch(function (e) { sbSetStatus("Daftar masuk gagal: " + (e.message || e)); toast("Daftar masuk gagal: " + (e.message || e)); });
  } catch (e) { sbSetStatus("Daftar masuk gagal: " + (e.message || e)); }
});
/* Daftar masuk dengan kod — email sedia ada, tanpa kata laluan. */
var _sbKodLogin = $("sbKodLoginBtn");
if (_sbKodLogin) _sbKodLogin.addEventListener("click", function () {
  var email = sbEmailUtama();
  try {
    SB.hantarOtp(email, false).then(function () {
      sbOtpEmailLogin = email;
      var info = $("sbOtpLoginInfo"); if (info) info.textContent = "Kod 6 digit dihantar ke " + email + ". Semak inbox / spam.";
      sbTunjukLangkah("otplogin");
      SB.mulaCooldownOtp($("sbOtpLoginHantarSemulaBtn"));
      sbSetStatus("Kod daftar masuk dihantar ke " + email + ".");
    }).catch(function (e) { sbSetStatus("Gagal hantar kod daftar masuk: " + (e.message || e) + " — cuba Daftar Masuk dengan kata laluan."); });
  } catch (e) { sbSetStatus("Gagal hantar kod daftar masuk: " + (e.message || e)); }
});
var _sbOtpLoginSah = $("sbOtpLoginSahkanBtn");
if (_sbOtpLoginSah) _sbOtpLoginSah.addEventListener("click", function () {
  var kod = $("sbOtpLoginKod") ? $("sbOtpLoginKod").value.trim() : "";
  if (!/^\d{6}$/.test(kod)) { sbSetStatus("Kod pengesahan mesti 6 digit nombor."); return; }
  SB.sahkanOtp(sbOtpEmailLogin, kod, "email").then(function () {
    sbSelepasLogMasuk("Kod Pengesahan");
  }).catch(function (e) { sbSetStatus("Daftar masuk dengan kod gagal: " + (e.message || e) + " — cuba Daftar Masuk dengan kata laluan."); });
});
var _sbOtpLoginSemula = $("sbOtpLoginHantarSemulaBtn");
if (_sbOtpLoginSemula) _sbOtpLoginSemula.addEventListener("click", function () {
  SB.hantarOtp(sbOtpEmailLogin, false).then(function () {
    SB.mulaCooldownOtp(_sbOtpLoginSemula);
    sbSetStatus("Kod baharu dihantar ke " + sbOtpEmailLogin + ".");
  }).catch(function (e) { sbSetStatus("Gagal hantar kod baharu: " + (e.message || e)); });
});
var _sbOtpLoginTukar = $("sbOtpLoginTukarEmailBtn");
if (_sbOtpLoginTukar) _sbOtpLoginTukar.addEventListener("click", function () { sbTunjukLangkah("utama"); });
var _sbLogout = $("sbLogoutBtn");
if (_sbLogout) _sbLogout.addEventListener("click", function () {
  SB.logKeluar().then(function () {
    /* v3.5: keluar memadam mod — pengguna kembali ke pilihan onboarding
       (Daftar Masuk atau Teruskan sebagai Tetamu) pada paparan seterusnya. */
    data.settings = data.settings || tetapanLalai(); data.settings.mod = ""; save();
    _onboardingDitutupSesi = false;
    renderAll(); toast("Keluar. Data tempatan dikekalkan; data awan tidak dipadam.");
  });
});
var _sbSync = $("sbSyncBtn");
if (_sbSync) _sbSync.addEventListener("click", function () { sbJalankanSync(true); });
var _sbAuto = $("sbAutoToggle");
if (_sbAuto) _sbAuto.addEventListener("change", function () {
  var st = SB.syncState(); st.autoSync = _sbAuto.checked; SB.simpanSyncState(st); renderAll();
  toast(_sbAuto.checked ? "Sync automatik dihidupkan." : "Sync automatik dimatikan.");
});
/* Butang ini hanya memadam SESI daftar masuk dari peranti ini. Tetapan
   aplikasi (fail config pemilik / tetapan peranti) TIDAK disentuh, dan
   data dalam akaun TIDAK dipadam. */
var _sbClear = $("sbClearBtn");
if (_sbClear) _sbClear.addEventListener("click", function () {
  if (!confirm("Keluar dan padam sesi dari peranti ini? Data dalam akaun anda TIDAK akan dipadam.")) return;
  SB.logKeluar().then(function () {
    var em = $("sbEmail"); if (em) em.value = ""; var pw = $("sbPassword"); if (pw) pw.value = "";
    data.settings = data.settings || tetapanLalai(); data.settings.mod = ""; save();
    _onboardingDitutupSesi = false;
    renderAll();
    sbSetStatus("Sesi sudah dipadam dari peranti ini. Daftar masuk semula untuk sync.");
    toast("Sesi dipadam dari peranti ini.");
  });
});

// Mula
$("todayLabel").textContent = fmtDate(todayStr());
$("kerjaTarikh").value = todayStr();
daftarGambarInput();
var _gb = $("gambarBuangBtn"); if (_gb) _gb.addEventListener("click", buangGambar);
var _kn = $("kerjaNext"); if (_kn) _kn.addEventListener("change", toggleNextCustom);
toggleNextCustom(); syncPeratusStatus(); setGambarInfo("Tiada gambar. Gambar adalah pilihan — maksimum 1 gambar setiap kerja.");
/* v3.5 — onboarding, nama paparan, mod tetamu. */
var _onbLogin = $("onbLoginBtn");
if (_onbLogin) _onbLogin.addEventListener("click", function () {
  tutupOnboarding();
  setTab("ringkasan");
  sbTunjukLangkah("utama");
  var em = $("sbEmail"); if (em) em.focus();
});
var _onbGuest = $("onbGuestBtn");
if (_onbGuest) _onbGuest.addEventListener("click", pilihTetamu);
var _guestLogin = $("akaunGuestLoginBtn");
if (_guestLogin) _guestLogin.addEventListener("click", function () {
  sbTunjukLangkah("utama");
  var em = $("sbEmail"); if (em) em.focus();
});
var _namaSimpan = $("namaSimpanBtn");
if (_namaSimpan) _namaSimpan.addEventListener("click", function () {
  simpanNamaPaparan($("namaPaparanInput") ? $("namaPaparanInput").value : "");
});
var _namaLangkau = $("namaLangkauBtn");
if (_namaLangkau) _namaLangkau.addEventListener("click", function () {
  data.settings = data.settings || tetapanLalai(); data.settings.namaDitanya = true; save();
  sembunyiNamaModal();
});
var _akaunNamaSimpan = $("akaunNamaSimpanBtn");
if (_akaunNamaSimpan) _akaunNamaSimpan.addEventListener("click", function () {
  simpanNamaPaparan($("akaunNamaPaparan") ? $("akaunNamaPaparan").value : "");
});
/* Mula: semak dahulu sama ada pelayar baru pulang daripada Google OAuth
   (token dalam hash URL). Jika ya, sesi Google disimpan dan hash dibersihkan
   sebelum paparan pertama; jika tidak, terus render seperti biasa. */
SB.kendaliOAuthCallback().then(function (hasil) {
  renderAll();
  try { muatPengumuman(); daftarPushNotifications(); } catch (e) {}
  if (hasil && hasil.ok) {
    selepasGoogleBerjaya(hasil);
    sbJalankanSync(true);
  } else if (hasil && hasil.ralat) {
    sbSetStatus(hasil.ralat);
  }
  semakNotifikasi();
}).catch(function (e) {
  renderAll();
  try { daftarPushNotifications(); } catch (e2) {}
  sbSetStatus("Daftar masuk Google gagal: " + (e.message || e));
  semakNotifikasi();
});
