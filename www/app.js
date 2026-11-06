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
/* ===== v3.9 — Gambar kerja DIMATIKAN buat sementara =====
   Tiada hosting gambar sendiri lagi, jadi semua UI gambar disembunyikan
   (input dalam borang Kerja + thumbnail pada kad kerja). Data gambar lama
   yang tersimpan dalam medan `image` TIDAK dipadam — untuk hidupkan semula:
   tukar bendera ini kepada false dan buang atribut `hidden` pada elemen
   gambar dalam www/index.html. Sync Supabase memang sudah membuang gambar. */
var GAMBAR_DIMATIKAN = true;
function dalamCapacitor() { return !!(typeof window !== "undefined" && window.Capacitor); }
var SYARAT_LIST = ["Tiada syarat", "Jika belum mula berbuah", "Jika masih ada simptom", "Jika masih ada rumput", "Jika hujan / cuaca tidak mengizinkan", "Lain-lain"];
function dosPerLabel(p) { if (!p) return t("misc.tiada"); var v = t("per." + p); return v || p; }
/* "Membersihkan" ialah nama lama untuk kerja ini — dipaparkan dan
   dinormalkan kepada "Potong Rumput" supaya rekod lama tidak hilang. */
function jenisLabel(j) {
  if (j === "Membersihkan") j = "Potong Rumput";
  var v = t("jenis." + j);
  return v || j;
}
/* ===== v3.8 — Bahasa (i18n) =====
   Kamus dalam www/i18n.js (dimuat sebelum app.js). t(kunci) membaca
   window.__bahasa ("ms" lalai, ditetapkan oleh terapkanBahasa()).
   Data pengguna (nama kebun/blok/bahan, nota, nama paparan) TIDAK
   diterjemahkan — hanya chrome aplikasi. Nilai kanonikal yang disimpan
   (cth. status "Siap", jenis "Membaja") kekal Bahasa Malaysia; hanya
   paparan diterjemahkan melalui *Label() di bawah. */
function bahasaSemasa() { return (typeof data !== "undefined" && data && data.settings && (data.settings.bahasa === "ms" || data.settings.bahasa === "en")) ? data.settings.bahasa : "ms"; }
function localeSemasa() { return bahasaSemasa() === "en" ? "en-GB" : "ms-MY"; }
function statusLabel(s) { var v = t("status." + s); return v || s; }
function zonLabel(z) { var v = t("zon." + z); return v || z; }
function tanamanLabel(x) { var v = t("tanaman." + x); return v || x; }
function peringkatLabel(p) { var v = t("peringkat." + p); return v || p; }
function syaratLabel(s) { var v = t("syarat." + s); return v || s; }
function bulanNama(i) { var v = t("bulan." + i); return v || ""; }
function hariPendek(i) { var v = t("hari." + i); return v || ""; }
function terapkanBahasa() {
  var lang = bahasaSemasa();
  window.__bahasa = lang;
  try { document.documentElement.lang = lang; } catch (e) {}
  try { document.title = t("app.title"); } catch (e) {}
  document.querySelectorAll("[data-i18n]").forEach(function (el) { var v = t(el.getAttribute("data-i18n")); if (v) el.textContent = v; });
  document.querySelectorAll("[data-i18n-ph]").forEach(function (el) { var v = t(el.getAttribute("data-i18n-ph")); if (v) el.setAttribute("placeholder", v); });
  /* Butang Rekod Pantas dicipta sekali semasa muat — labelnya perlu
     dikemaskini di sini (renderAll tidak menciptanya semula). */
  var tb = document.querySelectorAll("#templateButtons button");
  tb.forEach(function (b, i) { var j = JENIS_KERJA[i]; if (j) b.innerHTML = "<img class=\"ticon\" src=\"assets/icons/" + iconKerja(j) + "\" alt=\"\">" + jenisLabel(j); });
  var fs = $("footerUtama"); if (fs) fs.textContent = t("footer.utama");
  var sel = $("bahasaSelect"); if (sel) sel.value = lang;
  renderAll();
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

function tetapanLalai() { return { notifikasiHidup: true, backend: "belum disambung", mod: "", namaPaparan: "", namaDitanya: false, bahasa: "ms", notifikasiDiminta: false, notifIzin: "" }; }
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
    if (d.settings.bahasa === "ms" || d.settings.bahasa === "en") r.settings.bahasa = d.settings.bahasa;
    if (typeof d.settings.notifikasiDiminta === "boolean") r.settings.notifikasiDiminta = d.settings.notifikasiDiminta;
    if (typeof d.settings.notifIzin === "string") r.settings.notifIzin = d.settings.notifIzin;
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
    if (!cfg.url || cfg.url.indexOf("https://") !== 0 || !cfg.anon) throw new Error(t("sb.tiadaConfig"));
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
        if (!res.ok) throw new Error(SB.ralat(j, t("sb.gagalAuth", { kod: res.status })));
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
    if (!ses || !ses.access_token) throw new Error(t("sb.tiadaSesi"));
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
    if (!email || email.indexOf("@") < 1) throw new Error(t("sb.emailSah"));
    return this.authPanggil(cfg, "/auth/v1/otp", { email: email, create_user: !!createUser });
  },
  sahkanOtp: function (email, kod, jenis) {
    var cfg = this.sahkanCfg(this.bacaCfgDariBorang());
    if (!/^\d{6}$/.test(kod || "")) throw new Error(t("sb.kod6"));
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
    if (/expired|invalid/i.test(m) && /token|kod/i.test(m)) return t("sb.otpTamat");
    if (/Token has expired|invalid/i.test(m)) return t("sb.otpTamat");
    if (/rate limit|too many/i.test(m)) return t("sb.otpKerap");
    if (/already registered|already exists/i.test(m)) return t("sb.otpAda");
    if (/not found|user not found/i.test(m)) return t("sb.otpTiada");
    if (/email.*not confirmed|not confirmed/i.test(m)) return t("sb.otpBelumSah");
    return m || t("sb.otpGagal");
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
    btn.textContent = t("sb.hantarSemulaSaat", { n: baki });
    this._otpTimer = setInterval(function () {
      baki--;
      if (baki <= 0) {
        clearInterval(self._otpTimer); self._otpTimer = null;
        btn.disabled = false; btn.textContent = t("akaun.hantarSemula");
      } else {
        btn.textContent = t("sb.hantarSemulaSaat", { n: baki });
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
      if (ralat) return Promise.resolve({ ralat: /access_denied/i.test(ralat) ? t("sb.googleBatal") : t("sb.googleGagal", { e: ralat }) });
    } catch (e) { return Promise.resolve({ ralat: t("sb.googlePautan") }); }
    if (!token) return Promise.resolve(null);
    var cfg;
    try { cfg = this.sahkanCfg(this.cfg()); } catch (e2) { return Promise.resolve({ ralat: t("sb.googleTiadaConfig") }); }
    return this.panggilAuth(cfg, "GET", "/auth/v1/user", null, token).then(function (pengguna) {
      var email = (pengguna && pengguna.email) || "";
      var uid = (pengguna && pengguna.id) || "";
      self.simpanSesi({ access_token: token, refresh_token: refresh, user_id: uid, email: email,
        expires_at: Date.now() + (tamat * 1000), kaedah: "google" });
      return { ok: true, email: email, metadata: (pengguna && pengguna.user_metadata) || {} };
    }).catch(function (e) {
      return { ralat: t("sb.googleTidakSah", { e: (e.message || e) }) };
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
      var msg = /access_denied/i.test(ralat) ? t("sb.googleBatal")
        : (/provider (is )?not enabled|provider_disabled/i.test(ralat + " " + ralatDes) ? t("sb.googleTiada")
        : t("sb.googleGagal", { e: (decodeURIComponent(ralatDes.replace(/\+/g, " ")) || ralat) }));
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
    if (!email || !kata) throw new Error(t("sb.isiEmailKata"));
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
    if (!email || !kata) throw new Error(t("sb.isiEmailKata"));
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/token?grant_type=password", { email: email, password: kata }).then(function (j) {
      if (!j.access_token) throw new Error(t("sb.loginGagal2"));
      self.simpanSesi({ access_token: j.access_token, refresh_token: j.refresh_token || "",
        user_id: (j.user && j.user.id) || "", email: email,
        expires_at: Date.now() + ((Number(j.expires_in) || 3600) * 1000),
        kaedah: "email" });
      return true;
    });
  },
  segarToken: function () {
    var cfg = this.cfg(); var s = this.sesi();
    if (!cfg.url || !cfg.anon || !s || !s.refresh_token) return Promise.reject(new Error(t("sb.sesiTamat")));
    var self = this;
    return this.authPanggil(cfg, "/auth/v1/token?grant_type=refresh_token", { refresh_token: s.refresh_token }).then(function (j) {
      if (!j.access_token) throw new Error(t("sb.sesiTamat"));
      self.simpanSesi({ access_token: j.access_token, refresh_token: j.refresh_token || s.refresh_token,
        user_id: (j.user && j.user.id) || s.user_id, email: s.email,
        expires_at: Date.now() + ((Number(j.expires_in) || 3600) * 1000),
        kaedah: s.kaedah || "email" });
      return j.access_token;
    });
  },
  tokenSah: function () {
    var s = this.sesi();
    if (!s || !s.access_token) return Promise.reject(new Error(t("sb.belumMasuk")));
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
        if (!res.ok) throw new Error(SB.ralat(j, t("sb.syncGagalKod", { kod: res.status })));
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
    var st = this.syncState();
    if (!st.autoSync) return;
    /* v3.5 Mod Tetamu: data tetamu tidak pernah dihantar ke awan. */
    try { if (typeof data !== "undefined" && data && data.settings && data.settings.mod === "tetamu") return; } catch (e) {}
    if (!this.sesi() || !this.cfg().url) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    var self = this;
    /* v3.9: jika sync baru sahaja selesai (<5 saat), jangan BUANG
       permintaan ini — jadualkan semula selepas tempoh bertenang, supaya
       simpanan yang dibuat sejurus selepas sync tetap dihantar (lewat
       sedikit, bukan hilang). */
    var lewat = 1500;
    if (this._lastSyncComplete && (Date.now() - this._lastSyncComplete < 5000)) {
      lewat = 5000 - (Date.now() - this._lastSyncComplete) + 200;
    }
    if (this._autoTimer) clearTimeout(this._autoTimer);
    this._autoTimer = setTimeout(function () {
      self.syncPenuh(true).catch(function (e) {
        try { var el = $("sbStatus"); if (el) el.textContent = t("sb.syncAutoGagal", { e: (e.message || e) }); } catch (e2) {}
      });
    }, lewat);
  },
  syncPenuh: function (auto) {
    var self = this;
    var cfg;
    try { cfg = this.sahkanCfg(this.cfg()); } catch (e) { return Promise.reject(e); }
    /* v3.5 Mod Tetamu: tolak sync terus — data tetamu kekal tempatan sahaja. */
    try { if (typeof data !== "undefined" && data && data.settings && data.settings.mod === "tetamu") return Promise.reject(new Error(t("sb.modTetamu"))); } catch (e2) {}
    if (this.syncSedangBerjalan) return Promise.reject(new Error(t("sb.syncBerjalan")));
    this.syncSedangBerjalan = true;
    var state = this.syncState();
    var sesi = this.sesi();
    if (!sesi) { this.syncSedangBerjalan = false; return Promise.reject(new Error(t("sb.belumMasuk2"))); }
    var uid = sesi.user_id;
    if (!uid) { this.syncSedangBerjalan = false; return Promise.reject(new Error(t("sb.sesiTidakLengkap"))); }
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
    if (kaedah === "otp") return t("sb.kaedahOtp");
    return "Email";
  },
  renderStatus: function () {
    var el = $("sbStatus"); if (!el) return;
    var cfg = this.cfg(); var s = this.sesi(); var st = this.syncState();
    if ($("sbAutoToggle")) $("sbAutoToggle").checked = !!st.autoSync;
    if ($("sbEmail") && s && s.email) $("sbEmail").value = s.email;
    var akhir = st.lastSyncAt ? new Date(st.lastSyncAt).toLocaleString(localeSemasa()) : t("sb.belumPernah");
    if (s && s.email) {
      el.textContent = t("sb.statusMasuk", { e: s.email, kaedah: this.kaedahLabel(s.kaedah), s: akhir, a: (st.autoSync ? t("sb.hidup") : t("sb.mati")) });
      if (typeof sbTunjukLangkah === "function") sbTunjukLangkah("logmasuk");
    } else if (cfg.url && cfg.anon) {
      el.textContent = t("sb.statusBelum");
      if (typeof sbTunjukLangkah === "function") sbTunjukLangkah((sbLangkahSemasa === "logmasuk" || !sbLangkahSemasa) ? "utama" : sbLangkahSemasa);
    } else {
      el.textContent = t("sb.tiadaConfig");
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
  /* v3.9: jadualkan semula notifikasi tempatan Android bila data berubah
     (di web / tanpa plugin, panggilan ini tidak buat apa-apa). */
  try { jadualNotifikasiAndroid(); } catch (e2) {}
}

function toast(msg) { var el = $("toast"); el.textContent = msg; el.hidden = false; setTimeout(function () { el.hidden = true; }, 3500); }
function kebunNama(id) { var k = data.kebuns.find(function (x) { return x.id === id; }); return k ? k.nama : "-"; }
function blokById(id) { return data.bloks.find(function (x) { return x.id === id; }); }
function blokNama(id) { if (!id) return t("misc.semuaBlok"); var b = blokById(id); return b ? b.nama : "-"; }
function blokLabel(b) { if (!b) return "-"; var tn = b.tanaman === "Lain-lain" && b.tanamanLain ? b.tanamanLain : tanamanLabel(b.tanaman); return b.nama + " — " + tn + " (" + peringkatLabel(b.peringkat || "Semua Peringkat") + ")"; }
function tanamanBlok(id) { var b = blokById(id); if (!b) return "-"; return b.tanaman === "Lain-lain" && b.tanamanLain ? b.tanamanLain : b.tanaman; }
function tanamanPaparan(id) { var b = blokById(id); if (!b) return "-"; if (b.tanaman === "Lain-lain" && b.tanamanLain) return b.tanamanLain; return tanamanLabel(b.tanaman); }
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
  fillSelect($("fKebun"), kebunOpts, t("semua.kebun"));
  // Blok: kerja form ikut kebun terpilih, selebihnya semua blok
  refreshBlokSelects();
}
function refreshBlokSelects() {
  var kebunId = $("kerjaKebun").value;
  var untukKerja = data.bloks.filter(function (b) { return !kebunId || b.kebunId === kebunId; });
  var curBlok = $("kerjaBlok").value;
  var optsKerja = [{ value: "", label: t("f.semuaBlok") }].concat(untukKerja.map(function (b) { return { value: b.id, label: blokLabel(b) }; }));
  fillSelect($("kerjaBlok"), optsKerja);
  if (curBlok !== undefined && curBlok !== null) $("kerjaBlok").value = curBlok;
  var fKebun = $("fKebun").value;
  var untukTapisan = data.bloks.filter(function (b) { return !fKebun || b.kebunId === fKebun; });
  var cur = $("fBlok").value;
  fillSelect($("fBlok"), untukTapisan.map(function (b) { return { value: b.id, label: b.nama + " (" + kebunNama(b.kebunId) + ")" }; }), t("semua.blok"));
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
  fillSelect(el, nama.map(function (n) { return { value: n, label: n }; }), t("semua.bahan"));
  if (cur) el.value = cur;
}
/* Borang kerja: Bahan ditapis ikut Jenis Kerja, daripada pustaka bahan. */
function refreshBahanSelect() {
  var el = $("kerjaBahan"); if (!el) return;
  var jenis = $("kerjaJenis").value;
  var cur = el.value;
  var senarai = data.bahans.filter(function (b) { return !jenis || b.jenisKerja === jenis || !b.jenisKerja; });
  /* v3.6: pustaka bermula kosong — tunjuk keadaan kosong dengan jelas. */
  var labelKosong = senarai.length ? t("f.pilihBahan") : t("f.tiadaBahan");
  var opts = [{ value: "", label: labelKosong }].concat(senarai.map(function (b) {
    return { value: b.id, label: b.nama + (b.dosLalai ? " (" + b.dosLalai + ")" : "") };
  }));
  opts.push({ value: "__TAMBAH__", label: t("f.tambahBahan") });
  opts.push({ value: "__LAIN__", label: t("f.bahanLainOpt") });
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
  el.textContent = t("job.terakhir", { bahan: (k.bahan || "—") + (k.dos ? ", " + k.dos : ""), tarikh: fmtDate(k.tarikhSiap || k.tarikhRancang) });
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
  if (!senyap) toast(t("msg.gunaSemula"));
}

function jobCard(k) {
  var hr = todayStr();
  var overdue = k.tarikhRancang < hr && k.status !== "Siap";
  var div = document.createElement("div");
  div.className = "card job";
  div.innerHTML =
    "<div class=\"jobhead\"><img class=\"jobicon\" src=\"assets/icons/" + iconKerja(k.jenis) + "\" alt=\"\"><p class=\"title\">" + esc(jenisPaparan(k)) + " — " + esc(blokNama(k.blokId)) + "</p></div>" +
    (GAMBAR_DIMATIKAN ? "" : (k.image ? "<img class=\"jobimg\" src=\"" + esc(k.image) + "\" alt=\"" + t("job.gambarAlt") + "\">" : "")) +
    "<p class=\"meta\">" + esc(kebunNama(k.kebunId)) + " • " + esc(tanamanPaparan(k.blokId)) + "<br>" +
    t("job.dirancang") + esc(fmtDate(k.tarikhRancang)) + (overdue ? " <span class=\"overdue\">" + t("job.tertunggak") + "</span>" : "") +
    (k.zon && k.zon !== "Semua Zon" ? "<br>" + t("job.zon") + esc(zonLabel(k.zon)) : "") +
    (k.nextTarikh ? "<br>" + t("job.seterusnya") + esc(fmtDate(k.nextTarikh)) +
      (k.nextSyarat && k.nextSyarat !== "Tiada syarat" ? " • " + esc(k.nextSyarat === "Lain-lain" && k.nextSyaratLain ? k.nextSyaratLain : syaratLabel(k.nextSyarat)) : "") +
      (k.nextTukarBahan ? t("job.tukarBahan") + (k.nextBahan ? ": " + esc(k.nextBahan) : "") : "") : "") +
    (k.tarikhSiap ? "<br>" + t("job.siap") + esc(fmtDate(k.tarikhSiap)) : "") +
    (k.bahan ? "<br>" + t("job.bahan") + esc(k.bahan) : "") +
    (k.dos ? t("job.dos") + esc(k.dos) : "") +
    "<br>" + t("job.kos") + esc(fmtRM(k.kos)) +
    (k.nota ? "<br>" + t("job.nota") + esc(k.nota) : "") + "</p>" +
    "<span class=\"status " + esc(k.status) + "\">" + esc(statusLabel(k.status)) + "</span>" +
    "<div class=\"progress\"><div style=\"width:" + (Number(k.peratus) || 0) + "%\"></div></div>" +
    "<p class=\"meta\">" + t("job.siapPct") + (Number(k.peratus) || 0) + "%</p>" +
    "<div class=\"pctrow\"><label style=\"flex:0 0 auto\">" + t("job.peratus") + "</label><select data-pct=\"" + k.id + "\"><option value=\"0\"" + ((Number(k.peratus) || 0) === 0 ? " selected" : "") + ">0%</option><option value=\"50\"" + ((Number(k.peratus) || 0) === 50 ? " selected" : "") + ">50%</option><option value=\"100\"" + ((Number(k.peratus) || 0) > 50 ? " selected" : "") + ">100%</option></select>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"pct\" data-id=\"" + k.id + "\">" + t("job.kemaskiniPct") + "</button></div>" +
    "<div class=\"row\" style=\"margin-top:10px\">" +
    "<button type=\"button\" class=\"btn primary small\" data-act=\"siap\" data-id=\"" + k.id + "\">" + t("job.siapBtn") + "</button>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"esok\" data-id=\"" + k.id + "\">" + t("job.esok") + "</button>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"lusa\" data-id=\"" + k.id + "\">" + t("job.lusa") + "</button>" +
    "<button type=\"button\" class=\"btn secondary small\" data-act=\"ubah\" data-id=\"" + k.id + "\">" + t("job.ubah") + "</button>" +
    "<button type=\"button\" class=\"btn danger small\" data-act=\"padam\" data-id=\"" + k.id + "\">" + t("job.padam") + "</button></div>";
  return div;
}

function renderHariIni() {
  var hr = todayStr();
  var list = data.kerjas.filter(function (k) { return k.status !== "Siap" && (k.tarikhRancang === hr || k.tarikhRancang < hr); });
  list.sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? -1 : 1; });
  var el = $("hariIniList");
  el.innerHTML = "";
  if (!list.length) { el.innerHTML = emptyHtml(t("hariini.tiada")); return; }
  list.forEach(function (k) { el.appendChild(jobCard(k)); });
}
function renderPeringatan() {
  var el = $("peringatanList"); if (!el) return;
  var s = (data.settings && typeof data.settings.notifikasiHidup === "boolean") ? data.settings.notifikasiHidup : true;
  if (!s) { el.innerHTML = ""; el.hidden = true; return; }
  var hr = todayStr(); var esok = addDays(hr, 1); var lusa = addDays(hr, 2);
  var list = data.kerjas.filter(function (k) { return k.status !== "Siap" && (k.tarikhRancang === hr || k.tarikhRancang === esok || k.tarikhRancang === lusa); });
  list.sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? -1 : 1; });
  el.hidden = false;
  if (!list.length) { el.innerHTML = "<div class=\"card\"><h3>" + t("hariini.akanDatangPendek") + "</h3><p class=\"hint\">" + t("hariini.tiadaAkanDatang") + "</p></div>"; return; }
  var rows = list.map(function (k) {
    var bila = k.tarikhRancang === hr ? t("hariini.hariIni") : (k.tarikhRancang === esok ? t("hariini.esok") : t("hariini.lusa"));
    return "<p>" + esc(jenisPaparan(k)) + " — " + esc(blokNama(k.blokId)) + " (" + esc(kebunNama(k.kebunId)) + ") • " + bila + " (" + esc(fmtDate(k.tarikhRancang)) + ")</p>";
  }).join("");
  el.innerHTML = "<div class=\"card\"><h3>" + t("hariini.akanDatang") + "</h3><p class=\"hint\">" + t("hariini.akanDatangHint") + "</p>" + rows + "</div>";
}
function renderNotifikasiStatus() {
  var st = $("notiStatus"); if (!st) return;
  var hidup = data.settings && data.settings.notifikasiHidup;
  var izinLabel;
  if (dalamCapacitor()) {
    var iz = (data.settings && data.settings.notifIzin) || "";
    izinLabel = iz === "granted" ? t("notif.izinDibenarkan") : iz === "denied" ? t("notif.izinDitolak") : t("notif.izinBelum");
  } else {
    var p = (typeof Notification !== "undefined") ? Notification.permission : "";
    izinLabel = p === "granted" ? t("notif.izinDibenarkan") : p === "denied" ? t("notif.izinDitolak") : p === "default" ? t("notif.izinBelum") : t("notif.tidakDisokong");
  }
  st.textContent = t("notif.statusBaru", { s: (hidup ? t("sb.hidup") : t("sb.mati")), izin: izinLabel }) +
    (hidup ? t("notif.statusHidup") : t("notif.statusMati"));
  var tog = $("notiToggle"); if (tog) tog.checked = !!hidup;
  /* v3.9: tunjuk panduan bila ditolak; sembunyi butang Benarkan bila sudah
     dibenarkan; hint Android hanya dalam APK. */
  var ditolak = dalamCapacitor() ? ((data.settings && data.settings.notifIzin) === "denied") : ((typeof Notification !== "undefined") && Notification.permission === "denied");
  var dh = $("notifDitolakHint"); if (dh) dh.hidden = !ditolak;
  var dibenarkan = dalamCapacitor() ? ((data.settings && data.settings.notifIzin) === "granted") : ((typeof Notification !== "undefined") && Notification.permission === "granted");
  var bb = $("notiBenarkanBtn"); if (bb) bb.hidden = dibenarkan;
  var ah = $("notifAndroidHint"); if (ah) ah.hidden = !dalamCapacitor();
}
function renderAkaunStatus() {
  var el = $("akaunStatus"); if (!el) return;
  var inpNama = $("akaunNamaPaparan");
  if (inpNama && document.activeElement !== inpNama) inpNama.value = namaPaparan();
  var sbSesi = null, sbCfgAda = false, sbAkhir = t("sb.belumPernah");
  try {
    if (typeof SB !== "undefined" && SB) {
      sbSesi = SB.sesi(); var c = SB.cfg(); sbCfgAda = !!(c.url && c.anon);
      var st = SB.syncState(); if (st.lastSyncAt) sbAkhir = new Date(st.lastSyncAt).toLocaleString(localeSemasa());
    }
  } catch (e) {}
  if (sbSesi && sbSesi.email) {
    el.innerHTML = "<p><b>" + t("akaun.stLabel") + "</b> " + t("akaun.stMasukA") + " " + esc(sbSesi.email) +
      (namaPaparan() ? " (" + t("akaun.stNama") + " " + esc(namaPaparan()) + ")" : "") +
      ". " + t("akaun.stSync") + " " + esc(sbAkhir) + ". " + t("akaun.stSyncData") + "</p>" +
      "<p><b>" + t("akaun.stTukar1") + "</b> " + t("akaun.stTukar2") + "</p>" +
      "<p>" + t("akaun.stGambar") + "</p>";
  } else if (sbCfgAda) {
    el.innerHTML = "<p><b>" + t("akaun.stLabel") + "</b> " + t("akaun.stBelum") + "</p>" +
      "<p><b>" + t("akaun.stBantuan1") + "</b> " + t("akaun.stBantuan2") + "</p>" +
      "<p>" + t("akaun.stGambar2") + "</p>";
  } else {
    el.innerHTML = "<p><b>" + t("akaun.stLabel") + "</b> " + t("akaun.stTiadaConfig") + "</p>" +
      "<p>" + t("akaun.stEksport") + "</p>" +
      "<p>" + t("akaun.stGambar2") + "</p>";
  }
}
function semakNotifikasi() {
  try {
    if (!data.settings || !data.settings.notifikasiHidup) return;
    /* v3.9: Capacitor LocalNotifications — dijadualkan oleh
       jadualNotifikasiAndroid() (09:00, 2 hari sebelum tarikh kerja).
       Dijaga supaya tidak buat apa-apa di web jika plugin tiada. */
    try { jadualNotifikasiAndroid(); } catch (eCap) { /* abaikan di web */ }
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    var lusa2 = addDays(todayStr(), 2);
    data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang === lusa2; }).slice(0, 5).forEach(function (k) {
      try { new Notification(t("notif.tajuk"), { body: jenisPaparan(k) + " — " + blokNama(k.blokId) + " (" + fmtDate(k.tarikhRancang) + ")" }); } catch (eN) {}
    });
  } catch (e) {}
}
/* ===== v3.9 — Notifikasi tempatan Android (LocalNotifications) =====
   Plugin @capacitor/local-notifications sudah dipasang (package.json
   ^6.0.0, berdaftar dalam capacitor.plugins.json). Semua panggilan
   dijaga (try/catch + semakan plugin) supaya web dan APK tanpa plugin
   tidak pernah rosak.
   - Izin HANYA diminta selepas kad penjelasan ditunjuk dan pengguna
     tekan "Benarkan Notifikasi" — tidak pernah automatik. Ditanya
     sekali sahaja (settings.notifikasiDiminta).
   - Jadual: kerja Dirancang yang tarikhnya dalam 14 hari akan datang,
     notifikasi pada 09:00 tempatan, 2 hari sebelum tarikh kerja.
     Notifikasi lama (id 2000–2999) dibatalkan dahulu setiap kali
     dijadualkan semula, supaya tiada notifikasi basi. Jika masa 09:00
     hari itu sudah lepas (pengguna buka aplikasi petang), plugin akan
     hantar notifikasi itu tidak lama kemudian pada hari yang sama.
   - Status izin disimpan dalam settings.notifIzin ("granted" /
     "denied" / "prompt") supaya kad Tetapan > Notifikasi boleh
     memaparkannya tanpa panggilan async setiap kali render. */
function lnPlugin() {
  try {
    return (typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
  } catch (e) { return null; }
}
function idNotifikasi(k) {
  var h = 0, s = String((k && k.id) || "");
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return 2000 + h;
}
function jadualNotifikasiAndroid() {
  try {
    var LN = lnPlugin(); if (!LN || !LN.schedule) return;
    if (!data.settings || !data.settings.notifikasiHidup) return;
    if ((data.settings.notifIzin || "") === "denied") return;
    var hr = todayStr(), had = addDays(hr, 14);
    var senarai = data.kerjas.filter(function (k) {
      return k.status === "Dirancang" && k.tarikhRancang && k.tarikhRancang >= hr && k.tarikhRancang <= had;
    }).sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? -1 : 1; }).slice(0, 10);
    var notifs = senarai.map(function (k) {
      return { id: idNotifikasi(k), title: t("notif.tajuk"),
        body: t("notif.badan", { jenis: jenisPaparan(k), blok: blokNama(k.blokId) }),
        schedule: { at: new Date(addDays(k.tarikhRancang, -2) + "T09:00:00") } };
    });
    var buat = function () { try { LN.schedule({ notifications: notifs }).catch(function () {}); } catch (e) {} };
    if (LN.getPending && LN.cancel) {
      LN.getPending().then(function (res) {
        var ada = (res && res.notifications) || [];
        var ids = ada.map(function (n) { return n.id; }).filter(function (id) { return id >= 2000 && id < 3000; });
        if (ids.length) {
          try { LN.cancel({ notifications: ids.map(function (id) { return { id: id }; }) }).catch(function () {}).then(buat, buat); }
          catch (e) { buat(); }
        } else buat();
      }).catch(buat);
    } else buat();
  } catch (e) {}
}
/* Semak izin semasa dari plugin (sekali semasa mula) supaya status dalam
   Tetapan > Notifikasi tepat walaupun pengguna ubah izin dalam Tetapan telefon. */
function semakIzinNotifikasiAndroid() {
  try {
    var LN = lnPlugin(); if (!LN || !LN.checkPermissions) return;
    LN.checkPermissions().then(function (res) {
      var d = (res && res.display) || "";
      if (d === "granted" || d === "denied" || d === "prompt") {
        data.settings = data.settings || tetapanLalai();
        if (data.settings.notifIzin !== d) { data.settings.notifIzin = d; save(); }
        renderNotifikasiStatus();
      }
    }).catch(function () {});
  } catch (e) {}
}
/* Minta izin Android — dipanggil HANYA dari butang selepas kad penjelasan. */
function mintaIzinNotifikasiAndroid() {
  var LN = lnPlugin();
  if (!LN || !LN.requestPermissions) return false;
  data.settings = data.settings || tetapanLalai();
  data.settings.notifikasiDiminta = true; save();
  kemaskiniKadNotifikasiAndroid();
  LN.requestPermissions().then(function (res) {
    var d = (res && res.display) || "";
    data.settings = data.settings || tetapanLalai();
    if (d === "granted" || d === "denied" || d === "prompt") data.settings.notifIzin = d;
    save(); renderNotifikasiStatus();
    if (d === "granted") jadualNotifikasiAndroid();
    toast(d === "granted" ? t("msg.notifHidup") : t("msg.notifMati"));
  }).catch(function () { renderNotifikasiStatus(); });
  return true;
}
/* Kad penjelasan Android — hanya dalam Capacitor, hanya sekali (belum
   ditanya) dan hanya bila notifikasi masih hidup. */
function kemaskiniKadNotifikasiAndroid() {
  var kad = $("notifAndroidCard"); if (!kad) return;
  var tunjuk = dalamCapacitor() && !(data.settings && data.settings.notifikasiDiminta) && !!(data.settings && data.settings.notifikasiHidup);
  kad.hidden = !tunjuk;
}
/* Selepas onboarding selesai dalam APK: tunjuk kad penjelasan dengan
   pergi ke tab Tetapan sekali — supaya pengguna nampaknya. */
function tunjukKadNotifikasiAndroid() {
  if (!dalamCapacitor()) return;
  if (!data.settings || data.settings.notifikasiDiminta) return;
  if (!data.settings.notifikasiHidup) return;
  kemaskiniKadNotifikasiAndroid();
  setTab("tetapan");
}
/* v3.6: senarai Kerja dipaginasi 10 demi 10 (terkini dahulu). Kerja yang
   sudah Siap (100%) TIDAK dipaparkan di sini — ia hanya dalam Sejarah. */
var kerjaHad = 10;
function renderSemuaKerja() {
  var el = $("semuaKerjaList");
  el.innerHTML = "";
  var list = data.kerjas.filter(function (k) { return k.status !== "Siap"; })
    .sort(function (a, b) { return a.tarikhRancang < b.tarikhRancang ? 1 : -1; });
  if (!list.length) { el.innerHTML = emptyHtml(t("kerja.tiadaSiap")); return; }
  list.slice(0, kerjaHad).forEach(function (k) { el.appendChild(jobCard(k)); });
  if (list.length > kerjaHad) {
    var baki = list.length - kerjaHad;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn secondary"; btn.textContent = t("job.tunjukLagi", { n: baki });
    btn.addEventListener("click", function () { kerjaHad += 10; renderSemuaKerja(); });
    el.appendChild(btn);
  }
}
function renderKebunBlok() {
  var kl = $("kebunList"); kl.innerHTML = "";
  if (!data.kebuns.length) kl.innerHTML = emptyHtml(t("kebun.tiada"));
  data.kebuns.forEach(function (k) {
    var d = document.createElement("div"); d.className = "card";
    d.innerHTML = "<p class=\"title\" style=\"font-weight:800\">" + esc(k.nama) + (k.contoh ? " <span class=\"status\">" + t("misc.contoh") + "</span>" : "") + "</p>" +
      "<button type=\"button\" class=\"btn danger small\" data-del-kebun=\"" + k.id + "\">" + t("kebun.padam") + "</button>";
    kl.appendChild(d);
  });
  var bl = $("blokList"); bl.innerHTML = "";
  if (!data.bloks.length) bl.innerHTML = emptyHtml(t("blok.tiada"));
  data.bloks.forEach(function (b) {
    var d = document.createElement("div"); d.className = "card";
    d.innerHTML = "<img class=\"blokicon\" src=\"assets/icons/" + iconTanaman(b.tanaman) + "\" alt=\"\"><p class=\"title\" style=\"font-weight:800\">" + esc(b.nama) + " — " + esc(tanamanPaparan(b.id)) + " (" + esc(peringkatLabel(b.peringkat || "Semua Peringkat")) + ")" + (b.contoh ? " <span class=\"status\">" + t("misc.contoh") + "</span>" : "") + "</p>" +
      "<p class=\"meta\">" + esc(kebunNama(b.kebunId)) + "</p>" +
      "<button type=\"button\" class=\"btn danger small\" data-del-blok=\"" + b.id + "\">" + t("blok.padam") + "</button>";
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
  if (!senarai.length) { el.innerHTML = emptyHtml(t("bahan.tiada")); return; }
  senarai.forEach(function (b) {
    var d = document.createElement("div"); d.className = "card";
    d.innerHTML = "<p class=\"title\" style=\"font-weight:800\">" + esc(b.nama) + "</p>" +
      "<p class=\"meta\">" + esc(b.jenisKerja ? jenisLabel(b.jenisKerja) : t("misc.semuaKerja")) + (b.dosLalai ? t("bahan.dosLalai") + esc(b.dosLalai) : "") + (b.nota ? " • " + esc(b.nota) : "") + "</p>" +
      "<button type=\"button\" class=\"btn danger small\" data-del-bahan=\"" + b.id + "\">" + t("bahan.padam") + "</button>";
    el.appendChild(d);
  });
}
/* ===== v3.6 — Sejarah: Kalendar bulan + Senarai =====
   Tarikh paparan kerja ialah tarikhSiap jika ada, jika tidak tarikhRancang.
   Tapisan (kebun/blok/tanaman/jenis/bahan/zon/cari/dari/hingga) menapis
   kedua-dua paparan: titik dalam kalendar DAN senarai hari/senarai penuh. */
function tarikhPaparanKerja(k) { return k.tarikhSiap || k.tarikhRancang; }
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
  var label = bulanNama(m - 1) + " " + y;
  var kira = {};
  list.forEach(function (k) { var d = tarikhPaparanKerja(k); if (!d) return; kira[d] = (kira[d] || 0) + 1; });
  if (!sejarahHari && sejarahBulan === todayStr().slice(0, 7)) sejarahHari = todayStr();
  var hariPertama = new Date(y, m - 1, 1).getDay();
  var hariDalamBulan = new Date(y, m, 0).getDate();
  var hr = todayStr();
  var html = "<div class=\"kal-nav\"><button type=\"button\" class=\"btn secondary small\" id=\"kalPrevBtn\">" + t("sejarah.bulanLepas") + "</button>" +
    "<p class=\"kal-label\">" + esc(label) + "</p>" +
    "<button type=\"button\" class=\"btn secondary small\" id=\"kalNextBtn\">" + t("sejarah.bulanDepan") + "</button></div>" +
    "<p class=\"hint\">" + t("sejarah.hariAda", { n: Object.keys(kira).length, m: list.length }) + "</p>" +
    "<div class=\"kal-grid\">" +
    [hariPendek(0), hariPendek(1), hariPendek(2), hariPendek(3), hariPendek(4), hariPendek(5), hariPendek(6)].map(function (h) { return "<div class=\"kal-hari-nama\">" + h + "</div>"; }).join("");
  for (var i = 0; i < hariPertama; i++) html += "<div class=\"kal-hari kosong\"></div>";
  for (var d = 1; d <= hariDalamBulan; d++) {
    var ds = y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    var n = kira[ds] || 0;
    var kelas = "kal-hari" + (n ? " ada" : "") + (ds === hr ? " hari-ini" : "") + (ds === sejarahHari ? " pilih" : "");
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
  if (!sejarahHari) { el.innerHTML = "<p class=\"hint\">" + t("sejarah.pilihHari") + "</p>"; return; }
  var hariList = list.filter(function (k) { return tarikhPaparanKerja(k) === sejarahHari; });
  var h = document.createElement("p"); h.className = "hint";
  h.textContent = t("sejarah.rekodPada", { n: hariList.length, tarikh: fmtDate(sejarahHari) });
  el.appendChild(h);
  if (!hariList.length) { el.innerHTML += emptyHtml(t("sejarah.tiadaHari")); return; }
  hariList.forEach(function (k) { el.appendChild(jobCard(k)); });
}
function renderSenaraiSejarah(list) {
  var el = $("sejarahList"); if (!el) return;
  el.innerHTML = "";
  el.innerHTML = "<p class=\"hint\">" + t("sejarah.rekodDijumpai", { n: list.length }) + "</p>";
  if (!list.length) { el.innerHTML += emptyHtml(t("sejarah.tiadaRekod")); return; }
  var tunjuk = list.slice(0, sejarahHad);
  var bulanSkrg = "";
  tunjuk.forEach(function (k) {
    var b = (tarikhPaparanKerja(k) || "").slice(0, 7);
    if (b !== bulanSkrg) {
      bulanSkrg = b;
      var hh = document.createElement("h3"); hh.className = "sejarah-bulan";
      hh.textContent = b ? (bulanNama(Number(b.slice(5, 7)) - 1) + " " + b.slice(0, 4)) : t("sejarah.tiadaTarikh");
      el.appendChild(hh);
    }
    el.appendChild(jobCard(k));
  });
  if (list.length > sejarahHad) {
    var baki = list.length - sejarahHad;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn secondary"; btn.textContent = t("job.tunjukLagi", { n: baki });
    btn.addEventListener("click", function () { sejarahHad += 20; renderSejarah(); });
    el.appendChild(btn);
  }
}
/* Ringkasan visual — kad nombor besar, carta donut, bar 7 hari, bar ikut
   kebun dan bar bahan. Tiada carta luar / CDN: SVG + CSS sahaja, supaya
   kekal offline dalam WebView. */
function renderRingkasan() {
  var hr = todayStr();
  var bulan = hr.slice(0, 7);
  var mingguMula = addDays(hr, -6);
  function kira(dari, hingga) {
    var subset = data.kerjas.filter(function (k) { return k.tarikhRancang >= dari && k.tarikhRancang <= hingga; });
    var siap = subset.filter(function (k) { return k.status === "Siap"; });
    var belum = subset.filter(function (k) { return k.status !== "Siap"; });
    var kos = siap.reduce(function (s, k) { return s + (Number(k.kos) || 0); }, 0);
    return { siap: siap.length, belum: belum.length, kos: kos, jumlah: subset.length };
  }
  var mg = kira(mingguMula, hr), bl = kira(bulan + "-01", bulan + "-31");
  var tertunggak = data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang < hr; }).length;
  /* Kad stat — 4 nombor besar sepintas lalu. */
  var statEl = $("ringkasanStat");
  if (statEl) {
    statEl.innerHTML = "<div class=\"statgrid\">" +
      "<div class=\"stat\"><p class=\"num\">" + bl.siap + "</p><p class=\"lbl\">" + t("stat.siap") + "</p><p class=\"sub\">" + t("stat.siapSub", { n: bl.jumlah }) + "</p></div>" +
      "<div class=\"stat gold\"><p class=\"num\">" + bl.belum + "</p><p class=\"lbl\">" + t("stat.belum") + "</p><p class=\"sub\">" + t("stat.belumSub") + "</p></div>" +
      "<div class=\"stat danger\"><p class=\"num\">" + tertunggak + "</p><p class=\"lbl\">" + t("stat.tertunggak") + "</p><p class=\"sub\">" + t("stat.tertunggakSub") + "</p></div>" +
      "<div class=\"stat\"><p class=\"num\">" + fmtRM(bl.kos) + "</p><p class=\"lbl\">" + t("stat.kos") + "</p><p class=\"sub\">" + t("stat.kosSub") + "</p></div>" +
      "</div>";
  }
  /* Carta donut — bulan ini. */
  var peratusSiap = bl.jumlah ? Math.round(bl.siap / bl.jumlah * 100) : 0;
  var C = 2 * Math.PI * 54;
  var siapLen = (C * peratusSiap / 100).toFixed(1);
  $("ringkasanBulan").innerHTML = "<h3>" + t("ring.bulanIni") + " (" + bulan + ")</h3>" +
    "<div class=\"donutwrap\">" +
    "<svg class=\"donut\" viewBox=\"0 0 132 132\" role=\"img\" aria-label=\"" + t("ring.siapPct", { n: peratusSiap }) + "\">" +
    "<circle cx=\"66\" cy=\"66\" r=\"54\" fill=\"none\" stroke=\"#EAE6D8\" stroke-width=\"16\"/>" +
    "<circle cx=\"66\" cy=\"66\" r=\"54\" fill=\"none\" stroke=\"#1E4D2B\" stroke-width=\"16\" stroke-linecap=\"round\" stroke-dasharray=\"" + siapLen + " " + C.toFixed(1) + "\" transform=\"rotate(-90 66 66)\"/>" +
    "<text x=\"66\" y=\"62\" text-anchor=\"middle\" class=\"donut-pct\">" + peratusSiap + "%</text>" +
    "<text x=\"66\" y=\"82\" text-anchor=\"middle\" class=\"donut-lbl\">" + t("ring.siap") + "</text></svg>" +
    "<div class=\"legend\">" +
    "<p><span class=\"dot\" style=\"background:#1E4D2B\"></span> " + t("ring.siapLbl") + " <b>" + bl.siap + "</b></p>" +
    "<p><span class=\"dot\" style=\"background:#C08A1A\"></span> " + t("ring.belumLbl") + " <b>" + bl.belum + "</b></p>" +
    "<p><span class=\"dot\" style=\"background:#EAE6D8\"></span> " + t("ring.jumlahLbl") + " <b>" + bl.jumlah + "</b></p>" +
    "<p>" + t("ring.kosSiap") + " <b>" + fmtRM(bl.kos) + "</b></p>" +
    "</div></div>";
  /* Bar 7 hari — kerja siap setiap hari (ikut tarikh siap, jika tiada ikut tarikh dirancang). */
  var namaHari = [hariPendek(0), hariPendek(1), hariPendek(2), hariPendek(3), hariPendek(4), hariPendek(5), hariPendek(6)];
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
  $("ringkasanMinggu").innerHTML = "<h3>" + t("ring.minggu") + " (" + fmtDate(mingguMula) + " – " + fmtDate(hr) + ")</h3>" +
    "<p class=\"hint\">" + t("ring.mingguHint", { s: mg.siap, j: mg.jumlah, k: fmtRM(mg.kos) }) + "</p>" +
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
    return "<div class=\"barrow\"><div class=\"barhead\"><span>" + esc(kb.nama) + "</span><span>" + siap.length + "/" + s.length + " " + t("ring.siap") + " • " + fmtRM(kos) + "</span></div>" +
      "<div class=\"bartrack\"><div class=\"barfill\" style=\"width:" + pct + "%\"></div></div></div>";
  }).join("");
  $("ringkasanKebun").innerHTML = "<h3>" + t("ring.kebun") + "</h3>" + (perKebun || emptyHtml(t("kebun.tiada")));
  /* Bar bahan — 5 paling kerap, bulan ini. */
  var elBahan = $("ringkasanBahan");
  if (elBahan) {
    var kiraBahan = {};
    data.kerjas.filter(function (k) { return k.status === "Siap" && k.tarikhRancang.slice(0, 7) === bulan && k.bahan; }).forEach(function (k) {
      kiraBahan[k.bahan] = (kiraBahan[k.bahan] || 0) + 1;
    });
    var susun = Object.keys(kiraBahan).sort(function (a, b) { return kiraBahan[b] - kiraBahan[a]; }).slice(0, 5);
    var maksBahan = susun.length ? kiraBahan[susun[0]] : 0;
    elBahan.innerHTML = "<h3>" + t("ring.bahan") + "</h3>" +
      (susun.length ? susun.map(function (n) {
        var pctB = maksBahan ? Math.round(kiraBahan[n] / maksBahan * 100) : 0;
        return "<div class=\"barrow\"><div class=\"barhead\"><span>" + esc(n) + "</span><span>" + kiraBahan[n] + " " + t("ring.kali") + "</span></div>" +
          "<div class=\"bartrack\"><div class=\"barfill gold\" style=\"width:" + pctB + "%\"></div></div></div>";
      }).join("") : "<p class=\"hint\">" + t("ring.bahanTiada") + "</p>");
  }
}
function renderAll() { refreshSelects(); refreshBahanSelect(); renderDashboard(); renderHariIni(); renderPeringatan(); renderSemuaKerja(); renderKebunBlok(); renderSejarah(); renderRingkasan(); renderNotifikasiStatus(); renderAkaunStatus(); try { if (typeof SB !== "undefined" && SB) SB.renderStatus(); } catch (e) {} tunjukOnboarding(); kemaskiniUiTetamu(); kemaskiniButangContoh(); kemaskiniKadNotifikasiAndroid(); semakNamaWajib(); renderPengumuman(); }

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
    d.innerHTML = "<p class=\"section-label\">" + t("pengumuman.label") + "</p>" +
      "<p class=\"title\" style=\"font-weight:800\">" + esc(x.tajuk) + "</p>" +
      "<p class=\"meta\">" + esc(x.mesej) + "</p>" +
      (x.tarikh ? "<p class=\"hint\">" + esc(fmtDate((x.tarikh || "").slice(0, 10))) + "</p>" : "") +
      "<button type=\"button\" class=\"btn secondary small\" data-dismiss-pengumuman=\"" + esc(x.id) + "\">" + t("pengumuman.baca") + "</button>";
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

/* ===== v3.7 — Iklan (AdSense web / AdMob APK) =====
   Satu tempat yang mengawal semua iklan. Polisi kekerapan dikuatkuasakan
   di sini, bukan sekadar dalam dokumen:
   - MAKSIMA 2 banner dalam seluruh aplikasi: bawah Ringkasan + bawah
     Sejarah. Tiada interstitial, tiada rewarded, tiada popup, tiada
     iklan dalam borang Kerja, Hari Ini, onboarding atau daftar masuk.
   - MAKSIMA 1 iklan kelihatan pada satu masa (hanya slot tab aktif
     boleh dimuat; slot lain tersembunyi bersama tabnya).
   - MINIMA 60 saat antara muatan iklan baharu untuk slot/unit yang
     sama (tukar tab berulang kali tidak memuat iklan baharu).
   - Iklan tidak pernah menyekat kandungan dan tidak menganjak layout:
     bekas slot disembunyikan sepenuhnya bila iklan dimatikan / tiada
     ID, dan ruang menyimpan ketinggian tetap bila iklan dimuat.
   - AdSense = WEB sahaja (polisi Google melarang AdSense dalam WebView
     aplikasi — memaparkannya dalam APK boleh menyebabkan akaun AdSense
     disekat). AdMob = APK sahaja. Kod ini memilih jalan mengikut
     platform: ada window.Capacitor -> AdMob, tiada -> AdSense.
   - Semua ID datang dari www/ads-config.js (window.KEBUNKU_ADS).
     Iklan DIMATIKAN secara lalai; tiada skrip luar dimuat selagi
     diaktifkan: false. Mod pratonton hanya melukis kotak berlabel,
     tidak memuat sebarang skrip iklan. Semua di dalam try/catch supaya
   iklan tidak pernah merosakkan aplikasi. */
var Iklan = {
  JARAK_MUAT_MIN_MS: 60000,
  _terakhirMuat: {},
  _admobMuatUnit: {},
  _skripAdsenseDimuat: false,
  _admobMula: false,
  _admobSedia: false,
  _admobUnitAktif: null,
  _admobDisembunyikan: true,
  cfg: function () {
    try {
      var c = (typeof window !== "undefined" && window.KEBUNKU_ADS) ? window.KEBUNKU_ADS : null;
      if (c && typeof c === "object") return c;
    } catch (e) {}
    return { diaktifkan: false, modPratonton: false, adsense: {}, admob: {} };
  },
  dalamCapacitor: function () { return !!(typeof window !== "undefined" && window.Capacitor); },
  modPratonton: function () { return !!this.cfg().modPratonton; },
  diaktifkan: function () { return !!this.cfg().diaktifkan; },
  bekasEl: function (slot) { return slot === "ringkasan" ? $("slotIklanRingkasan") : $("slotIklanSejarah"); },
  ruangEl: function (slot) { return slot === "ringkasan" ? $("ruangIklanRingkasan") : $("ruangIklanSejarah"); },
  normalPub: function (pub) {
    var p = String(pub || "").trim();
    if (!p) return "";
    return p.indexOf("ca-pub-") === 0 ? p : "ca-pub-" + p;
  },
  slotAdsense: function (slot) {
    var a = this.cfg().adsense || {};
    var pub = this.normalPub(a.publisherId);
    var unit = String(slot === "ringkasan" ? (a.slotRingkasan || "") : (a.slotSejarah || "")).trim();
    if (!pub || !unit) return null;
    return { client: pub, slot: unit };
  },
  slotAdmob: function (slot) {
    var a = this.cfg().admob || {};
    if (!String(a.appId || "").trim()) return null;
    var unit = String(slot === "ringkasan" ? (a.bannerRingkasan || "") : (a.bannerSejarah || "")).trim();
    return unit || null;
  },
  /* Pratonton: kotak berlabel di kedudukan slot sebenar, tanpa sebarang
     skrip iklan. Kedua-dua bekas dibuka sekali — hanya slot dalam tab
     aktif yang kelihatan kerana tab lain disembunyikan. */
  tunjukPratonton: function () {
    var self = this;
    ["ringkasan", "sejarah"].forEach(function (slot) {
      var bekas = self.bekasEl(slot), ruang = self.ruangEl(slot);
      if (!bekas || !ruang) return;
      ruang.innerHTML = "";
      var d = document.createElement("div");
      d.className = "iklan-pratonton";
      d.textContent = t("iklan.pratonton");
      ruang.appendChild(d);
      bekas.hidden = false;
    });
  },
  /* AdSense (web sahaja): skrip dimuat sekali sahaja, <ins> dibina
     untuk slot aktif, push sekali. Muatan diulang hanya selepas 60s. */
  muatAdsense: function (slot) {
    var s = this.slotAdsense(slot);
    if (!s) return;
    var kini = Date.now();
    if (this._terakhirMuat[slot] && kini - this._terakhirMuat[slot] < this.JARAK_MUAT_MIN_MS) return;
    this._terakhirMuat[slot] = kini;
    var bekas = this.bekasEl(slot), ruang = this.ruangEl(slot);
    if (!bekas || !ruang) return;
    if (!this._skripAdsenseDimuat) {
      this._skripAdsenseDimuat = true;
      var sk = document.createElement("script");
      sk.async = true;
      sk.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(s.client);
      sk.setAttribute("crossorigin", "anonymous");
      document.head.appendChild(sk);
    }
    ruang.innerHTML = "";
    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", s.client);
    ins.setAttribute("data-ad-slot", s.slot);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    ruang.appendChild(ins);
    bekas.hidden = false;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  },
  /* AdMob (APK sahaja): plugin dicapai melalui Capacitor.Plugins seperti
     plugin lain (App / Browser / PushNotifications). Semua guarded. */
  _admob: function () {
    try {
      if (!this.dalamCapacitor()) return null;
      return (window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) || null;
    } catch (e) { return null; }
  },
  mulaAdmob: function () {
    var AM = this._admob();
    if (!AM || this._admobMula) return;
    this._admobMula = true;
    var self = this;
    try {
      var p = AM.initialize ? AM.initialize() : null;
      if (p && p.then) p.then(function () { self._admobSedia = true; }).catch(function () {});
      else this._admobSedia = true;
    } catch (e) {}
  },
  tunjukAdmob: function (slot) {
    var unit = this.slotAdmob(slot);
    if (!unit) { this.sembunyiAdmob(); return; }
    var AM = this._admob();
    if (!AM || !this._admobSedia) return;
    if (this._admobUnitAktif === unit && !this._admobDisembunyikan) return;
    var kini = Date.now();
    var self = this;
    /* Banner ialah overlay natif di bawah skrin. Margin 76dp supaya ia
       duduk betul-betul di atas bar navigasi bawah (bukan menutupnya). */
    var tunjuk = function () {
      try {
        var r = AM.showBanner({ adId: unit, adSize: "BANNER", position: "BOTTOM_CENTER", margin: 76 });
        if (r && r.catch) r.catch(function () {});
      } catch (e) {}
    };
    try {
      if (this._admobUnitAktif && this._admobUnitAktif !== unit) {
        var lama = AM.removeBanner ? AM.removeBanner() : null;
        if (lama && lama.then) lama.then(tunjuk).catch(tunjuk);
        else tunjuk();
      } else if (this._admobUnitAktif === unit && this._admobDisembunyikan &&
        this._admobMuatUnit[unit] && kini - this._admobMuatUnit[unit] < this.JARAK_MUAT_MIN_MS) {
        /* Unit sama, masih dalam 60 saat — papar semula tanpa minta
           iklan baharu. */
        try { var h = AM.resumeBanner ? AM.resumeBanner() : null; if (h && h.catch) h.catch(function () {}); } catch (e) {}
      } else {
        tunjuk();
        this._admobMuatUnit[unit] = kini;
      }
      this._admobUnitAktif = unit;
      this._admobDisembunyikan = false;
    } catch (e) {}
  },
  sembunyiAdmob: function () {
    if (this._admobDisembunyikan) return;
    this._admobDisembunyikan = true;
    try {
      var AM = this._admob();
      if (AM && AM.hideBanner) { var h = AM.hideBanner(); if (h && h.catch) h.catch(function () {}); }
    } catch (e) {}
  },
  /* Dipanggil setiap kali tab bertukar (lihat setTab) dan sekali semasa
     mula (lihat aliran OAuth di bawah). */
  padaTab: function (nama) {
    try {
      if (this.modPratonton()) { this.tunjukPratonton(); return; }
      if (!this.diaktifkan()) { this.sembunyiAdmob(); return; }
      if (this.dalamCapacitor()) {
        this.mulaAdmob();
        if (nama === "ringkasan" || nama === "sejarah") this.tunjukAdmob(nama);
        else this.sembunyiAdmob();
        return;
      }
      if (nama === "ringkasan" || nama === "sejarah") this.muatAdsense(nama);
    } catch (e) {}
  },
  init: function () { this.padaTab("hariini"); }
};

/* ===== v3.5 — Dashboard, onboarding (tetamu vs daftar masuk), nama paparan ===== */
function salamWaktu() { var jam = new Date().getHours(); if (jam < 12) return t("salam.pagi"); if (jam < 15) return t("salam.tengahHari"); if (jam < 19) return t("salam.petang"); return t("salam.malam"); }
function namaPaparan() { return (data.settings && data.settings.namaPaparan) ? data.settings.namaPaparan.trim() : ""; }
function renderDashboard() {
  var el = $("dashboardSalam"); if (!el) return;
  var hr = todayStr();
  var nama = namaPaparan();
  var tarikh = new Date().toLocaleDateString(localeSemasa(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  el.innerHTML = "<p class=\"eyebrow salam-eyebrow\">" + t("tabhead.hariini") + "</p><p class=\"salam-teks\">" + esc(salamWaktu()) + (nama ? ", " + esc(nama) : "") + "</p><p class=\"salam-tarikh\">" + esc(tarikh) + "</p>";
  var stat = $("dashboardStat"); if (!stat) return;
  var hariIni = data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang === hr; }).length;
  var tertunggak = data.kerjas.filter(function (k) { return k.status !== "Siap" && k.tarikhRancang < hr; }).length;
  var siapHariIni = data.kerjas.filter(function (k) { return k.status === "Siap" && (k.tarikhSiap || k.tarikhRancang) === hr; }).length;
  stat.innerHTML = "<div class=\"stat mini\"><p class=\"num\">" + hariIni + "</p><p class=\"lbl\">" + t("dash.kerjaHariIni") + "</p></div>" +
    "<div class=\"stat mini danger\"><p class=\"num\">" + tertunggak + "</p><p class=\"lbl\">" + t("dash.tertunggak") + "</p></div>" +
    "<div class=\"stat mini\"><p class=\"num\">" + siapHariIni + "</p><p class=\"lbl\">" + t("dash.siapHariIni") + "</p></div>";
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
  var perlu = perluOnboarding();
  el.hidden = !perlu;
  if (!perlu) return;
  /* v3.9: langkah 1 (nama) dahulu jika belum ada nama; jika nama sudah
     disimpan (cth. pengguna keluar kemudian buka semula), terus langkah 2. */
  var adaNama = !!namaPaparan();
  var s1 = $("onbStepNama"), s2 = $("onbStepPilih");
  if (s1) s1.hidden = adaNama;
  if (s2) s2.hidden = !adaNama;
  if (!adaNama) { var r = $("onbNamaRalat"); if (r) r.hidden = true; }
}
function tutupOnboarding() { _onboardingDitutupSesi = true; var el = $("onboardingOverlay"); if (el) el.hidden = true; }
function pilihTetamu() {
  data.settings = data.settings || tetapanLalai(); data.settings.mod = "tetamu"; save();
  tutupOnboarding(); renderAll(); toast(t("msg.tetamu"));
  try { tunjukKadNotifikasiAndroid(); } catch (e) {}
}
/* Mod Tetamu dalam UI: Sync Sekarang dilumpuhkan dengan hint, suis sync
   automatik dilumpuhkan, dan kad Akaun menunjukkan butang daftar masuk. */
function kemaskiniUiTetamu() {
  var tetamu = !!(data.settings && data.settings.mod === "tetamu");
  var syncBtn = $("sbSyncBtn");
  if (syncBtn) syncBtn.disabled = tetamu;
  var hint = $("sbSyncHint");
  if (hint) { hint.hidden = !tetamu; if (tetamu) hint.textContent = t("akaun.tetamuLoginHint"); }
  var auto = $("sbAutoToggle");
  if (auto) auto.disabled = tetamu;
  var akaunTetamu = $("akaunTetamu");
  if (akaunTetamu) akaunTetamu.hidden = !tetamu;
}
/* Nama paparan — WAJIB (v3.9). Modal ini tidak boleh ditutup tanpa nama:
   tiada butang langkau, dan simpanNamaPaparan menolak nama kosong. */
function tunjukNamaModal() {
  var m = $("namaModal"); if (!m) return;
  var inp = $("namaPaparanInput"); if (inp) inp.value = namaPaparan();
  var r = $("namaRalat"); if (r) r.hidden = true;
  m.hidden = false;
}
function sembunyiNamaModal() { var m = $("namaModal"); if (m) m.hidden = true; }
/* v3.9: pengguna sedia ada yang tiada nama disimpan (tetamu lama / pernah
   tekan Langkau) nampak prompt nama yang tidak boleh ditutup sehingga
   nama diisi. Pengguna baharu isi nama dalam langkah 1 onboarding, jadi
   modal ini tidak muncul serentak dengan onboarding. */
function semakNamaWajib() {
  try {
    if (perluOnboarding()) return;
    if (namaPaparan()) { sembunyiNamaModal(); return; }
    tunjukNamaModal();
  } catch (e) {}
}
function simpanNamaPaparan(nama, senyap) {
  nama = (nama || "").trim();
  /* v3.9: nama wajib — kosong ditolak, modal kekal terbuka. */
  if (!nama) { if (!senyap) toast(t("msg.namaWajib")); return false; }
  data.settings = data.settings || tetapanLalai();
  data.settings.namaPaparan = nama; data.settings.namaDitanya = true; save();
  sembunyiNamaModal(); renderAll();
  var sesi = null; try { sesi = SB.sesi(); } catch (e) {}
  if (sesi && sesi.access_token) {
    /* Best effort — kegagalan tidak menghalang simpanan tempatan. */
    SB.simpanNamaKeAkaun(nama).catch(function () {});
  }
  /* v3.9: selepas nama disimpan dan pengguna sudah daftar masuk, pastikan
     sync automatik berjalan (backup nama + data) tanpa perlu tekan manual. */
  try { syncAutoJikaMasuk(); } catch (e2) {}
  if (!senyap) toast(t("msg.namaSimpan"));
  return true;
}
/* Selepas daftar masuk: jika tiada nama paparan, cuba ambil daripada akaun
   (user_metadata.nama_paparan, atau full_name untuk Google); jika masih
   tiada, tunjuk prompt nama yang WAJIB (v3.9 — tiada lagi langkau). */
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
    tunjukNamaModal();
  }).catch(function () {
    tunjukNamaModal();
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
  sbSetStatus(t("msg.googleBerjaya", { e: ((hasil && hasil.email) || "") }));
  toast(t("msg.googleBerjayaPendek", { e: ((hasil && hasil.email) || "") }));
  try { muatPengumuman(); } catch (e) {}
  try { tunjukKadNotifikasiAndroid(); } catch (e2) {}
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
  try { Iklan.padaTab(name); } catch (e) {}
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
    toast(t("msg.praisi", { jenis: jenisLabel(j) }));
  });
  $("templateButtons").appendChild(btn);
});

$("copyYesterdayBtn").addEventListener("click", function () {
  var semalam = addDays(todayStr(), -1);
  var semalamJobs = data.kerjas.filter(function (k) { return k.tarikhRancang === semalam; });
  if (!semalamJobs.length) { toast(t("msg.salinTiada")); return; }
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
  toast(disalin ? t("msg.salinSiap", { n: disalin }) : t("msg.salinSudah"));
});

// Borang kebun / blok
$("kebunForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var nama = $("kebunNama").value.trim();
  if (!nama) return;
  data.kebuns.push({ id: uid(), nama: nama, contoh: false, updatedAt: Date.now() });
  $("kebunNama").value = ""; save(); renderAll(); toast(t("msg.kebunTambah"));
});
$("blokForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var kebunId = $("blokKebun").value, nama = $("blokNama").value.trim(), tan = $("blokTanaman").value;
  if (!kebunId || !nama) { toast(t("msg.blokKosong")); return; }
  data.bloks.push({ id: uid(), kebunId: kebunId, nama: nama, tanaman: tan, tanamanLain: $("blokTanamanLain").value.trim(), peringkat: $("blokPeringkat") ? $("blokPeringkat").value : "Semua Peringkat", contoh: false, updatedAt: Date.now() });
  $("blokNama").value = ""; $("blokTanamanLain").value = ""; save(); renderAll(); toast(t("msg.blokTambah"));
});

/* Borang pustaka bahan (Kebun tab) */
$("bahanForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var nama = $("bahanNama").value.trim(), jenis = $("bahanJenis").value;
  if (!nama || !jenis) { toast(t("msg.bahanKosong")); return; }
  var ada = data.bahans.find(function (x) { return x.nama.toLowerCase() === nama.toLowerCase() && x.jenisKerja === jenis; });
  if (ada) { toast(t("msg.bahanAda", { jenis: jenisLabel(jenis) })); return; }
  data.bahans.push({ id: uid(), nama: nama, jenisKerja: jenis, unitLalai: $("bahanUnit").value, dosLalai: ($("bahanDosLalai").value || "").trim(), nota: "", contoh: false, updatedAt: Date.now() });
  $("bahanNama").value = ""; $("bahanDosLalai").value = ""; save(); renderAll(); toast(t("msg.bahanTambah"));
});

// Gambar kerja: maksimum 1, dimampatkan, tempatan sahaja
var gambarSemasa = null;
function setGambarInfo(teks) { if (GAMBAR_DIMATIKAN) return; var el = $("gambarInfo"); if (el) el.textContent = teks || ""; }
function paparGambarSemasa() {
  if (GAMBAR_DIMATIKAN) return;
  var img = $("gambarPreview"); if (!img) return;
  if (gambarSemasa) { img.src = gambarSemasa; img.hidden = false; } else { img.removeAttribute("src"); img.hidden = true; }
}
function buangGambar() {
  gambarSemasa = null; var inp = $("kerjaGambar"); if (inp) inp.value = ""; paparGambarSemasa(); setGambarInfo(t("f.gambarTiada"));
}
var _gInput = null;
function daftarGambarInput() {
  var inp = $("kerjaGambar"); if (!inp || inp === _gInput) return; _gInput = inp;
  inp.addEventListener("change", function () {
    var file = inp.files && inp.files[0]; if (!file) return;
    if (!file.type || file.type.indexOf("image/") !== 0) { setGambarInfo(t("msg.gambarBukan")); return; }
    var asalKB = Math.round(file.size / 1024);
    var url = URL.createObjectURL(file); var img = new Image();
    img.onload = function () {
      try {
        var maks = 1280; var w = img.width, h = img.height; var skala = Math.min(1, maks / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * skala)), ch = Math.max(1, Math.round(h * skala));
        var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
        cv.getContext("2d").drawImage(img, 0, 0, cw, ch);
        cv.toBlob(function (blob) {
          if (!blob) { setGambarInfo(t("msg.gambarGagal")); return; }
          var r = new FileReader();
          r.onload = function () { gambarSemasa = r.result; paparGambarSemasa(); setGambarInfo(t("msg.gambarInfo", { a: asalKB, b: Math.round(blob.size / 1024) })); };
          r.readAsDataURL(blob);
        }, "image/jpeg", 0.82);
      } catch (e) { setGambarInfo(t("msg.gambarGagal")); }
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { setGambarInfo(t("msg.gambarBaca")); URL.revokeObjectURL(url); };
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
      data.bahans.push({ id: bahanId, nama: bahanNama, jenisKerja: jenisKerja, unitLalai: dosUnit, dosLalai: dosStr, nota: t("bahan.ditambahSemasa"), contoh: false, updatedAt: Date.now() });
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
  if (!rec.kebunId || !rec.tarikhRancang) { toast(t("msg.formLengkap")); selesaiSimpan(); return; }
  if (pilihanNext === "Tarikh Custom" && !nextTarikh) { toast(t("msg.tarikhCustom")); selesaiSimpan(); return; }
  if (nextTukar && !nextBahan) { toast(t("msg.tukarBahanIsi")); selesaiSimpan(); return; }
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
    if (duplikat) { toast(t("msg.duplikat")); selesaiSimpan(); return; }
  }
  if (id) {
    var lama = data.kerjas.find(function (k) { return k.id === id; });
    if (lama) { Object.assign(lama, rec); if (lama.status === "Siap" && !lama.tarikhSiap) lama.tarikhSiap = todayStr(); }
    toast(t("msg.dikemaskini"));
  } else {
    rec.id = uid(); data.kerjas.push(rec);
    if (nextTarikh) {
      var susulan = { id: uid(), kebunId: rec.kebunId, blokId: rec.blokId, zon: rec.zon,
        jenis: rec.jenis, jenisLain: rec.jenisLain,
        tarikhRancang: nextTarikh, tarikhSiap: "", status: "Dirancang", peratus: 0,
        bahan: rec.bahan, bahanId: rec.bahanId, dos: rec.dos,
        dosJumlah: rec.dosJumlah, dosUnit: rec.dosUnit, dosPer: rec.dosPer, kos: 0,
        nota: t("job.susulan", { tarikh: fmtDate(rec.tarikhRancang) }), contoh: false,
        nextTarikh: "", nextPilihan: "", nextSyarat: "Tiada syarat", nextSyaratLain: "",
        nextTukarBahan: false, nextBahan: "", image: null, updatedAt: Date.now() };
      if (nextSyarat && nextSyarat !== "Tiada syarat") susulan.nota += " " + t("job.syarat") + (nextSyarat === "Lain-lain" && nextSyaratLain ? nextSyaratLain : syaratLabel(nextSyarat)) + ".";
      if (nextTukar) {
        susulan.bahan = ""; susulan.bahanId = ""; susulan.dos = "";
        susulan.dosJumlah = ""; susulan.dosUnit = ""; susulan.dosPer = "";
        susulan.nota = t("job.susulanTukar", { baru: nextBahan, lama: (rec.bahan || t("job.bahanLama")), tarikh: fmtDate(rec.tarikhRancang) });
      }
      /* v3.6: jangan cipta susulan berganda untuk tarikh/jenis yang sama. */
      var susulanAda = data.kerjas.some(function (x) {
        return x.kebunId === susulan.kebunId && (x.blokId || "") === (susulan.blokId || "") &&
          x.jenis === susulan.jenis && x.tarikhRancang === susulan.tarikhRancang &&
          x.status === "Dirancang" &&
          ((x.nota || "").indexOf("Susulan automatik") >= 0 || (x.nota || "").indexOf("Automatic follow-up") >= 0 || (x.nota || "").indexOf("Tukar bahan:") === 0 || (x.nota || "").indexOf("Change material:") === 0);
      });
      if (!susulanAda) data.kerjas.push(susulan);
      toast(t("msg.susulan", { tarikh: fmtDate(nextTarikh) }));
    } else { toast(t("msg.disimpan")); }
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
    if (act === "siap") { k.status = "Siap"; k.peratus = 100; k.tarikhSiap = todayStr(); k.updatedAt = Date.now(); toast(t("msg.siapDitanda")); }
    if (act === "esok") { k.tarikhRancang = addDays(todayStr(), 1); k.updatedAt = Date.now(); if (k.status === "Siap") k.status = "Siap Sebahagian"; if (k.status !== "Siap Sebahagian" && k.peratus > 0) k.status = "Siap Sebahagian"; toast(t("msg.esok")); }
    if (act === "lusa") { k.tarikhRancang = addDays(todayStr(), 2); k.updatedAt = Date.now(); if (k.peratus > 0 && k.status !== "Siap") k.status = "Siap Sebahagian"; toast(t("msg.lusa")); }
    if (act === "pct") {
      var inp = document.querySelector('[data-pct="' + k.id + '"]');
      var p = inp ? (Number(inp.value) || 0) : 0;
      if (p !== 0 && p !== 50 && p !== 100) p = 50;
      k.peratus = p; k.updatedAt = Date.now();
      if (p === 100) { k.status = "Siap"; k.tarikhSiap = todayStr(); }
      else if (p === 50) k.status = "Siap Sebahagian";
      else if (k.status === "Siap") { k.status = "Siap Sebahagian"; k.tarikhSiap = ""; }
      toast(t("msg.pctKemaskini", { n: p }));
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
      setGambarInfo(k.image ? t("f.gambarAda") : t("f.gambarTiada"));
      setTab("kerja"); window.scrollTo(0, 0); return;
    }
    if (act === "padam") {
      if (!confirm(t("confirm.padamKerja"))) return;
      try { if (typeof SB !== "undefined" && SB) SB.catatPadam("kerjas", [k.id]); } catch (e) {}
      data.kerjas = data.kerjas.filter(function (x) { return x.id !== k.id; }); toast(t("msg.dipadamKerja"));
    }
    save(); renderAll(); return;
  }
  var delK = e.target.closest("[data-del-kebun]");
  if (delK) {
    if (!confirm(t("confirm.padamKebun"))) return;
    var kid = delK.dataset.delKebun;
    try { if (typeof SB !== "undefined" && SB) {
      SB.catatPadam("kebuns", [kid]);
      SB.catatPadam("bloks", data.bloks.filter(function (x) { return x.kebunId === kid; }).map(function (x) { return x.id; }));
      SB.catatPadam("kerjas", data.kerjas.filter(function (x) { return x.kebunId === kid; }).map(function (x) { return x.id; }));
    } } catch (e) {}
    data.kebuns = data.kebuns.filter(function (x) { return x.id !== kid; });
    data.bloks = data.bloks.filter(function (x) { return x.kebunId !== kid; });
    data.kerjas = data.kerjas.filter(function (x) { return x.kebunId !== kid; });
    save(); renderAll(); toast(t("msg.dipadamKebun"));
  }
  var delB = e.target.closest("[data-del-blok]");
  if (delB) {
    if (!confirm(t("confirm.padamBlok"))) return;
    var bid = delB.dataset.delBlok;
    try { if (typeof SB !== "undefined" && SB) {
      SB.catatPadam("bloks", [bid]);
      SB.catatPadam("kerjas", data.kerjas.filter(function (x) { return x.blokId === bid; }).map(function (x) { return x.id; }));
    } } catch (e) {}
    data.bloks = data.bloks.filter(function (x) { return x.id !== bid; });
    data.kerjas = data.kerjas.filter(function (x) { return x.blokId !== bid; });
    save(); renderAll(); toast(t("msg.dipadamBlok"));
  }
  var delBh = e.target.closest("[data-del-bahan]");
  if (delBh) {
    if (!confirm(t("confirm.padamBahan"))) return;
    var bhid = delBh.dataset.delBahan;
    try { if (typeof SB !== "undefined" && SB) SB.catatPadam("bahans", [bhid]); } catch (e) {}
    data.bahans = data.bahans.filter(function (x) { return x.id !== bhid; });
    data.kerjas.forEach(function (x) { if (x.bahanId === bhid) x.bahanId = ""; });
    save(); renderAll(); toast(t("msg.dipadamBahan"));
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
  if (!blokId) { $("qResult").textContent = t("sejarah.tiadaBlok"); return; }
  var siap = data.kerjas.filter(function (k) { return k.blokId === blokId && k.jenis === jenis && (k.status === "Siap" || k.status === "Siap Sebahagian"); })
    .sort(function (a, b) { var da = a.tarikhSiap || a.tarikhRancang, db = b.tarikhSiap || b.tarikhRancang; return da < db ? 1 : -1; });
  if (!siap.length) { $("qResult").textContent = t("sejarah.terakhirTiada", { jenis: jenisLabel(jenis), blok: blokNama(blokId) }); return; }
  var k = siap[0];
  $("qResult").textContent = t("sejarah.terakhirAda", { jenis: jenisLabel(jenis), blok: blokNama(blokId), tarikh: fmtDate(k.tarikhSiap || k.tarikhRancang) }) + (k.bahan ? t("sejarah.terakhirBahan", { bahan: k.bahan }) : "") + ".";
});

/* v3.9: Kad "Data Saya" (eksport/import JSON) DIBUANG — backup kini
   automatik melalui sync Supabase sahaja (lihat jadualAutoSync /
   syncAutoJikaMasuk). Butang padam data di bawah kekal, kini dalam
   Tetapan > Akaun. */
var _notiT = $("notiToggle");
if (_notiT) _notiT.addEventListener("change", function () {
  data.settings = data.settings || tetapanLalai(); data.settings.notifikasiHidup = _notiT.checked; save(); renderAll();
  if (_notiT.checked) semakNotifikasi();
  toast(_notiT.checked ? t("msg.notifHidup") : t("msg.notifMati"));
});
var _notiB = $("notiBenarkanBtn");
if (_notiB) _notiB.addEventListener("click", function () {
  /* v3.9: dalam APK, minta izin LocalNotifications; di web, izin pelayar. */
  if (dalamCapacitor()) {
    if (mintaIzinNotifikasiAndroid()) return;
    toast(t("msg.notifTiada"));
    return;
  }
  if (typeof Notification === "undefined") { toast(t("msg.notifTiada")); return; }
  Notification.requestPermission().then(function () { renderNotifikasiStatus(); semakNotifikasi(); });
});
/* v3.9: butang pada kad penjelasan Android (Tetapan) — izin hanya diminta
   dari sini (atau dari butang Benarkan di atas), tidak pernah automatik. */
var _nab = $("notifAndroidBenarkanBtn");
if (_nab) _nab.addEventListener("click", function () { mintaIzinNotifikasiAndroid(); });
var _nan = $("notifAndroidNantiBtn");
if (_nan) _nan.addEventListener("click", function () {
  data.settings = data.settings || tetapanLalai();
  data.settings.notifikasiDiminta = true; save();
  kemaskiniKadNotifikasiAndroid();
});
$("deleteSampleBtn").addEventListener("click", function () {
  var ada = data.kebuns.some(function (k) { return k.contoh; }) || data.bloks.some(function (k) { return k.contoh; }) || data.kerjas.some(function (k) { return k.contoh; });
  if (!ada) { toast(t("msg.tiadaContoh")); return; }
  if (!confirm(t("confirm.padamContoh"))) return;
  try { if (typeof SB !== "undefined" && SB) {
    SB.catatPadam("kebuns", data.kebuns.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; }));
    SB.catatPadam("bloks", data.bloks.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; }));
    SB.catatPadam("kerjas", data.kerjas.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; }));
  } } catch (e) {}
  var kebunContoh = data.kebuns.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; });
  data.kebuns = data.kebuns.filter(function (k) { return !k.contoh; });
  data.bloks = data.bloks.filter(function (k) { return !k.contoh && kebunContoh.indexOf(k.kebunId) < 0; });
  data.kerjas = data.kerjas.filter(function (k) { return !k.contoh && kebunContoh.indexOf(k.kebunId) < 0; });
  save(); renderAll(); toast(t("msg.contohPadam"));
});
$("deleteAllBtn").addEventListener("click", function () {
  if (!confirm(t("confirm.padamSemua"))) return;
  try { if (typeof SB !== "undefined" && SB) {
    SB.catatPadam("kebuns", data.kebuns.map(function (k) { return k.id; }));
    SB.catatPadam("bloks", data.bloks.map(function (k) { return k.id; }));
    SB.catatPadam("kerjas", data.kerjas.map(function (k) { return k.id; }));
    SB.catatPadam("bahans", data.bahans.map(function (k) { return k.id; }));
  } } catch (e) {}
  data = emptyData(); save(); renderAll(); toast(t("msg.semuaPadam"));
});

/* ===== Supabase — butang dalam Tetapan > Akaun & Sandaran ===== */
function sbSetStatus(teks) { var el = $("sbStatus"); if (el) el.textContent = teks; }
function sbJalankanSync(manual) {
  sbSetStatus(t("msg.syncBerjalan"));
  SB.syncPenuh(!manual).then(function (r) {
    data.settings = data.settings || tetapanLalai(); data.settings.backend = "Supabase"; save();
    renderAll();
    try { muatPengumuman(); } catch (e) {}
    sbSetStatus(t("msg.syncSiapPenuh", { h: r.dihantar, t: r.diterima, s: new Date(SB.syncState().lastSyncAt).toLocaleString(localeSemasa()) }) + ".");
    toast(t("msg.syncSiap", { h: r.dihantar, t: r.diterima }));
  }).catch(function (e) {
    var msg = (e && e.message) ? e.message : String(e);
    sbSetStatus(t("msg.syncGagal", { e: msg }));
    if (manual) toast(t("msg.syncGagalPendek", { e: msg }));
    try { SB.renderStatus(); } catch (e2) {}
    /* Kekalkan mesej gagal di atas: renderStatus menulis semula status
       umum, jadi tulis semula mesej gagal selepas itu. */
    sbSetStatus(t("msg.syncGagal", { e: msg }));
  });
}
/* v3.9: sync automatik jika sudah daftar masuk (bukan tetamu) — dipanggil
   selepas nama disimpan dan semasa mula aplikasi, supaya backup berjalan
   tanpa perlu tekan Sync Sekarang. */
function syncAutoJikaMasuk() {
  try {
    if (typeof SB === "undefined" || !SB) return;
    if (data.settings && data.settings.mod === "tetamu") return;
    if (!SB.sesi() || !SB.cfg().url) return;
    SB.jadualAutoSync();
  } catch (e) {}
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
  sbSetStatus(t("msg.masukBerjaya", { e: kaedahLabel }));
  toast(t("msg.masukBerjaya2"));
  try { semakNamaPaparan(); } catch (e) {}
  try { muatPengumuman(); } catch (e2) {}
  try { syncAutoJikaMasuk(); } catch (e3) {}
  try { tunjukKadNotifikasiAndroid(); } catch (e4) {}
}
/* Google — butang di atas kad Supabase. */
var _sbGoogle = $("sbGoogleBtn");
if (_sbGoogle) _sbGoogle.addEventListener("click", function () {
  try { SB.googleLogin(); } catch (e) { sbSetStatus(t("sb.googleGagal", { e: (e.message || e) })); }
});
/* Daftar baharu — laluan utama: OTP. Kod 6 digit dihantar ke email; hanya
   pemilik email yang ada kod itu boleh siapkan pendaftaran (anti-spam). */
var _sbDaftar = $("sbDaftarBtn");
if (_sbDaftar) _sbDaftar.addEventListener("click", function () {
  var email = sbEmailUtama();
  try {
    SB.hantarOtp(email, true).then(function () {
      sbOtpEmailDaftar = email;
      var info = $("sbOtpDaftarInfo"); if (info) info.textContent = t("msg.kodHantar", { e: email });
      sbTunjukLangkah("otpdaftar");
      SB.mulaCooldownOtp($("sbOtpHantarSemulaBtn"));
      sbSetStatus(t("msg.kodHantarDaftar", { e: email }));
    }).catch(function (e) { sbSetStatus(t("msg.gagalHantarKod", { e: (e.message || e) })); toast(t("msg.gagalHantarKod", { e: (e.message || e) })); });
  } catch (e) { sbSetStatus(t("msg.gagalHantarKod", { e: (e.message || e) })); }
});
var _sbOtpSah = $("sbOtpSahkanBtn");
if (_sbOtpSah) _sbOtpSah.addEventListener("click", function () {
  var kod = $("sbOtpKod") ? $("sbOtpKod").value.trim() : "";
  var kata = $("sbOtpKata") ? $("sbOtpKata").value : "";
  if (!/^\d{6}$/.test(kod)) { sbSetStatus(t("sb.kod6")); return; }
  if (!kata || kata.length < 6) { sbSetStatus(t("sb.kata6")); return; }
  SB.sahkanOtp(sbOtpEmailDaftar, kod, "signup").then(function (j) {
    var token = j.session ? j.session.access_token : "";
    /* Tetapkan kata laluan supaya akaun ini juga boleh daftar masuk dengan
       email + kata laluan kemudian. Jika langkah ini gagal, pendaftaran
       tetap sah — pengguna masih boleh daftar masuk dengan kod. */
    return SB.tetapKataLaluan(token, kata).catch(function (eKata) {
      toast(t("msg.daftarBerjayaKata"));
    }).then(function () { sbSelepasLogMasuk("Kod Pengesahan"); });
  }).catch(function (e) { sbSetStatus(t("msg.sahkanGagal", { e: (e.message || e) })); toast(t("msg.sahkanGagal", { e: (e.message || e) })); });
});
var _sbOtpSemula = $("sbOtpHantarSemulaBtn");
if (_sbOtpSemula) _sbOtpSemula.addEventListener("click", function () {
  SB.hantarOtp(sbOtpEmailDaftar, true).then(function () {
    SB.mulaCooldownOtp(_sbOtpSemula);
    sbSetStatus(t("msg.kodHantarSemula", { e: sbOtpEmailDaftar }));
  }).catch(function (e) { sbSetStatus(t("msg.gagalHantarSemula", { e: (e.message || e) })); });
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
        sbSetStatus(t("msg.daftarBerjaya"));
        toast(t("msg.daftarBerjaya2"));
      } else {
        sbSelepasLogMasuk("Email");
      }
    }).catch(function (e) { sbSetStatus(t("msg.daftarGagal", { e: (e.message || e) })); toast(t("msg.daftarGagal", { e: (e.message || e) })); });
  } catch (e) { sbSetStatus(t("msg.daftarGagal", { e: (e.message || e) })); }
});
/* Daftar masuk email + kata laluan — kekal seperti sebelum ini. */
var _sbLogin = $("sbLoginBtn");
if (_sbLogin) _sbLogin.addEventListener("click", function () {
  try {
    SB.logMasuk().then(function () {
      sbSelepasLogMasuk("Email");
    }).catch(function (e) { sbSetStatus(t("msg.loginGagal", { e: (e.message || e) })); toast(t("msg.loginGagal", { e: (e.message || e) })); });
  } catch (e) { sbSetStatus(t("msg.loginGagal", { e: (e.message || e) })); }
});
/* Daftar masuk dengan kod — email sedia ada, tanpa kata laluan. */
var _sbKodLogin = $("sbKodLoginBtn");
if (_sbKodLogin) _sbKodLogin.addEventListener("click", function () {
  var email = sbEmailUtama();
  try {
    SB.hantarOtp(email, false).then(function () {
      sbOtpEmailLogin = email;
      var info = $("sbOtpLoginInfo"); if (info) info.textContent = t("msg.kodHantar", { e: email });
      sbTunjukLangkah("otplogin");
      SB.mulaCooldownOtp($("sbOtpLoginHantarSemulaBtn"));
      sbSetStatus(t("msg.kodLoginHantar", { e: email }));
    }).catch(function (e) { sbSetStatus(t("msg.gagalHantarLogin", { e: (e.message || e) })); });
  } catch (e) { sbSetStatus(t("msg.gagalHantarLogin2", { e: (e.message || e) })); }
});
var _sbOtpLoginSah = $("sbOtpLoginSahkanBtn");
if (_sbOtpLoginSah) _sbOtpLoginSah.addEventListener("click", function () {
  var kod = $("sbOtpLoginKod") ? $("sbOtpLoginKod").value.trim() : "";
  if (!/^\d{6}$/.test(kod)) { sbSetStatus(t("sb.kod6")); return; }
  SB.sahkanOtp(sbOtpEmailLogin, kod, "email").then(function () {
    sbSelepasLogMasuk("Kod Pengesahan");
  }).catch(function (e) { sbSetStatus(t("msg.kodLoginGagal", { e: (e.message || e) })); });
});
var _sbOtpLoginSemula = $("sbOtpLoginHantarSemulaBtn");
if (_sbOtpLoginSemula) _sbOtpLoginSemula.addEventListener("click", function () {
  SB.hantarOtp(sbOtpEmailLogin, false).then(function () {
    SB.mulaCooldownOtp(_sbOtpLoginSemula);
    sbSetStatus(t("msg.kodHantarSemula", { e: sbOtpEmailLogin }));
  }).catch(function (e) { sbSetStatus(t("msg.gagalHantarSemula", { e: (e.message || e) })); });
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
    renderAll(); toast(t("msg.keluar"));
  });
});
var _sbSync = $("sbSyncBtn");
if (_sbSync) _sbSync.addEventListener("click", function () { sbJalankanSync(true); });
var _sbAuto = $("sbAutoToggle");
if (_sbAuto) _sbAuto.addEventListener("change", function () {
  var st = SB.syncState(); st.autoSync = _sbAuto.checked; SB.simpanSyncState(st); renderAll();
  toast(_sbAuto.checked ? t("msg.autoHidup") : t("msg.autoMati"));
});
/* Butang ini hanya memadam SESI daftar masuk dari peranti ini. Tetapan
   aplikasi (fail config pemilik / tetapan peranti) TIDAK disentuh, dan
   data dalam akaun TIDAK dipadam. */
var _sbClear = $("sbClearBtn");
if (_sbClear) _sbClear.addEventListener("click", function () {
  if (!confirm(t("confirm.padamSesi"))) return;
  SB.logKeluar().then(function () {
    var em = $("sbEmail"); if (em) em.value = ""; var pw = $("sbPassword"); if (pw) pw.value = "";
    data.settings = data.settings || tetapanLalai(); data.settings.mod = ""; save();
    _onboardingDitutupSesi = false;
    renderAll();
    sbSetStatus(t("msg.sesiSudahPadam"));
    toast(t("msg.sesiPadam"));
  });
});

// Mula
$("todayLabel").textContent = fmtDate(todayStr());
$("kerjaTarikh").value = todayStr();
/* v3.9: gambar dimatikan — jangan daftar input gambar. */
if (!GAMBAR_DIMATIKAN) daftarGambarInput();
var _gb = $("gambarBuangBtn"); if (_gb) _gb.addEventListener("click", buangGambar);
var _kn = $("kerjaNext"); if (_kn) _kn.addEventListener("change", toggleNextCustom);
toggleNextCustom(); syncPeratusStatus(); if (!GAMBAR_DIMATIKAN) setGambarInfo(t("f.gambarTiada"));
/* v3.9 — onboarding 2 langkah (nama wajib dahulu, kemudian pilihan
   Daftar Masuk / Tetamu), nama paparan wajib, mod tetamu. */
var _onbNamaBtn = $("onbNamaTeruskanBtn");
if (_onbNamaBtn) _onbNamaBtn.addEventListener("click", function () {
  var nama = $("onbNamaInput") ? $("onbNamaInput").value.trim() : "";
  var ralat = $("onbNamaRalat");
  if (!nama) {
    if (ralat) ralat.hidden = false;
    var inp = $("onbNamaInput"); if (inp) inp.focus();
    return;
  }
  if (ralat) ralat.hidden = true;
  data.settings = data.settings || tetapanLalai();
  data.settings.namaPaparan = nama; data.settings.namaDitanya = true; save();
  try { syncAutoJikaMasuk(); } catch (e) {}
  renderAll();
});
var _onbNamaInp = $("onbNamaInput");
if (_onbNamaInp) _onbNamaInp.addEventListener("keydown", function (e) {
  if (e.key === "Enter") { e.preventDefault(); var b = $("onbNamaTeruskanBtn"); if (b) b.click(); }
});
var _onbLogin = $("onbLoginBtn");
if (_onbLogin) _onbLogin.addEventListener("click", function () {
  tutupOnboarding();
  setTab("tetapan");
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
  var v = $("namaPaparanInput") ? $("namaPaparanInput").value : "";
  if (!v.trim()) { var r = $("namaRalat"); if (r) r.hidden = false; return; }
  var r2 = $("namaRalat"); if (r2) r2.hidden = true;
  simpanNamaPaparan(v);
});
var _namaInp = $("namaPaparanInput");
if (_namaInp) _namaInp.addEventListener("keydown", function (e) {
  if (e.key === "Enter") { e.preventDefault(); var b = $("namaSimpanBtn"); if (b) b.click(); }
});
var _akaunNamaSimpan = $("akaunNamaSimpanBtn");
if (_akaunNamaSimpan) _akaunNamaSimpan.addEventListener("click", function () {
  simpanNamaPaparan($("akaunNamaPaparan") ? $("akaunNamaPaparan").value : "");
});
/* v3.8 — penukar bahasa (Tetapan dalam Ringkasan). */
var _bahasaSel = $("bahasaSelect");
if (_bahasaSel) _bahasaSel.addEventListener("change", function () {
  var lang = _bahasaSel.value === "en" ? "en" : "ms";
  data.settings = data.settings || tetapanLalai();
  data.settings.bahasa = lang; save();
  terapkanBahasa();
  toast(t("msg.bahasa"));
});
/* Mula: semak dahulu sama ada pelayar baru pulang daripada Google OAuth
   (token dalam hash URL). Jika ya, sesi Google disimpan dan hash dibersihkan
   sebelum paparan pertama; jika tidak, terus render seperti biasa. */
SB.kendaliOAuthCallback().then(function (hasil) {
  terapkanBahasa();
  try { Iklan.init(); } catch (e) {}
  try { muatPengumuman(); daftarPushNotifications(); } catch (e) {}
  /* v3.9: semak izin notifikasi Android dan sync automatik bila sudah
     daftar masuk — kedua-duanya dijaga supaya tidak ganggu mula aplikasi. */
  try { semakIzinNotifikasiAndroid(); } catch (e2) {}
  try { syncAutoJikaMasuk(); } catch (e3) {}
  if (hasil && hasil.ok) {
    selepasGoogleBerjaya(hasil);
    sbJalankanSync(true);
  } else if (hasil && hasil.ralat) {
    sbSetStatus(hasil.ralat);
  }
  semakNotifikasi();
}).catch(function (e) {
  terapkanBahasa();
  try { Iklan.init(); } catch (e2) {}
  try { daftarPushNotifications(); } catch (e2) {}
  try { semakIzinNotifikasiAndroid(); } catch (e3) {}
  try { syncAutoJikaMasuk(); } catch (e4) {}
  sbSetStatus(t("sb.googleGagal", { e: (e.message || e) }));
  semakNotifikasi();
});
