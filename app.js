/* ============================================================
   PINJAMIN – logika aplikasi
   Data disimpan di localStorage (kunci sama seperti versi sebelumnya,
   jadi data lama tetap terbaca).
   ============================================================ */
const STORAGE_KEY = "pinjamin-v1";
const CATEGORIES = ["Elektronik", "Alat Belajar", "Olahraga", "Dokumentasi", "Lainnya"];
const iconMap = { "Elektronik": "monitor", "Alat Belajar": "book", "Olahraga": "ball", "Dokumentasi": "camera", "Lainnya": "tag" };
const colorMap = { "Elektronik": "blue", "Alat Belajar": "purple", "Olahraga": "green", "Dokumentasi": "pink", "Lainnya": "orange" };

const $ = (id) => document.getElementById(id);
const ic = (name) => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* ---------- Tanggal ---------- */
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatDate(value) {
  if (!value) return "–";
  return new Date(value + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function daysUntil(value) {
  const a = new Date(dateOffset(0) + "T00:00:00");
  const b = new Date(value + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

/* ---------- Data awal ---------- */
const seed = {
  items: [
    { id: 1, name: "Proyektor Epson", category: "Elektronik", qty: 2, location: "Ruang TU" },
    { id: 2, name: "Kabel HDMI", category: "Elektronik", qty: 5, location: "Lab Komputer" },
    { id: 3, name: "Bola Futsal", category: "Olahraga", qty: 4, location: "Gudang Olahraga" },
    { id: 4, name: "Tripod Kamera", category: "Dokumentasi", qty: 2, location: "Ruang OSIS" },
    { id: 5, name: "Speaker Portable", category: "Elektronik", qty: 3, location: "Ruang Multimedia" },
    { id: 6, name: "Papan Tulis Portable", category: "Alat Belajar", qty: 2, location: "Perpustakaan" },
    { id: 7, name: "Kabel Roll", category: "Elektronik", qty: 4, location: "Ruang TU" },
    { id: 8, name: "Raket Badminton", category: "Olahraga", qty: 6, location: "Gudang Olahraga" },
    { id: 9, name: "Kamera Dokumentasi", category: "Dokumentasi", qty: 1, location: "Ruang OSIS" }
  ],
  loans: [
    { id: 101, itemId: 2, itemName: "Kabel HDMI", borrower: "Nadia Putri", unit: "XI DKV 1", loanDate: dateOffset(-1), dueDate: dateOffset(2), purpose: "Presentasi tugas", returnedAt: null },
    { id: 102, itemId: 3, itemName: "Bola Futsal", borrower: "Rizky Pratama", unit: "XI TKJ 2", loanDate: dateOffset(-3), dueDate: dateOffset(-1), purpose: "Latihan olahraga", returnedAt: null },
    { id: 103, itemId: 4, itemName: "Tripod Kamera", borrower: "Dimas Saputra", unit: "OSIS", loanDate: dateOffset(-5), dueDate: dateOffset(-2), purpose: "Dokumentasi kegiatan", returnedAt: dateOffset(-2) }
  ]
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.items) && Array.isArray(saved.loans)) return saved;
  } catch { /* abaikan, pakai data awal */ }
  return JSON.parse(JSON.stringify(seed));
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { showToast("Penyimpanan browser penuh atau tidak tersedia."); }
}

let state = loadState();
let toastTimer;

/* ---------- Helper ---------- */
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const isActive = (loan) => !loan.returnedAt;
const isLate = (loan) => isActive(loan) && loan.dueDate < dateOffset(0);
const activeCountFor = (itemId) => state.loans.filter(l => l.itemId === itemId && isActive(l)).length;
const availableQty = (item) => Math.max(0, item.qty - activeCountFor(item.id));
const itemOf = (loan) => state.items.find(i => i.id === loan.itemId);
const symbol = (category) => `<div class="item-symbol ${colorMap[category] || "blue"}">${ic(iconMap[category] || "tag")}</div>`;

function statusHTML(item) {
  return availableQty(item) > 0
    ? '<span class="status available"><i class="dot"></i>Tersedia</span>'
    : '<span class="status borrowed"><i class="dot"></i>Dipinjam</span>';
}
function loanStatus(loan) {
  if (loan.returnedAt) return `<span class="status returned">${ic("check")}Dikembalikan</span>`;
  if (isLate(loan)) return `<span class="status late">${ic("alert")}Terlambat</span>`;
  return '<span class="status borrowed"><i class="dot"></i>Dipinjam</span>';
}
function dueInfo(loan) {
  const d = daysUntil(loan.dueDate);
  if (d < 0) return { text: `Terlambat ${-d} hari`, cls: "late" };
  if (d === 0) return { text: "Jatuh tempo hari ini", cls: "soon" };
  if (d === 1) return { text: "Besok", cls: "soon" };
  return { text: `${d} hari lagi`, cls: "ok" };
}
function stockHTML(item) {
  const total = item.qty, avail = availableQty(item);
  const visual = total <= 10
    ? `<div class="pips" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < avail ? "" : "off"}"></i>`).join("")}</div>`
    : `<span class="bar" aria-hidden="true"><i style="width:${(avail / total) * 100}%"></i></span>`;
  return `<div class="stock">${visual}<small>${avail} dari ${total} tersedia</small></div>`;
}

function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

/* ---------- Navigasi ---------- */
const TITLES = { dashboard: "Beranda", items: "Daftar Barang", loans: "Peminjaman", history: "Riwayat" };
function go(view) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  $(view + "View").classList.add("active");
  document.querySelectorAll(".nav-item").forEach(el => {
    const on = el.dataset.view === view;
    el.classList.toggle("active", on);
    if (on) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
  });
  $("pageTitle").textContent = TITLES[view] || "PINJAMIN";
  if (view === "items") renderItems();
  if (view === "loans") renderLoans();
  if (view === "history") renderHistory();
  window.scrollTo({ top: 0 });
}

/* ---------- Beranda ---------- */
function renderStats() {
  $("totalItems").textContent = state.items.reduce((n, i) => n + i.qty, 0);
  $("availableItems").textContent = state.items.reduce((n, i) => n + availableQty(i), 0);
  $("activeLoans").textContent = state.loans.filter(isActive).length;
  $("lateLoans").textContent = state.loans.filter(isLate).length;
}

function renderHeroChips() {
  $("heroChips").innerHTML = CATEGORIES.map(cat => {
    const n = state.items.filter(i => i.category === cat).reduce((sum, i) => sum + availableQty(i), 0);
    return `<button class="chip" data-chip="${cat}">${ic(iconMap[cat])}${cat}<b>${n}</b></button>`;
  }).join("");
  document.querySelectorAll("[data-chip]").forEach(b => b.addEventListener("click", () => {
    $("itemSearch").value = ""; $("globalSearch").value = "";
    $("categoryFilter").value = b.dataset.chip;
    $("availabilityFilter").value = "available";
    go("items");
  }));
}

function renderDueSoon() {
  const list = state.loans.filter(isActive).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  $("dueSoon").innerHTML = list.length ? list.map(l => {
    const info = dueInfo(l);
    return `<div class="due-row"><div><strong>${escapeHTML(l.itemName)}</strong><small>${escapeHTML(l.borrower)}</small></div><span class="pill ${info.cls}">${info.text}</span></div>`;
  }).join("") : '<p class="due-empty">Semua barang sudah kembali. Tidak ada yang perlu ditagih.</p>';
}

function renderFeatured() {
  const host = $("featuredItems");
  const list = state.items.filter(i => availableQty(i) > 0).slice(0, 5);
  host.innerHTML = list.length ? list.map(item => `
    <div class="featured-row">
      ${symbol(item.category)}
      <div class="item-info"><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.location)} · ${availableQty(item)} tersedia</small></div>
      <button class="mini-action" data-borrow="${item.id}" aria-label="Pinjam ${escapeHTML(item.name)}">Pinjam</button>
    </div>`).join("") : '<p class="muted">Belum ada barang yang tersedia.</p>';
  host.querySelectorAll("[data-borrow]").forEach(b => b.addEventListener("click", () => openLoan(Number(b.dataset.borrow))));
}

function renderRecent() {
  const list = [...state.loans].sort((a, b) => b.id - a.id).slice(0, 4);
  $("recentLoans").innerHTML = list.length ? list.map(l => {
    const type = l.returnedAt ? "returned" : isLate(l) ? "late" : "borrowed";
    const icon = { returned: "check", late: "alert", borrowed: "loan" }[type];
    const note = l.returnedAt ? "Sudah dikembalikan" : isLate(l) ? dueInfo(l).text : `Batas kembali ${formatDate(l.dueDate)}`;
    return `<div class="recent-entry"><span class="recent-ic ${type}">${ic(icon)}</span><div><strong>${escapeHTML(l.itemName)}</strong><p>${escapeHTML(l.borrower)} · ${note}</p></div></div>`;
  }).join("") : '<p class="muted">Belum ada aktivitas peminjaman.</p>';
}

function renderDashboard() { renderStats(); renderHeroChips(); renderDueSoon(); renderFeatured(); renderRecent(); }

/* ---------- Daftar barang ---------- */
function renderItems() {
  const query = $("itemSearch").value.toLowerCase().trim();
  const category = $("categoryFilter").value;
  const availability = $("availabilityFilter").value;
  const list = state.items.filter(item => {
    const matches = (item.name + " " + item.location + " " + item.category).toLowerCase().includes(query);
    const avail = availableQty(item) > 0;
    return matches
      && (category === "all" || item.category === category)
      && (availability === "all" || (availability === "available" ? avail : !avail));
  });
  $("itemGrid").innerHTML = list.map(item => {
    const free = availableQty(item) > 0;
    return `
    <article class="item-card">
      <div class="item-card-top">${symbol(item.category)}${statusHTML(item)}</div>
      <h3>${escapeHTML(item.name)}</h3>
      <p class="item-location">${ic("pin")}${escapeHTML(item.location)}</p>
      <div class="item-card-bottom">
        ${stockHTML(item)}
        <button data-borrow="${item.id}" ${free ? "" : "disabled"} aria-label="${free ? "Pinjam " : "Sedang dipinjam: "}${escapeHTML(item.name)}">${free ? "Pinjam" : "Habis"}</button>
      </div>
    </article>`;
  }).join("");
  $("itemsEmpty").classList.toggle("hidden", list.length > 0);
  $("itemCount").textContent = list.length === state.items.length
    ? `${list.length} barang terdaftar.`
    : `Menampilkan ${list.length} dari ${state.items.length} barang.`;
  document.querySelectorAll("#itemGrid [data-borrow]").forEach(b => b.addEventListener("click", () => openLoan(Number(b.dataset.borrow))));
}

/* ---------- Peminjaman & riwayat ---------- */
function renderLoans() {
  const q = $("loanSearch").value.toLowerCase().trim();
  const filter = $("loanStatusFilter").value;
  const list = state.loans.filter(l => {
    const matches = (l.itemName + " " + l.borrower + " " + l.unit).toLowerCase().includes(q);
    return matches && (filter === "all" || (filter === "late" && isLate(l)) || (filter === "active" && isActive(l)));
  }).sort((a, b) => b.id - a.id);

  $("loanTable").innerHTML = list.map(l => {
    const info = dueInfo(l);
    const noteCls = l.returnedAt ? "" : info.cls === "late" ? "late-note" : info.cls === "soon" ? "soon-note" : "";
    return `
    <tr class="${isLate(l) ? "is-late" : ""}">
      <td><div class="table-item">${symbol(itemOf(l)?.category)}<div><strong>${escapeHTML(l.itemName)}</strong><small>${escapeHTML(l.purpose || "Tanpa keterangan")}</small></div></div></td>
      <td data-label="Peminjam"><div><strong>${escapeHTML(l.borrower)}</strong><small>${escapeHTML(l.unit)}</small></div></td>
      <td data-label="Tanggal pinjam">${formatDate(l.loanDate)}</td>
      <td data-label="Batas kembali"><div><strong>${formatDate(l.dueDate)}</strong>${l.returnedAt ? "" : `<small class="${noteCls}">${info.text}</small>`}</div></td>
      <td data-label="Status">${loanStatus(l)}</td>
      <td data-label="Aksi">${isActive(l) ? `<button class="table-action" data-return="${l.id}">${ic("return")}Kembalikan</button>` : "–"}</td>
    </tr>`;
  }).join("");
  $("loansEmpty").classList.toggle("hidden", list.length > 0);
  document.querySelectorAll("[data-return]").forEach(b => b.addEventListener("click", () => returnLoan(Number(b.dataset.return))));
}

function renderHistory() {
  const list = state.loans.filter(l => l.returnedAt).sort((a, b) => b.id - a.id);
  $("historyTable").innerHTML = list.map(l => `
    <tr>
      <td><div class="table-item">${symbol(itemOf(l)?.category)}<strong>${escapeHTML(l.itemName)}</strong></div></td>
      <td data-label="Peminjam"><div><strong>${escapeHTML(l.borrower)}</strong><small>${escapeHTML(l.unit)}</small></div></td>
      <td data-label="Tanggal pinjam">${formatDate(l.loanDate)}</td>
      <td data-label="Tanggal kembali">${formatDate(l.returnedAt)}</td>
      <td data-label="Status"><span class="status returned">${ic("check")}Dikembalikan</span></td>
    </tr>`).join("");
  $("historyEmpty").classList.toggle("hidden", list.length > 0);
}

function refresh() { renderDashboard(); renderItems(); renderLoans(); renderHistory(); }

/* ---------- Modal (fokus dijaga, Esc menutup) ---------- */
let lastFocus = null;
let confirmResolver = null;

function openModal(id) {
  lastFocus = document.activeElement;
  const modal = $(id);
  modal.classList.remove("hidden");
  const first = modal.querySelector("input:not([type=hidden]), select, textarea, button.primary-btn");
  setTimeout(() => first && first.focus(), 30);
}
function closeModal(id) {
  $(id).classList.add("hidden");
  if (id === "confirmModal" && confirmResolver) { confirmResolver(false); confirmResolver = null; }
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}
function showConfirm(title, text, yesLabel) {
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = text;
  $("confirmYes").textContent = yesLabel;
  return new Promise(resolve => { confirmResolver = resolve; openModal("confirmModal"); $("confirmYes").focus(); });
}

function openLoan(itemId = null) {
  const available = state.items.filter(i => availableQty(i) > 0);
  if (!available.length) { showToast("Belum ada barang yang tersedia untuk dipinjam."); return; }
  $("loanForm").reset();
  $("loanItem").innerHTML = available.map(i =>
    `<option value="${i.id}" ${i.id === itemId ? "selected" : ""}>${escapeHTML(i.name)} (${availableQty(i)} tersedia)</option>`).join("");
  const today = dateOffset(0);
  $("loanDate").value = today; $("loanDate").min = today;
  $("dueDate").value = dateOffset(3); $("dueDate").min = today;
  openModal("loanModal");
}

async function returnLoan(id) {
  const loan = state.loans.find(l => l.id === id);
  if (!loan || !isActive(loan)) return;
  const ok = await showConfirm("Barang sudah kembali?", `Tandai "${loan.itemName}" dari ${loan.borrower} sebagai sudah dikembalikan.`, "Ya, sudah kembali");
  if (!ok) return;
  loan.returnedAt = dateOffset(0);
  saveState(); refresh(); showToast("Pengembalian berhasil dicatat.");
}

/* ---------- Event ---------- */
document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => go(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
$("browseItems").addEventListener("click", () => {
  $("categoryFilter").value = "all"; $("availabilityFilter").value = "all"; go("items");
});
["newLoanTop", "newLoanBtn", "heroLoan"].forEach(id => $(id).addEventListener("click", () => openLoan()));
$("addItemBtn").addEventListener("click", () => openModal("itemModal"));

// Pencarian di topbar dan di halaman barang saling sinkron
$("globalSearch").addEventListener("input", () => {
  $("itemSearch").value = $("globalSearch").value;
  if (!$("itemsView").classList.contains("active")) go("items"); else renderItems();
});
$("itemSearch").addEventListener("input", () => { $("globalSearch").value = $("itemSearch").value; renderItems(); });
["categoryFilter", "availabilityFilter"].forEach(id => $(id).addEventListener("input", renderItems));
["loanSearch", "loanStatusFilter"].forEach(id => $(id).addEventListener("input", renderLoans));

document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(backdrop =>
  backdrop.addEventListener("mousedown", e => { if (e.target === backdrop) closeModal(backdrop.id); }));
$("confirmNo").addEventListener("click", () => closeModal("confirmModal"));
$("confirmYes").addEventListener("click", () => {
  const resolve = confirmResolver; confirmResolver = null;
  closeModal("confirmModal");
  if (resolve) resolve(true);
});

document.addEventListener("keydown", e => {
  const open = [...document.querySelectorAll(".modal-backdrop:not(.hidden)")].pop();
  if (!open) return;
  if (e.key === "Escape") { closeModal(open.id); return; }
  if (e.key === "Tab") { // jaga fokus tetap di dalam modal
    const focusable = [...open.querySelectorAll("button, input, select, textarea, [href]")].filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

$("loanDate").addEventListener("change", e => {
  $("dueDate").min = e.target.value;
  if ($("dueDate").value < e.target.value) $("dueDate").value = e.target.value;
});

$("loanForm").addEventListener("submit", e => {
  e.preventDefault();
  const itemId = Number($("loanItem").value);
  const item = state.items.find(i => i.id === itemId);
  if (!item || availableQty(item) <= 0) { showToast("Maaf, barang itu baru saja tidak tersedia."); closeModal("loanModal"); refresh(); return; }
  const loanDate = $("loanDate").value, dueDate = $("dueDate").value;
  if (dueDate < loanDate) { showToast("Tanggal kembali tidak boleh sebelum tanggal pinjam."); return; }
  state.loans.push({
    id: Date.now(), itemId, itemName: item.name,
    borrower: $("borrowerName").value.trim(), unit: $("borrowerUnit").value.trim(),
    loanDate, dueDate, purpose: $("loanPurpose").value.trim(), returnedAt: null
  });
  saveState(); closeModal("loanModal"); refresh(); showToast("Peminjaman berhasil dicatat.");
});

$("itemForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("newItemName").value.trim();
  const category = $("newItemCategory").value;
  const qty = Number($("newItemQty").value);
  const location = $("newItemLocation").value.trim();
  if (!name || !location || !(qty >= 1)) { showToast("Periksa kembali data barang."); return; }
  state.items.push({ id: Date.now(), name, category, qty, location });
  saveState(); closeModal("itemModal"); e.target.reset();
  $("categoryFilter").value = "all"; $("availabilityFilter").value = "all"; $("itemSearch").value = ""; $("globalSearch").value = "";
  refresh(); go("items"); showToast("Barang berhasil ditambahkan.");
});

$("dateLabel").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
refresh();
go("dashboard");
