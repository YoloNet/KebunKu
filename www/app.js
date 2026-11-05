"use strict";
/* KebunKu MVP — offline-first, localStorage sahaja. Tiada backend, tiada log masuk. */
var KEY = "kebunku_data_v1";
var SEED_KEY = "kebunku_seeded_v1";
var JENIS_KERJA = ["Membaja", "Meracun Rumput", "Racun Kulat", "Racun Serangga", "Lain-lain"];

function $(id) { return document.getElementById(id); }
function uid() { return "id_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 100000).toString(36); }
function todayStr() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function addDays(dateStr, n) { var d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function fmtDate(s) { if (!s) return "-"; var p = s.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
function fmtRM(n) { return "RM " + (Number(n) || 0).toFixed(2); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

function emptyData() { return { kebuns: [], bloks: [], kerjas: [] }; }

function seedData() {
  var t = todayStr();
  var kebunId = uid();
  var b1 = uid(), b2 = uid(), b3 = uid();
  return {
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
    if (raw) { var d = JSON.parse(raw); if (d && Array.isArray(d.kebuns) && Array.isArray(d.bloks) && Array.isArray(d.kerjas)) return d; }
  } catch (e) { /* abaikan data rosak, mula kosong */ }
  if (!localStorage.getItem(SEED_KEY)) {
    localStorage.setItem(SEED_KEY, "1");
    var seeded = seedData();
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
function jenisPaparan(k) { return k.jenis === "Lain-lain" && k.jenisLain ? k.jenisLain : k.jenis; }
function iconKerja(j) { var m = {"Membaja":"membaja.svg","Meracun Rumput":"meracun-rumput.svg","Racun Kulat":"racun-kulat.svg","Racun Serangga":"racun-serangga.svg"}; return m[j] || "lain-kerja.svg"; }
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
    "<p class=\"meta\">" + esc(kebunNama(k.kebunId)) + " • " + esc(tanamanBlok(k.blokId)) + "<br>" +
    "Dirancang: " + esc(fmtDate(k.tarikhRancang)) + (overdue ? " <span class=\"overdue\">• Tertunggak</span>" : "") +
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
function renderAll() { refreshSelects(); renderHariIni(); renderSemuaKerja(); renderKebunBlok(); renderSejarah(); renderRingkasan(); }

function setTab(name) {
  document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
  document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
  window.scrollTo(0, 0);
}
document.querySelectorAll(".tab").forEach(function (b) { b.addEventListener("click", function () { setTab(b.dataset.tab); }); });

// Template pantas
JENIS_KERJA.forEach(function (j) {
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "btn secondary"; btn.innerHTML = "<img class=\"ticon\" src=\"assets/icons/" + iconKerja(j) + "\" alt=\"\">" + j;
  btn.addEventListener("click", function () {
    $("kerjaJenis").value = j;
    $("kerjaTarikh").value = todayStr();
    $("kerjaStatus").value = "Dirancang";
    $("kerjaPeratus").value = 0;
    $("kerjaId").value = "";
    setTab("kerja");
    toast("Borang pra-isi: " + j + ". Pilih kebun & blok, kemudian Simpan.");
  });
  $("templateButtons").appendChild(btn);
});

$("copyYesterdayBtn").addEventListener("click", function () {
  var semalam = addDays(todayStr(), -1);
  var semalamJobs = data.kerjas.filter(function (k) { return k.tarikhRancang === semalam; });
  if (!semalamJobs.length) { toast("Tiada kerja semalam untuk disalin."); return; }
  semalamJobs.forEach(function (k) {
    var salinan = Object.assign({}, k, { id: uid(), tarikhRancang: todayStr(), tarikhSiap: "", status: "Dirancang", peratus: 0, contoh: false });
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

// Borang kerja
$("kerjaKebun").addEventListener("change", refreshBlokSelects);
$("kerjaForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var id = $("kerjaId").value;
  var peratus = Math.max(0, Math.min(100, Number($("kerjaPeratus").value) || 0));
  var status = $("kerjaStatus").value;
  if (peratus === 100) status = "Siap";
  else if (peratus > 0 && status === "Dirancang") status = "Siap Sebahagian";
  var rec = {
    kebunId: $("kerjaKebun").value, blokId: $("kerjaBlok").value,
    jenis: $("kerjaJenis").value, jenisLain: $("kerjaJenisLain").value.trim(),
    tarikhRancang: $("kerjaTarikh").value, status: status, peratus: peratus,
    bahan: $("kerjaBahan").value.trim(), dos: $("kerjaDos").value.trim(),
    kos: Number($("kerjaKos").value) || 0, nota: $("kerjaNota").value.trim(),
    tarikhSiap: status === "Siap" ? todayStr() : "", contoh: false
  };
  if (!rec.kebunId || !rec.blokId || !rec.tarikhRancang) { toast("Lengkapkan kebun, blok dan tarikh."); return; }
  if (id) {
    var lama = data.kerjas.find(function (k) { return k.id === id; });
    if (lama) { Object.assign(lama, rec); if (lama.status === "Siap" && !lama.tarikhSiap) lama.tarikhSiap = todayStr(); }
    toast("Kerja dikemaskini.");
  } else {
    rec.id = uid(); data.kerjas.push(rec); toast("Kerja disimpan.");
  }
  $("kerjaId").value = ""; e.target.reset(); $("kerjaTarikh").value = todayStr(); $("kerjaPeratus").value = 0;
  save(); renderAll();
});
$("kerjaResetBtn").addEventListener("click", function () {
  $("kerjaForm").reset(); $("kerjaId").value = ""; $("kerjaTarikh").value = todayStr(); $("kerjaPeratus").value = 0; refreshBlokSelects();
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
$("exportBtn").addEventListener("click", function () {
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "kebunku-export-" + todayStr() + ".json"; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  toast("Eksport dimuat turun.");
});
$("importFile").addEventListener("change", function (e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var d = JSON.parse(reader.result);
      if (!d || !Array.isArray(d.kebuns) || !Array.isArray(d.bloks) || !Array.isArray(d.kerjas)) throw new Error("format");
      if (!confirm("Import akan menggantikan semua data sekarang. Teruskan?")) return;
      data = d; save(); renderAll(); toast("Import berjaya.");
    } catch (err) { toast("Fail import tidak sah. Pastikan ia fail JSON eksport KebunKu."); }
  };
  reader.readAsText(file); e.target.value = "";
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
renderAll();
