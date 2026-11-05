"use strict";
/* KebunKu v2 — offline-first, localStorage sahaja buat masa ini. Tiada backend
   yang disambung lagi; lihat objek Sync di bawah untuk persediaan sync awan. */
var KEY = "kebunku_data_v2";
var OLD_KEY = "kebunku_data_v1";
var SEED_KEY = "kebunku_seeded_v1";
var JENIS_KERJA = ["Membaja", "Meracun Rumput", "Racun Kulat", "Racun Serangga", "Menuai", "Pruning", "Membersihkan", "Menanam", "Menyiram", "Lain-lain"];
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

function tetapanLalai() { return { notifikasiHidup: true, backend: "belum disambung" }; }
function normalKerja(k) {
  var r = Object.assign({ nextTarikh: "", nextPilihan: "", image: null, updatedAt: 0, contoh: false }, k || {});
  if (!r.nextTarikh) r.nextTarikh = "";
  return r;
}
function emptyData() { return { version: 2, kebuns: [], bloks: [], kerjas: [], settings: tetapanLalai() }; }
function normalData(d) {
  var r = { version: 2, kebuns: [], bloks: [], kerjas: [], settings: tetapanLalai() };
  if (!d) return r;
  if (Array.isArray(d.kebuns)) r.kebuns = d.kebuns;
  if (Array.isArray(d.bloks)) r.bloks = d.bloks;
  if (Array.isArray(d.kerjas)) r.kerjas = d.kerjas.map(normalKerja);
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
      version: 2,
      kebuns: x.kebuns, bloks: x.bloks,
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
    var hasil = { version: 2, kebuns: gabung(t.kebuns, awan.kebuns), bloks: gabung(t.bloks, awan.bloks),
      kerjas: gabung(t.kerjas, awan.kerjas).map(normalKerja), settings: t.settings };
    if (awan.settings && awan.settings.backend && awan.settings.backend !== "belum disambung") hasil.settings.backend = awan.settings.backend;
    return hasil;
  }
};

function seedData() {
  var t = todayStr();
  var kebunId = uid();
  var b1 = uid(), b2 = uid(), b3 = uid();
  return { version: 2, settings: tetapanLalai(),
    kebuns: [{ id: kebunId, nama: "Kebun Contoh", contoh: true }],
    bloks: [
      { id: b1, kebunId: kebunId, nama: "Blok 1", tanaman: "Koko", tanamanLain: "", contoh: true },
      { id: b2, kebunId: kebunId, nama: "Blok 2", tanaman: "Sawit", tanamanLain: "", contoh: true },
      { id: b3, kebunId: kebunId, nama: "Blok 3", tanaman: "Durian", tanamanLain: "", contoh: true }
    ],
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
  } catch (e) { /* abaikan data rosak, cuba migrasi v1 */ }
  /* Migrasi v1 -> v2: kekalkan kebun/blok/kerja, tambah settings + medan baharu. */
  try {
    var lama = localStorage.getItem(OLD_KEY);
    if (lama) { var dv1 = JSON.parse(lama); if (dv1 && Array.isArray(dv1.kerjas)) { var mig = normalData(dv1); localStorage.setItem(KEY, JSON.stringify(mig)); return mig; } }
  } catch (e2) { /* abaikan */ }
  if (!localStorage.getItem(SEED_KEY)) {
    localStorage.setItem(SEED_KEY, "1");
    var seeded = normalData(seedData());
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }
  return emptyData();
}
var data = load();
function save() { localStorage.setItem(KEY, JSON.stringify(data)); }

function toast(msg) { var el = $("toast"); el.textContent = msg; el.hidden = false; setTimeout(function () { el.hidden = true; }, 3500); }
function kebunNama(id) { var k = data.kebuns.find(function (x) { return x.id === id; }); return k ? k.nama : "-"; }
function blokById(id) { return data.bloks.find(function (x) { return x.id === id; }); }
function blokNama(id) { var b = blokById(id); return b ? b.nama : "-"; }
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
  fillSelect($("kerjaBlok"), untukKerja.map(function (b) { return { value: b.id, label: b.nama + " — " + (b.tanaman === "Lain-lain" && b.tanamanLain ? b.tanamanLain : b.tanaman) }; }));
  var fKebun = $("fKebun").value;
  var untukTapisan = data.bloks.filter(function (b) { return !fKebun || b.kebunId === fKebun; });
  var cur = $("fBlok").value;
  fillSelect($("fBlok"), untukTapisan.map(function (b) { return { value: b.id, label: b.nama + " (" + kebunNama(b.kebunId) + ")" }; }), "Semua Blok");
  if (cur) $("fBlok").value = cur;
  fillSelect($("qBlok"), data.bloks.map(function (b) { return { value: b.id, label: b.nama + " — " + tanamanBlok(b.id) + " (" + kebunNama(b.kebunId) + ")" }; }));
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
    (k.nextTarikh ? "<br>Kerja seterusnya: " + esc(fmtDate(k.nextTarikh)) : "") +
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
  el.innerHTML = "<p><b>Status sandaran:</b> Data anda sekarang hanya dalam peranti ini + fail eksport JSON anda. " +
    "Jika aplikasi dinyahpasang tanpa eksport, data akan hilang.</p>" +
    "<p><b>Untuk boleh retrieve selepas uninstall,</b> aplikasi perlu disambung ke backend awan (pilihan backend yang direkod sekarang: " + esc(bk) + "). " +
    "Backend itu <b>belum disambung</b> — tiada log masuk dan tiada sync berlaku sekarang. Pilihan backend + akaun perlu diputuskan dahulu sebelum retrieve selepas uninstall boleh berfungsi.</p>" +
    "<p>Gambar pula disimpan tempatan sahaja dan <b>tidak</b> termasuk dalam eksport JSON biasa (untuk jimat storan). Pada masa depan, gambar boleh dibackup ke hosting — itu langkah seterusnya, bukan sekarang.</p>";
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
    d.innerHTML = "<img class=\"blokicon\" src=\"assets/icons/" + iconTanaman(b.tanaman) + "\" alt=\"\"><p class=\"title\" style=\"font-weight:800\">" + esc(b.nama) + " — " + esc(tanamanBlok(b.id)) + (b.contoh ? " <span class=\"status\">Contoh</span>" : "") + "</p>" +
      "<p class=\"meta\">" + esc(kebunNama(b.kebunId)) + "</p>" +
      "<button type=\"button\" class=\"btn danger small\" data-del-blok=\"" + b.id + "\">Padam Blok</button>";
    bl.appendChild(d);
  });
}
function renderSejarah() {
  var fKebun = $("fKebun").value, fBlok = $("fBlok").value, fTan = $("fTanaman").value, fJen = $("fJenis").value;
  var cari = ($("fCari").value || "").toLowerCase(), dari = $("fDari").value, hingga = $("fHingga").value;
  var list = data.kerjas.filter(function (k) {
    if (fKebun && k.kebunId !== fKebun) return false;
    if (fBlok && k.blokId !== fBlok) return false;
    if (fTan) { var tb = tanamanBlok(k.blokId); var raw = blokById(k.blokId); if (fTan === "Lain-lain" ? !(raw && raw.tanaman === "Lain-lain") : tb !== fTan) return false; }
    if (fJen && k.jenis !== fJen) return false;
    if (cari && ((k.bahan || "").toLowerCase().indexOf(cari) < 0 && (k.nota || "").toLowerCase().indexOf(cari) < 0)) return false;
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
}
function renderAll() { refreshSelects(); renderHariIni(); renderPeringatan(); renderSemuaKerja(); renderKebunBlok(); renderSejarah(); renderRingkasan(); renderNotifikasiStatus(); renderAkaunStatus(); }

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
    var salinan = Object.assign({}, k, { id: uid(), tarikhRancang: todayStr(), tarikhSiap: "", status: "Dirancang", peratus: 0, contoh: false, nextTarikh: "", nextPilihan: "", image: null, updatedAt: Date.now() });
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
  data.kebuns.push({ id: uid(), nama: nama, contoh: false });
  $("kebunNama").value = ""; save(); renderAll(); toast("Kebun ditambah.");
});
$("blokForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var kebunId = $("blokKebun").value, nama = $("blokNama").value.trim(), tan = $("blokTanaman").value;
  if (!kebunId || !nama) { toast("Pilih kebun dan isi nama blok."); return; }
  data.bloks.push({ id: uid(), kebunId: kebunId, nama: nama, tanaman: tan, tanamanLain: $("blokTanamanLain").value.trim(), contoh: false });
  $("blokNama").value = ""; $("blokTanamanLain").value = ""; save(); renderAll(); toast("Blok ditambah.");
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
  var row = $("kerjaNextCustomRow"); if (!row) return;
  row.hidden = ($("kerjaNext").value !== "Tarikh Custom");
}
// Borang kerja
$("kerjaKebun").addEventListener("change", refreshBlokSelects);
$("kerjaForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var id = $("kerjaId").value;
  var peratus = Math.max(0, Math.min(100, Number($("kerjaPeratus").value) || 0));
  var status = $("kerjaStatus").value;
  if (peratus === 100) status = "Siap";
  else if (peratus > 0 && status === "Dirancang") status = "Siap Sebahagian";
  var pilihanNext = $("kerjaNext").value || "";
  var nextTarikh = nextTarikhFrom($("kerjaTarikh").value, pilihanNext, $("kerjaNextCustom").value);
  var rec = {
    kebunId: $("kerjaKebun").value, blokId: $("kerjaBlok").value,
    jenis: $("kerjaJenis").value, jenisLain: $("kerjaJenisLain").value.trim(),
    tarikhRancang: $("kerjaTarikh").value, status: status, peratus: peratus,
    bahan: $("kerjaBahan").value.trim(), dos: $("kerjaDos").value.trim(),
    kos: Number($("kerjaKos").value) || 0, nota: $("kerjaNota").value.trim(),
    tarikhSiap: status === "Siap" ? todayStr() : "", contoh: false,
    nextTarikh: nextTarikh, nextPilihan: pilihanNext, image: gambarSemasa, updatedAt: Date.now()
  };
  if (!rec.kebunId || !rec.blokId || !rec.tarikhRancang) { toast("Lengkapkan kebun, blok dan tarikh."); return; }
  if (pilihanNext === "Tarikh Custom" && !nextTarikh) { toast("Pilih tarikh custom untuk kerja seterusnya."); return; }
  if (id) {
    var lama = data.kerjas.find(function (k) { return k.id === id; });
    if (lama) { Object.assign(lama, rec); if (lama.status === "Siap" && !lama.tarikhSiap) lama.tarikhSiap = todayStr(); }
    toast("Kerja dikemaskini.");
  } else {
    rec.id = uid(); data.kerjas.push(rec);
    if (nextTarikh) {
      data.kerjas.push({ id: uid(), kebunId: rec.kebunId, blokId: rec.blokId, jenis: rec.jenis, jenisLain: rec.jenisLain,
        tarikhRancang: nextTarikh, tarikhSiap: "", status: "Dirancang", peratus: 0, bahan: "", dos: "", kos: 0,
        nota: "Susulan automatik daripada kerja pada " + fmtDate(rec.tarikhRancang) + ".", contoh: false,
        nextTarikh: "", nextPilihan: "", image: null, updatedAt: Date.now() });
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
    if (act === "siap") { k.status = "Siap"; k.peratus = 100; k.tarikhSiap = todayStr(); toast("Kerja ditandakan siap."); }
    if (act === "esok") { k.tarikhRancang = addDays(todayStr(), 1); if (k.status === "Siap") k.status = "Siap Sebahagian"; if (k.status !== "Siap Sebahagian" && k.peratus > 0) k.status = "Siap Sebahagian"; toast("Baki kerja dibawa ke esok."); }
    if (act === "lusa") { k.tarikhRancang = addDays(todayStr(), 2); if (k.peratus > 0 && k.status !== "Siap") k.status = "Siap Sebahagian"; toast("Baki kerja dibawa ke lusa."); }
    if (act === "pct") {
      var inp = document.querySelector('[data-pct="' + k.id + '"]');
      var p = inp ? Math.max(0, Math.min(100, Number(inp.value) || 0)) : 0;
      k.peratus = p;
      if (p === 100) { k.status = "Siap"; k.tarikhSiap = todayStr(); }
      else if (p > 0) k.status = "Siap Sebahagian";
      toast("Peratus dikemaskini: " + p + "%.");
    }
    if (act === "ubah") {
      $("kerjaId").value = k.id; $("kerjaKebun").value = k.kebunId; refreshBlokSelects();
      $("kerjaBlok").value = k.blokId; $("kerjaJenis").value = k.jenis; $("kerjaJenisLain").value = k.jenisLain || "";
      $("kerjaTarikh").value = k.tarikhRancang; $("kerjaStatus").value = k.status; $("kerjaPeratus").value = k.peratus;
      $("kerjaBahan").value = k.bahan || ""; $("kerjaDos").value = k.dos || ""; $("kerjaKos").value = k.kos || ""; $("kerjaNota").value = k.nota || "";
      $("kerjaNext").value = k.nextPilihan || (k.nextTarikh ? "Tarikh Custom" : "");
      $("kerjaNextCustom").value = (k.nextPilihan === "Tarikh Custom") ? (k.nextTarikh || "") : "";
      toggleNextCustom(); gambarSemasa = k.image || null; paparGambarSemasa();
      setGambarInfo(k.image ? "Gambar sedia ada (tempatan sahaja, maksimum 1). Pilih gambar baharu untuk menggantikannya." : "Tiada gambar. Gambar adalah pilihan — maksimum 1 gambar setiap kerja.");
      setTab("kerja"); window.scrollTo(0, 0); return;
    }
    if (act === "padam") {
      if (!confirm("Padam kerja ini?")) return;
      data.kerjas = data.kerjas.filter(function (x) { return x.id !== k.id; }); toast("Kerja dipadam.");
    }
    save(); renderAll(); return;
  }
  var delK = e.target.closest("[data-del-kebun]");
  if (delK) {
    if (!confirm("Padam kebun ini? Blok dan kerja di bawahnya juga akan dipadam.")) return;
    var kid = delK.dataset.delKebun;
    data.kebuns = data.kebuns.filter(function (x) { return x.id !== kid; });
    data.bloks = data.bloks.filter(function (x) { return x.kebunId !== kid; });
    data.kerjas = data.kerjas.filter(function (x) { return x.kebunId !== kid; });
    save(); renderAll(); toast("Kebun dipadam.");
  }
  var delB = e.target.closest("[data-del-blok]");
  if (delB) {
    if (!confirm("Padam blok ini? Kerja di blok ini juga akan dipadam.")) return;
    var bid = delB.dataset.delBlok;
    data.bloks = data.bloks.filter(function (x) { return x.id !== bid; });
    data.kerjas = data.kerjas.filter(function (x) { return x.blokId !== bid; });
    save(); renderAll(); toast("Blok dipadam.");
  }
});

// Tapisan sejarah
["fKebun", "fBlok", "fTanaman", "fJenis", "fCari", "fDari", "fHingga"].forEach(function (id) {
  $(id).addEventListener("input", function () { if (id === "fKebun") refreshBlokSelects(); renderSejarah(); });
});
$("fResetBtn").addEventListener("click", function () {
  ["fKebun", "fBlok", "fTanaman", "fJenis", "fCari", "fDari", "fHingga"].forEach(function (id) { $(id).value = ""; });
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
  var kebunContoh = data.kebuns.filter(function (k) { return k.contoh; }).map(function (k) { return k.id; });
  data.kebuns = data.kebuns.filter(function (k) { return !k.contoh; });
  data.bloks = data.bloks.filter(function (k) { return !k.contoh && kebunContoh.indexOf(k.kebunId) < 0; });
  data.kerjas = data.kerjas.filter(function (k) { return !k.contoh && kebunContoh.indexOf(k.kebunId) < 0; });
  save(); renderAll(); toast("Data contoh dipadam. Anda boleh mula dengan data kosong.");
});
$("deleteAllBtn").addEventListener("click", function () {
  if (!confirm("Padam SEMUA data? Tindakan ini tidak boleh dibatalkan. Eksport dahulu jika perlu.")) return;
  data = emptyData(); save(); renderAll(); toast("Semua data dipadam.");
});

// Mula
$("todayLabel").textContent = fmtDate(todayStr());
$("kerjaTarikh").value = todayStr();
daftarGambarInput();
var _gb = $("gambarBuangBtn"); if (_gb) _gb.addEventListener("click", buangGambar);
var _kn = $("kerjaNext"); if (_kn) _kn.addEventListener("change", toggleNextCustom);
toggleNextCustom(); setGambarInfo("Tiada gambar. Gambar adalah pilihan — maksimum 1 gambar setiap kerja.");
renderAll();
semakNotifikasi();
