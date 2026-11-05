"use strict";
/* KebunKu v3 — offline-first. Sync Supabase dilaksanakan melalui objek SB di
   bawah, terus dengan REST (Auth + PostgREST), tanpa CDN SDK, supaya aplikasi
   kekal berfungsi offline di dalam WebView. URL/key/sesi Supabase disimpan
   dalam kunci localStorage yang berasingan dan TIDAK pernah dimasukkan
   dalam eksport data utama. Gambar tidak pernah dihantar ke Supabase.
   v3 (dari log Excel sebenar pengguna): zon, bahan berstruktur (jumlah+unit+per),
   pustaka bahan, peringkat blok, syarat kerja seterusnya + tukar bahan. */
var KEY = "kebunku_data_v3";
var OLD_KEY = "kebunku_data_v2";
var OLD_KEY_V1 = "kebunku_data_v1";
var SEED_KEY = "kebunku_seeded_v1";
var JENIS_KERJA = ["Membaja", "Meracun Rumput", "Racun Kulat", "Racun Serangga", "Menuai", "Pruning", "Membersihkan", "Menanam", "Menyiram", "Lain-lain"];
var TANAMAN_LIST = ["Koko", "Sawit", "Durian", "Lada", "Sayur", "Lada & Sayur", "Lain-lain"];
var PERINGKAT_LIST = ["Bibit / Anak", "Matang", "Berbuah", "Semua Peringkat"];
var ZON_LIST = ["Semua Zon", "Atas", "Bawah", "Tengah", "Atas & Tengah", "Tengah & Bawah", "Atas & Bawah"];
var DOS_UNIT_LIST = ["g", "kg", "ml", "L", "sudu", "karung", "pek", "botol"];
var DOS_PER_LIST = ["", "/pokok", "/sprayer", "/kawasan", "/liter air"];
var SYARAT_LIST = ["Tiada syarat", "Jika belum mula berbuah", "Jika masih ada simptom", "Jika masih ada rumput", "Jika hujan / cuaca tidak mengizinkan", "Lain-lain"];
function dosPerLabel(p) { return p ? p : "Tiada"; }
function jenisLabel(j) { return j === "Pruning" ? "Pruning / Memangkas" : j; }

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

function tetapanLalai() { return { notifikasiHidup: true, backend: "belum disambung" }; }
function normalKerja(k) {
  var r = Object.assign({ nextTarikh: "", nextPilihan: "", image: null, updatedAt: 0, contoh: false,
    zon: "Semua Zon", bahanId: "", dosJumlah: "", dosUnit: "", dosPer: "",
    nextSyarat: "Tiada syarat", nextSyaratLain: "", nextTukarBahan: false, nextBahan: "" }, k || {});
  if (!r.nextTarikh) r.nextTarikh = "";
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
/* Pustaka bahan lalai — diambil daripada log Excel sebenar pengguna
   (ejaan dibetulkan: Imidacloprid, Metalaxyl) + contoh asal. */
function seedBahans() {
  var kini = Date.now();
  function b(nama, jenis, unit, dos, nota) { return { id: uid(), nama: nama, jenisKerja: jenis, unitLalai: unit, dosLalai: dos, nota: nota, contoh: false, updatedAt: kini }; }
  return [
    b("NPK 16-16-16", "Membaja", "g", "100g", "Lada & sayur"),
    b("NPK 12-12-17", "Membaja", "kg", "2kg/pokok", "Durian matang, koko"),
    b("NPK 8-9-30", "Membaja", "kg", "2kg/pokok", "Sawit"),
    b("Baja NPK 15-15-15", "Membaja", "g", "500g/pokok", "Contoh asal"),
    b("Imidacloprid", "Racun Serangga", "ml", "7ml", "Lada & sayur"),
    b("Halexyl", "Racun Serangga", "ml", "5ml/sprayer", "Durian matang"),
    b("Metalaxyl", "Racun Kulat", "g", "7g", "Lada & sayur, bibit durian"),
    b("Antracol", "Racun Kulat", "g", "70g/pokok", "Durian matang"),
    b("Monex", "Racun Rumput", "ml", "255ml/sprayer", "Sawit"),
    b("Glyphosate", "Racun Rumput", "ml", "", "Contoh asal")
  ];
}
function emptyData() { return { version: 3, kebuns: [], bloks: [], kerjas: [], bahans: [], settings: tetapanLalai() }; }
function normalData(d) {
  var r = { version: 3, kebuns: [], bloks: [], kerjas: [], bahans: [], settings: tetapanLalai() };
  if (!d) return r;
  if (Array.isArray(d.kebuns)) r.kebuns = d.kebuns;
  if (Array.isArray(d.bloks)) r.bloks = d.bloks.map(normalBlok);
  if (Array.isArray(d.kerjas)) r.kerjas = d.kerjas.map(normalKerja);
  /* Data lama (v1/v2) tiada bahans: isi pustaka lalai. Jika pengguna sudah
     ada pustaka (walaupun kosong kerana dipadam semua), hormati pilihannya. */
  if (Array.isArray(d.bahans)) r.bahans = d.bahans.map(normalBahan);
  else r.bahans = seedBahans();
  if (d.settings && typeof d.settings === "object") {
    if (typeof d.settings.notifikasiHidup === "boolean") r.settings.notifikasiHidup = d.settings.notifikasiHidup;
    if (typeof d.settings.backend === "string" && d.settings.backend) r.settings.backend = d.settings.backend;
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
      settings: { notifikasiHidup: x.settings.notifikasiHidup, backend: x.settings.backend }
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
  cfg: function () {
    var c = this._baca(SB_CFG_KEY, {});
    return { url: (c.url || "").replace(/\/+$/, ""), anon: c.anon || "" };
  },
  simpanCfg: function (url, anon) { this._tulis(SB_CFG_KEY, { url: (url || "").replace(/\/+$/, ""), anon: anon || "" }); },
  sesi: function () { return this._baca(SB_SES_KEY, null); },
  simpanSesi: function (s) { this._tulis(SB_SES_KEY, s); },
  clearSesi: function () { try { localStorage.removeItem(SB_SES_KEY); } catch (e) {} },
  clearCfgDanSesi: function () {
    try { localStorage.removeItem(SB_CFG_KEY); } catch (e) {}
    this.clearSesi();
  },
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
  bacaCfgDariBorang: function () {
    var url = $("sbUrl") ? $("sbUrl").value.trim() : "";
    var anon = $("sbAnon") ? $("sbAnon").value.trim() : "";
    return { url: url.replace(/\/+$/, ""), anon: anon };
  },
  sahkanCfg: function (cfg) {
    if (!cfg.url || cfg.url.indexOf("https://") !== 0) throw new Error("Supabase URL tidak sah. Masukkan URL penuh bermula dengan https://, contohnya https://abcxyz.supabase.co");
    if (!cfg.anon) throw new Error("Supabase Anon Key kosong. Salin anon public key dari Supabase > Project Settings > API.");
    return cfg;
  },
  authPanggil: function (cfg, laluan, badan) {
    return fetch(cfg.url + laluan, {
      method: "POST",
      headers: { "apikey": cfg.anon, "Content-Type": "application/json" },
      body: JSON.stringify(badan)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) {
        if (!res.ok) throw new Error(SB.ralat(j, "Gagal log masuk / daftar (kod " + res.status + "). Semak email, kata laluan, URL dan anon key."));
        return j;
      });
    });
  },
  daftar: function () {
    var cfg = this.sahkanCfg(this.bacaCfgDariBorang());
    var email = $("sbEmail") ? $("sbEmail").value.trim() : "";
    var kata = $("sbPassword") ? $("sbPassword").value : "";
    if (!email || !kata) throw new Error("Isi email dan kata laluan dahulu.");
    this.simpanCfg(cfg.url, cfg.anon);
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/signup", { email: email, password: kata }).then(function (j) {
      if (j.session && j.session.access_token) {
        self.simpanSesi({ access_token: j.session.access_token, refresh_token: j.session.refresh_token || "",
          user_id: (j.user && j.user.id) || (j.session.user && j.session.user.id) || "",
          email: email, expires_at: Date.now() + ((Number(j.session.expires_in) || 3600) * 1000) });
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
    this.simpanCfg(cfg.url, cfg.anon);
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/token?grant_type=password", { email: email, password: kata }).then(function (j) {
      if (!j.access_token) throw new Error("Log masuk gagal. Semak email dan kata laluan, dan pastikan email sudah disahkan jika Confirm Email dihidupkan dalam Supabase.");
      self.simpanSesi({ access_token: j.access_token, refresh_token: j.refresh_token || "",
        user_id: (j.user && j.user.id) || "", email: email,
        expires_at: Date.now() + ((Number(j.expires_in) || 3600) * 1000) });
      return true;
    });
  },
  segarToken: function () {
    var cfg = this.cfg(); var s = this.sesi();
    if (!cfg.url || !cfg.anon || !s || !s.refresh_token) return Promise.reject(new Error("Sesi tamat. Sila log masuk semula."));
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/token?grant_type=refresh_token", { refresh_token: s.refresh_token }).then(function (j) {
      if (!j.access_token) throw new Error("Sesi tamat. Sila log masuk semula.");
      self.simpanSesi({ access_token: j.access_token, refresh_token: j.refresh_token || s.refresh_token,
        user_id: (j.user && j.user.id) || s.user_id, email: s.email,
        expires_at: Date.now() + ((Number(j.expires_in) || 3600) * 1000) });
      return j.access_token;
    });
  },
  tokenSah: function () {
    var s = this.sesi();
    if (!s || !s.access_token) return Promise.reject(new Error("Anda belum log masuk ke Supabase. Masukkan URL/key, kemudian Log Masuk."));
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
        if (!res.ok) throw new Error(SB.ralat(j, "Supabase gagal (kod " + res.status + "). Semak URL/key, log masuk, dan pastikan fail SQL migrasi sudah dijalankan."));
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
    if (this.syncSedangBerjalan) return Promise.reject(new Error("Sync sedang berjalan. Sila tunggu."));
    this.syncSedangBerjalan = true;
    var state = this.syncState();
    var sesi = this.sesi();
    if (!sesi) { this.syncSedangBerjalan = false; return Promise.reject(new Error("Anda belum log masuk ke Supabase.")); }
    var uid = sesi.user_id;
    if (!uid) { this.syncSedangBerjalan = false; return Promise.reject(new Error("Sesi log masuk tidak lengkap (tiada user_id). Sila log keluar dan log masuk semula.")); }
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
  renderStatus: function () {
    var el = $("sbStatus"); if (!el) return;
    var cfg = this.cfg(); var s = this.sesi(); var st = this.syncState();
    if ($("sbUrl")) $("sbUrl").value = cfg.url;
    if ($("sbAnon")) $("sbAnon").value = cfg.anon;
    if ($("sbAutoToggle")) $("sbAutoToggle").checked = !!st.autoSync;
    if ($("sbEmail") && s && s.email) $("sbEmail").value = s.email;
    var akhir = st.lastSyncAt ? new Date(st.lastSyncAt).toLocaleString("ms-MY") : "belum pernah";
    if (s && s.email) {
      el.textContent = "Log masuk sebagai " + s.email + " • Terakhir sync: " + akhir +
        " • Sync automatik: " + (st.autoSync ? "HIDUP" : "MATI") + ".";
    } else if (cfg.url && cfg.anon) {
      el.textContent = "Belum log masuk — Supabase sudah dikonfigurasi. Masukkan email dan kata laluan, kemudian Daftar atau Log Masuk, kemudian Sync Sekarang.";
    } else {
      el.textContent = "Belum disambung. Masukkan Supabase URL dan anon key, kemudian Daftar atau Log Masuk.";
    }
  }
};

function seedData() {
  var t = todayStr();
  var kebunId = uid();
  var b1 = uid(), b2 = uid(), b3 = uid();
  return { version: 3, settings: tetapanLalai(),
    kebuns: [{ id: kebunId, nama: "Kebun Contoh", contoh: true }],
    bloks: [
      { id: b1, kebunId: kebunId, nama: "Blok 1", tanaman: "Koko", tanamanLain: "", peringkat: "Matang", contoh: true },
      { id: b2, kebunId: kebunId, nama: "Blok 2", tanaman: "Sawit", tanamanLain: "", peringkat: "Matang", contoh: true },
      { id: b3, kebunId: kebunId, nama: "Blok 3", tanaman: "Durian", tanamanLain: "", peringkat: "Matang", contoh: true }
    ],
    bahans: seedBahans(),
    kerjas: [
      { id: uid(), kebunId: kebunId, blokId: b1, jenis: "Membaja", jenisLain: "", tarikhRancang: t, tarikhSiap: "", status: "Dirancang", peratus: 0, bahan: "Baja NPK 15-15-15", dos: "500g sepokok", kos: 120, nota: "Contoh: Blok 1 hari ini", contoh: true },
      { id: uid(), kebunId: kebunId, blokId: b2, jenis: "Meracun Rumput", jenisLain: "", tarikhRancang: addDays(t, -1), tarikhSiap: "", status: "Tertangguh", peratus: 0, bahan: "Racun rumput", dos: "2 liter", kos: 80, nota: "Contoh: tertunggak dari semalam, dibawa ke hadapan", contoh: true },
      { id: uid(), kebunId: kebunId, blokId: b1, jenis: "Membaja", jenisLain: "", tarikhRancang: addDays(t, -7), tarikhSiap: addDays(t, -7), status: "Siap", peratus: 100, bahan: "Baja NPK 15-15-15", dos: "500g sepokok", kos: 115, nota: "Contoh: kerja siap minggu lepas", contoh: true },
      { id: uid(), kebunId: kebunId, blokId: b3, jenis: "Racun Kulat", jenisLain: "", tarikhRancang: addDays(t, 1), tarikhSiap: "", status: "Dirancang", peratus: 0, bahan: "Racun kulat", dos: "Ikut label", kos: 60, nota: "Contoh: dirancang esok", contoh: true }
    ]
  };
}

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
  if (!localStorage.getItem(SEED_KEY)) {
    localStorage.setItem(SEED_KEY, "1");
    var seeded = normalData(seedData());
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }
  return emptyData();
}
/* ===== CONTOH LOG LAMA — daripada fail Excel sebenar pengguna =====
   Fail itu mengandungi 13 rekod kerja (2010), bukan 17 — 20 baris fail
   termasuk tajuk dan baris kosong pemisah. Ejaan dibetulkan di sini
   (Imidacloprid, Metalaxyl), "baja" dinormalkan kepada "Membaja",
   dan "blok 1 / blok 1&2 / blok 1-2" disimpan dalam nota kerana ia
   skop blok, bukan zon. Kerja susulan TIDAK dicipta automatik untuk
   rekod lama ini — hanya nextTarikh/syarat direkodkan pada kerja Siap itu. */
var CONTOH_LOG_LAMA = [
  { tarikh: "2010-01-01", kumpulan: "Lada & Sayur", tanaman: "Lada & Sayur", peringkat: "Semua Peringkat", zon: "Semua Zon", bahagian: "", jenis: "Membaja", bahan: "NPK 16-16-16", dos: "100g", plan: "2 Bulan", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-01-03", kumpulan: "Lada & Sayur", tanaman: "Lada & Sayur", peringkat: "Semua Peringkat", zon: "Semua Zon", bahagian: "", jenis: "Racun Serangga", bahan: "Imidacloprid", dos: "7ml", plan: "2 Minggu", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-01-06", kumpulan: "Lada & Sayur", tanaman: "Lada & Sayur", peringkat: "Semua Peringkat", zon: "Semua Zon", bahagian: "", jenis: "Racun Kulat", bahan: "Metalaxyl", dos: "7sudu", plan: "2 Minggu", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-01-01", kumpulan: "Bibit Durian", tanaman: "Durian", peringkat: "Bibit / Anak", zon: "Semua Zon", bahagian: "", jenis: "Membaja", bahan: "NPK 16-16-16", dos: "200g/pokok", plan: "2 Bulan", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-01-09", kumpulan: "Bibit Durian", tanaman: "Durian", peringkat: "Bibit / Anak", zon: "Semua Zon", bahagian: "", jenis: "Racun Kulat", bahan: "Metalaxyl", dos: "7g", plan: "2 Bulan", syarat: "Tiada syarat", tukar: true, nextBahan: "Racun kulat lain" },
  { tarikh: "2010-04-01", kumpulan: "Durian Matang", tanaman: "Durian", peringkat: "Matang", zon: "Semua Zon", bahagian: "", jenis: "Membaja", bahan: "NPK 12-12-17", dos: "2kg/pokok", plan: "2 Bulan", syarat: "Jika belum mula berbuah", tukar: false, nextBahan: "" },
  { tarikh: "2010-04-12", kumpulan: "Durian Matang", tanaman: "Durian", peringkat: "Matang", zon: "Semua Zon", bahagian: "blok 1", jenis: "Racun Kulat", bahan: "Antracol", dos: "70g/pokok", plan: "3 Minggu", syarat: "Jika masih ada simptom", tukar: false, nextBahan: "" },
  { tarikh: "2010-04-15", kumpulan: "Durian Matang", tanaman: "Durian", peringkat: "Matang", zon: "Semua Zon", bahagian: "blok 1&2", jenis: "Racun Serangga", bahan: "Halexyl", dos: "5ml/sprayer", plan: "3 Minggu", syarat: "Jika masih ada simptom", tukar: false, nextBahan: "" },
  { tarikh: "2010-03-12", kumpulan: "Koko", tanaman: "Koko", peringkat: "Semua Peringkat", zon: "Semua Zon", bahagian: "", jenis: "Membaja", bahan: "NPK 12-12-17", dos: "1 karung semua kawasan", plan: "1 Bulan", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-04-15", kumpulan: "Koko", tanaman: "Koko", peringkat: "Semua Peringkat", zon: "Semua Zon", bahagian: "blok 1-2", jenis: "Racun Kulat", bahan: "Metalaxyl", dos: "40g/sprayer", plan: "1 Bulan", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-01-09", kumpulan: "Sawit", tanaman: "Sawit", peringkat: "Semua Peringkat", zon: "Atas", bahagian: "", jenis: "Membaja", bahan: "NPK 8-9-30", dos: "2kg/pokok", plan: "6 Bulan", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-01-19", kumpulan: "Sawit", tanaman: "Sawit", peringkat: "Semua Peringkat", zon: "Bawah", bahagian: "", jenis: "Membaja", bahan: "NPK 8-9-30", dos: "2kg/pokok", plan: "6 Bulan", syarat: "Tiada syarat", tukar: false, nextBahan: "" },
  { tarikh: "2010-08-27", kumpulan: "Sawit", tanaman: "Sawit", peringkat: "Semua Peringkat", zon: "Tengah & Bawah", bahagian: "", jenis: "Meracun Rumput", bahan: "Monex", dos: "255ml/sprayer", plan: "6 Bulan", syarat: "Tiada syarat", tukar: false, nextBahan: "" }
];
function cariBahanId(nama, jenis) {
  var b = data.bahans.find(function (x) { return x.nama === nama && (!jenis || x.jenisKerja === jenis); });
  return b ? b.id : "";
}
function muatContohLogLama() {
  if (data.kebuns.some(function (k) { return k.nama === "Kebun Contoh — Log Lama"; })) return { sudahAda: true, jumlah: 0 };
  var kebunId = uid();
  data.kebuns.push({ id: kebunId, nama: "Kebun Contoh — Log Lama", contoh: true, updatedAt: Date.now() });
  var blokMap = {};
  CONTOH_LOG_LAMA.forEach(function (r) {
    if (!blokMap[r.kumpulan]) {
      var bid = uid();
      blokMap[r.kumpulan] = bid;
      data.bloks.push({ id: bid, kebunId: kebunId, nama: r.kumpulan, tanaman: r.tanaman, tanamanLain: "", peringkat: r.peringkat, contoh: true, updatedAt: Date.now() });
    }
  });
  CONTOH_LOG_LAMA.forEach(function (r) {
    var p = parseDos(r.dos);
    var nota = "Contoh log lama (Excel).";
    if (r.bahagian) nota += " Bahagian kawasan asal: " + r.bahagian + ".";
    var nextTarikh = nextTarikhFrom(r.tarikh, r.plan, "");
    data.kerjas.push(normalKerja({ id: uid(), kebunId: kebunId, blokId: blokMap[r.kumpulan],
      jenis: r.jenis, jenisLain: "", tarikhRancang: r.tarikh, tarikhSiap: r.tarikh,
      status: "Siap", peratus: 100, bahan: r.bahan, bahanId: cariBahanId(r.bahan, r.jenis),
      dos: r.dos, dosJumlah: p.jumlah, dosUnit: p.unit, dosPer: p.per,
      kos: 0, nota: nota, zon: r.zon,
      nextTarikh: nextTarikh, nextPilihan: r.plan,
      nextSyarat: r.syarat, nextSyaratLain: "", nextTukarBahan: r.tukar, nextBahan: r.nextBahan,
      contoh: true, image: null, updatedAt: Date.now() }));
  });
  return { sudahAda: false, jumlah: CONTOH_LOG_LAMA.length };
}
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
function iconKerja(j) { var m = {"Membaja":"membaja.svg","Meracun Rumput":"meracun-rumput.svg","Racun Kulat":"racun-kulat.svg","Racun Serangga":"racun-serangga.svg","Menuai":"menuai.svg","Pruning":"pruning.svg","Membersihkan":"membersihkan.svg","Menanam":"menanam.svg","Menyiram":"menyiram.svg"}; return m[j] || "lain-kerja.svg"; }
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
  var opts = [{ value: "", label: "Pilih bahan…" }].concat(senarai.map(function (b) {
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
    "<div class=\"pctrow\"><label style=\"flex:0 0 auto\">Peratus:</label><input type=\"number\" min=\"0\" max=\"100\" value=\"" + (Number(k.peratus) || 0) + "\" data-pct=\"" + k.id + "\">" +
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
  var bk = $("backendPilihan"); if (bk) bk.value = (data.settings && data.settings.backend) || "belum disambung";
}
function renderAkaunStatus() {
  var el = $("akaunStatus"); if (!el) return;
  var bk = (data.settings && data.settings.backend) || "belum disambung";
  var sbSesi = null, sbCfgAda = false, sbAkhir = "belum pernah";
  try {
    if (typeof SB !== "undefined" && SB) {
      sbSesi = SB.sesi(); var c = SB.cfg(); sbCfgAda = !!(c.url && c.anon);
      var st = SB.syncState(); if (st.lastSyncAt) sbAkhir = new Date(st.lastSyncAt).toLocaleString("ms-MY");
    }
  } catch (e) {}
  if (sbSesi && sbSesi.email) {
    el.innerHTML = "<p><b>Status sandaran:</b> Supabase disambung dan anda log masuk sebagai " + esc(sbSesi.email) +
      ". Terakhir sync: " + esc(sbAkhir) + ". Data tanpa gambar di-sync ke akaun ini.</p>" +
      "<p><b>Retrieve selepas uninstall:</b> pada peranti baharu, masukkan Supabase URL/key yang sama, log masuk dengan email yang sama, dan tekan Sync Sekarang — kebun, blok dan kerja anda (tanpa gambar) akan dimuat turun semula.</p>" +
      "<p>Gambar pula disimpan tempatan sahaja dan <b>tidak</b> dihantar ke Supabase dalam versi ini (untuk jimat storan). Pada masa depan, gambar boleh dibackup ke Supabase Storage — itu langkah seterusnya, bukan sekarang.</p>";
  } else if (sbCfgAda) {
    el.innerHTML = "<p><b>Status sandaran:</b> Supabase sudah dikonfigurasi, tetapi anda belum log masuk. Data anda sekarang hanya dalam peranti ini + fail eksport JSON anda.</p>" +
      "<p><b>Untuk boleh retrieve selepas uninstall,</b> log masuk di bawah dengan email anda, kemudian tekan Sync Sekarang. Selepas sync pertama berjaya, data tanpa gambar akan tersimpan dalam akaun Supabase anda.</p>" +
      "<p>Gambar pula disimpan tempatan sahaja dan <b>tidak</b> termasuk dalam eksport JSON biasa atau sync Supabase (untuk jimat storan).</p>";
  } else {
    el.innerHTML = "<p><b>Status sandaran:</b> Data anda sekarang hanya dalam peranti ini + fail eksport JSON anda. " +
      "Jika aplikasi dinyahpasang tanpa eksport, data akan hilang.</p>" +
      "<p><b>Untuk boleh retrieve selepas uninstall,</b> sambungkan Supabase di bawah (pilihan backend yang direkod sekarang: " + esc(bk) + "). " +
      "Sehingga anda cipta projek Supabase, jalankan fail SQL migrasi, masukkan URL/key, dan log masuk, tiada sync berlaku.</p>" +
      "<p>Gambar pula disimpan tempatan sahaja dan <b>tidak</b> termasuk dalam eksport JSON biasa (untuk jimat storan). Pada masa depan, gambar boleh dibackup ke hosting — itu langkah seterusnya, bukan sekarang.</p>";
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
function renderSemuaKerja() {
  var el = $("semuaKerjaList");
  el.innerHTML = "";
  var list = data.kerjas.slice().sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? 1 : -1; });
  if (!list.length) { el.innerHTML = emptyHtml("Belum ada kerja. Tambah kerja pertama anda di atas."); return; }
  list.forEach(function (k) { el.appendChild(jobCard(k)); });
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
function renderSejarah() {
  var fKebun = $("fKebun").value, fBlok = $("fBlok").value, fTan = $("fTanaman").value, fJen = $("fJenis").value;
  var fBahan = $("fBahan") ? $("fBahan").value : "", fZon = $("fZon") ? $("fZon").value : "";
  var cari = ($("fCari").value || "").toLowerCase(), dari = $("fDari").value, hingga = $("fHingga").value;
  var list = data.kerjas.filter(function (k) {
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
  var el = $("sejarahList"); el.innerHTML = "";
  el.innerHTML = "<p class=\"hint\">" + list.length + " rekod dijumpai.</p>";
  if (!list.length) { el.innerHTML += emptyHtml("Tiada rekod menepati tapisan."); return; }
  list.forEach(function (k) { el.appendChild(jobCard(k)); });
}
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
  $("ringkasanMinggu").innerHTML = "<h3>7 Hari Terakhir (" + fmtDate(mingguMula) + " – " + fmtDate(t) + ")</h3><p>Siap: <b>" + mg.siap + "</b> • Belum siap: <b>" + mg.belum + "</b> • Jumlah: " + mg.jumlah + "<br>Kos kerja siap: <b>" + fmtRM(mg.kos) + "</b></p>";
  $("ringkasanBulan").innerHTML = "<h3>Bulan Ini (" + bulan + ")</h3><p>Siap: <b>" + bl.siap + "</b> • Belum siap: <b>" + bl.belum + "</b> • Jumlah: " + bl.jumlah + "<br>Kos kerja siap: <b>" + fmtRM(bl.kos) + "</b></p>";
  var perKebun = data.kebuns.map(function (kb) {
    var s = data.kerjas.filter(function (k) { return k.kebunId === kb.id && k.tarikhRancang.slice(0, 7) === bulan; });
    var siap = s.filter(function (k) { return k.status === "Siap"; });
    var kos = siap.reduce(function (a, k) { return a + (Number(k.kos) || 0); }, 0);
    return "<p>" + esc(kb.nama) + ": siap " + siap.length + ", belum siap " + (s.length - siap.length) + ", kos siap " + fmtRM(kos) + "</p>";
  }).join("");
  $("ringkasanKebun").innerHTML = "<h3>Ikut Kebun — Bulan Ini</h3>" + (perKebun || emptyHtml("Belum ada kebun."));
  var elBahan = $("ringkasanBahan");
  if (elBahan) {
    var kiraBahan = {};
    data.kerjas.filter(function (k) { return k.status === "Siap" && k.tarikhRancang.slice(0, 7) === bulan && k.bahan; }).forEach(function (k) {
      kiraBahan[k.bahan] = (kiraBahan[k.bahan] || 0) + 1;
    });
    var susun = Object.keys(kiraBahan).sort(function (a, b) { return kiraBahan[b] - kiraBahan[a]; }).slice(0, 5);
    elBahan.innerHTML = "<h3>Bahan Paling Kerap Digunakan — Bulan Ini</h3>" +
      (susun.length ? susun.map(function (n) { return "<p>" + esc(n) + ": <b>" + kiraBahan[n] + " kali</b></p>"; }).join("") : "<p class=\"hint\">Belum ada kerja siap bulan ini.</p>");
  }
}
function renderAll() { refreshSelects(); refreshBahanSelect(); renderHariIni(); renderPeringatan(); renderSemuaKerja(); renderKebunBlok(); renderSejarah(); renderRingkasan(); renderNotifikasiStatus(); renderAkaunStatus(); try { if (typeof SB !== "undefined" && SB) SB.renderStatus(); } catch (e) {} }

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
    $("kerjaPeratus").value = 0;
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
  semalamJobs.forEach(function (k) {
    var salinan = Object.assign({}, k, { id: uid(), tarikhRancang: todayStr(), tarikhSiap: "", status: "Dirancang", peratus: 0, contoh: false, nextTarikh: "", nextPilihan: "", nextSyarat: "Tiada syarat", nextSyaratLain: "", nextTukarBahan: false, nextBahan: "", image: null, updatedAt: Date.now() });
    data.kerjas.push(salinan);
  });
  save(); renderAll();
  toast(semalamJobs.length + " kerja semalam disalin ke hari ini.");
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
$("kerjaForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var id = $("kerjaId").value;
  var peratus = Math.max(0, Math.min(100, Number($("kerjaPeratus").value) || 0));
  var status = $("kerjaStatus").value;
  if (peratus === 100) status = "Siap";
  else if (peratus > 0 && status === "Dirancang") status = "Siap Sebahagian";
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
  if (!rec.kebunId || !rec.tarikhRancang) { toast("Lengkapkan kebun dan tarikh. Blok boleh dibiarkan 'Semua Blok'."); return; }
  if (pilihanNext === "Tarikh Custom" && !nextTarikh) { toast("Pilih tarikh custom untuk kerja seterusnya."); return; }
  if (nextTukar && !nextBahan) { toast("Anda tandakan 'Tukar bahan lain kali' — isi bahan yang akan digunakan lain kali."); return; }
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
      data.kerjas.push(susulan);
      toast("Kerja disimpan. Kerja susulan dijadualkan pada " + fmtDate(nextTarikh) + ".");
    } else { toast("Kerja disimpan."); }
  }
  $("kerjaId").value = ""; e.target.reset(); buangGambar(); $("kerjaTarikh").value = todayStr(); $("kerjaPeratus").value = 0; toggleNextCustom();
  save(); renderAll();
});
$("kerjaResetBtn").addEventListener("click", function () {
  $("kerjaForm").reset(); buangGambar(); $("kerjaId").value = ""; $("kerjaTarikh").value = todayStr(); $("kerjaPeratus").value = 0; toggleNextCustom(); refreshBlokSelects();
});

// Aksi pada kad kerja (event delegation)
document.addEventListener("click", function (e) {
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
      var p = inp ? Math.max(0, Math.min(100, Number(inp.value) || 0)) : 0;
      k.peratus = p; k.updatedAt = Date.now();
      if (p === 100) { k.status = "Siap"; k.tarikhSiap = todayStr(); }
      else if (p > 0) k.status = "Siap Sebahagian";
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
      $("kerjaTarikh").value = k.tarikhRancang; $("kerjaStatus").value = k.status; $("kerjaPeratus").value = k.peratus;
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
  $(id).addEventListener("input", function () { if (id === "fKebun") refreshBlokSelects(); renderSejarah(); });
});
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
var _bk = $("backendPilihan");
if (_bk) _bk.addEventListener("change", function () {
  data.settings = data.settings || tetapanLalai(); data.settings.backend = _bk.value; save(); renderAkaunStatus();
  toast("Pilihan backend direkod (belum disambung): " + _bk.value);
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
    sbSetStatus("Sync siap: " + r.dihantar + " dihantar, " + r.diterima + " diterima. Terakhir sync: " + new Date(SB.syncState().lastSyncAt).toLocaleString("ms-MY") + ".");
    toast("Sync siap: " + r.dihantar + " dihantar, " + r.diterima + " diterima.");
  }).catch(function (e) {
    var msg = (e && e.message) ? e.message : String(e);
    sbSetStatus("Sync gagal: " + msg + " — semak URL/key, log masuk, dan sambungan internet.");
    if (manual) toast("Sync gagal: " + msg);
    try { SB.renderStatus(); } catch (e2) {}
    /* Kekalkan mesej gagal di atas: renderStatus menulis semula status
       umum, jadi tulis semula mesej gagal selepas itu. */
    sbSetStatus("Sync gagal: " + msg + " — semak URL/key, log masuk, dan sambungan internet.");
  });
}
var _sbDaftar = $("sbDaftarBtn");
if (_sbDaftar) _sbDaftar.addEventListener("click", function () {
  try {
    SB.daftar().then(function (h) {
      if (h.perluSahkan) {
        sbSetStatus("Daftar berjaya — sila sahkan email anda dahulu (semak inbox) jika Confirm Email dihidupkan dalam Supabase, kemudian Log Masuk.");
        toast("Daftar berjaya. Sahkan email dahulu jika diminta, kemudian Log Masuk.");
      } else {
        data.settings = data.settings || tetapanLalai(); data.settings.backend = "Supabase"; save(); renderAll();
        sbSetStatus("Daftar dan log masuk berjaya. Tekan Sync Sekarang untuk sync pertama.");
        toast("Daftar berjaya.");
      }
    }).catch(function (e) { sbSetStatus("Daftar gagal: " + (e.message || e)); toast("Daftar gagal: " + (e.message || e)); });
  } catch (e) { sbSetStatus("Daftar gagal: " + (e.message || e)); }
});
var _sbLogin = $("sbLoginBtn");
if (_sbLogin) _sbLogin.addEventListener("click", function () {
  try {
    SB.logMasuk().then(function () {
      data.settings = data.settings || tetapanLalai(); data.settings.backend = "Supabase"; save(); renderAll();
      sbSetStatus("Log masuk berjaya. Tekan Sync Sekarang untuk muat turun / hantar data.");
      toast("Log masuk berjaya.");
    }).catch(function (e) { sbSetStatus("Log masuk gagal: " + (e.message || e)); toast("Log masuk gagal: " + (e.message || e)); });
  } catch (e) { sbSetStatus("Log masuk gagal: " + (e.message || e)); }
});
var _sbLogout = $("sbLogoutBtn");
if (_sbLogout) _sbLogout.addEventListener("click", function () {
  SB.logKeluar().then(function () { renderAll(); toast("Log keluar. Data tempatan dikekalkan; data awan tidak dipadam."); });
});
var _sbSync = $("sbSyncBtn");
if (_sbSync) _sbSync.addEventListener("click", function () { sbJalankanSync(true); });
var _sbAuto = $("sbAutoToggle");
if (_sbAuto) _sbAuto.addEventListener("change", function () {
  var st = SB.syncState(); st.autoSync = _sbAuto.checked; SB.simpanSyncState(st); renderAll();
  toast(_sbAuto.checked ? "Sync automatik dihidupkan." : "Sync automatik dimatikan.");
});
var _sbAnonT = $("sbAnonToggle");
if (_sbAnonT) _sbAnonT.addEventListener("click", function () {
  var inp = $("sbAnon"); if (!inp) return;
  inp.type = (inp.type === "password") ? "text" : "password";
});
var _sbClear = $("sbClearBtn");
if (_sbClear) _sbClear.addEventListener("click", function () {
  if (!confirm("Padam tetapan Supabase dari peranti ini? URL, anon key dan sesi log masuk akan dipadam dari peranti ini sahaja. Data dalam Supabase TIDAK akan dipadam.")) return;
  SB.clearCfgDanSesi();
  data.settings = data.settings || tetapanLalai(); data.settings.backend = "belum disambung"; save(); renderAll();
  var u = $("sbUrl"); if (u) u.value = ""; var a = $("sbAnon"); if (a) a.value = "";
  var em = $("sbEmail"); if (em) em.value = ""; var pw = $("sbPassword"); if (pw) pw.value = "";
  sbSetStatus("Belum disambung. Tetapan Supabase sudah dipadam dari peranti ini.");
  toast("Tetapan Supabase dipadam dari peranti ini.");
});

// Mula
$("todayLabel").textContent = fmtDate(todayStr());
$("kerjaTarikh").value = todayStr();
daftarGambarInput();
var _gb = $("gambarBuangBtn"); if (_gb) _gb.addEventListener("click", buangGambar);
var _impC = $("importContohBtn");
if (_impC) _impC.addEventListener("click", function () {
  var r = muatContohLogLama();
  if (r.sudahAda) { toast("Contoh log lama sudah dimuatkan sebelum ini."); return; }
  save(); renderAll();
  toast("Contoh log lama dimuatkan: " + r.jumlah + " rekod (2010) dalam Kebun Contoh — Log Lama. Gunakan 'Padam Data Contoh Sahaja' untuk membuangnya.");
});
var _kn = $("kerjaNext"); if (_kn) _kn.addEventListener("change", toggleNextCustom);
toggleNextCustom(); setGambarInfo("Tiada gambar. Gambar adalah pilihan — maksimum 1 gambar setiap kerja.");
renderAll();
semakNotifikasi();
