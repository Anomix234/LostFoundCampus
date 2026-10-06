// ====== ISI DENGAN DATA PROYEK SUPABASE KAMU ======
const SUPABASE_URL = "https://ivsjbzwlgcuvrkrkmvry.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_GjQpYmBr0iJ5KLaAsy-ncw_-39-QaCz";
// ==================================================

// Bersihkan URL: ambil alamat dasarnya saja (tanpa garis miring / path tambahan)
let baseUrl = SUPABASE_URL.trim();
try { baseUrl = new URL(baseUrl).origin; } catch (e) {}
const db = supabase.createClient(baseUrl, SUPABASE_KEY.trim());
const $ = id => document.getElementById(id);
let reports = [], filter = "", fotoFile = null;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; setTimeout(() => t.hidden = true, 2600); }

// ---------- Ambil data ----------
async function load() {
  const { data, error } = await db.from("reports").select("*").order("created_at", { ascending: false });
  if (error) { toast("Gagal memuat data: " + error.message); return; }
  reports = data;
  render();
}

// ---------- Tampilkan ----------
function render() {
  const q = $("q").value.toLowerCase();
  const st = r => r.done ? "selesai" : r.type;

  $("sH").textContent = reports.filter(r => st(r) === "hilang").length;
  $("sF").textContent = reports.filter(r => st(r) === "ditemukan").length;
  $("sD").textContent = reports.filter(r => r.done).length;

  const rows = reports.filter(r =>
    (!filter || st(r) === filter) &&
    (!q || (r.name + r.location + (r.description || "")).toLowerCase().includes(q)));

  $("grid").innerHTML = rows.length ? rows.map(r => {
    const wa = "https://wa.me/62" + r.contact.replace(/\D/g, "").replace(/^0/, "");
    const media = r.photo_url
      ? `<img src="${esc(r.photo_url)}" alt="${esc(r.name)}" data-zoom="${esc(r.photo_url)}">`
      : r.category.split(" ")[0];
    return `<article class="card ${r.done ? "done" : ""}">
      <div class="img">${media}<span class="badge ${st(r)}">${st(r).toUpperCase()}</span></div>
      <div class="cb">
        <h3>${esc(r.name)}</h3>
        <div class="meta">📍 ${esc(r.location)} · 📅 ${esc(r.date)}</div>
        ${r.description ? `<p>${esc(r.description)}</p>` : ""}
        <div class="act">
          <a href="${wa}" target="_blank" rel="noopener">💬 Hubungi</a>
          <button data-done="${r.id}" data-val="${!r.done}">${r.done ? "Buka lagi" : "✅ Selesai"}</button>
        </div>
      </div></article>`;
  }).join("") : '<div class="empty">Belum ada laporan yang cocok.</div>';
}

// ---------- Kompres foto ----------
function kompres(file) {
  return new Promise((ok, gagal) => {
    const img = new Image();
    img.onerror = gagal;
    img.onload = () => {
      const s = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => ok(b), "image/jpeg", 0.75);
    };
    img.src = URL.createObjectURL(file);
  });
}

$("photo").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  fotoFile = await kompres(f);
  $("prev").src = URL.createObjectURL(fotoFile);
  $("prev").hidden = false;
};

// ---------- Kirim laporan ----------
$("form").onsubmit = async e => {
  e.preventDefault();
  const btn = $("kirim");
  $("err").hidden = true;
  btn.disabled = true; btn.textContent = "Mengirim...";

  try {
    if (SUPABASE_URL.includes("XXXXXXXX") || SUPABASE_KEY.startsWith("ISI_")) {
      throw new Error("SUPABASE_URL dan SUPABASE_KEY di script.js belum diisi.");
    }
    let photo_url = null;
    if (fotoFile) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const up = await db.storage.from("photos").upload(path, fotoFile, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      photo_url = db.storage.from("photos").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await db.from("reports").insert({
      type: document.querySelector('input[name="type"]:checked').value,
      name: $("name").value.trim(), category: $("category").value, date: $("date").value,
      location: $("location").value.trim(), description: $("description").value.trim(),
      contact: $("contact").value.trim(), photo_url
    });
    if (error) throw error;

    $("form").reset(); $("date").value = new Date().toISOString().slice(0, 10);
    fotoFile = null; $("prev").hidden = true;
    $("dlg").close(); toast("Laporan terkirim ✅");
    load();
  } catch (err) {
    console.error(err);
    $("err").textContent = "Gagal mengirim: " + (err.message || err);
    $("err").hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = "Kirim Laporan";
  }
};

// ---------- Interaksi ----------
$("grid").onclick = async e => {
  if (e.target.dataset.zoom) { $("lbImg").src = e.target.dataset.zoom; $("lb").hidden = false; }
  if (e.target.dataset.done) {
    const { error } = await db.from("reports").update({ done: e.target.dataset.val === "true" }).eq("id", e.target.dataset.done);
    if (error) toast("Gagal: " + error.message); else load();
  }
};
$("chips").onclick = e => {
  if (!e.target.dataset.f && e.target.dataset.f !== "") return;
  filter = e.target.dataset.f;
  document.querySelectorAll("#chips button").forEach(b => b.classList.toggle("on", b === e.target));
  render();
};
$("buka").onclick = () => $("dlg").showModal();
$("tutup").onclick = () => $("dlg").close();
$("lb").onclick = () => $("lb").hidden = true;
$("q").oninput = render;

$("date").value = new Date().toISOString().slice(0, 10);

// Update otomatis saat ada laporan baru dari pengguna lain
db.channel("reports").on("postgres_changes", { event: "*", schema: "public", table: "reports" }, load).subscribe();
load();