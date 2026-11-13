// =====================================================
//   لوحة تحكم ماي فون ستور
// =====================================================

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function money(n) { return `${Math.round((Number(n) || 0) * 100) / 100} ${CURRENCY}`; }
function fmtNum(n) { return Number(n || 0).toLocaleString("en-US"); }
function fmtDate(t, withTime = true) {
  if (!t) return "-";
  const d = new Date(t);
  const date = d.toLocaleDateString("en-GB");
  return withTime ? `${date} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : date;
}
function dayKey(t) { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

const STATUS = { new: "جديد", confirmed: "مؤكد", delivered: "تم التسليم", cancelled: "ملغي" };
const TAB_TITLES = {
  overview: "نظرة عامة", products: "المنتجات", discounts: "التخفيضات والعروض",
  customers: "الزبائن", orders: "الطلبات", visits: "الزيارات والأجهزة", settings: "الإعدادات",
};

let state = { products: [], settings: DEFAULT_SETTINGS, customers: [], orders: [], visits: [] };

// ===== الإشعارات =====
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ===== الوضع الليلي (نفس إعداد المتجر) =====
try { if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark"); } catch (e) {}

// =====================================================
//   الدخول
// =====================================================
async function boot() {
  await DB.init({ withAuth: true });
  const local = DB.mode === "local";
  $("#loginEmail").hidden = local;
  if (local) {
    const changed = LS.get("mps_admin_pw", null) !== null;
    $("#loginHint").textContent = changed
      ? "الوضع التجريبي: البيانات محفوظة في هذا المتصفح فقط."
      : `الوضع التجريبي: كلمة المرور الافتراضية ${DEFAULT_ADMIN_PASSWORD} (غيّرها من الإعدادات).`;
  }
  DB.onAuth((loggedIn) => {
    $("#loginView").hidden = loggedIn;
    $("#appView").hidden = !loggedIn;
    if (loggedIn) loadAll(true);
  });
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginError").textContent = "";
  try {
    await DB.login($("#loginEmail").value.trim(), $("#loginPass").value);
    $("#loginPass").value = "";
    if (DB.mode === "local") DB.onAuth((ok) => { $("#loginView").hidden = ok; $("#appView").hidden = !ok; if (ok) loadAll(true); });
  } catch (err) {
    $("#loginError").textContent = DB.mode === "local" ? err.message : "البريد أو كلمة المرور غير صحيحة";
  }
});

$("#logoutBtn").addEventListener("click", async () => {
  await DB.logout();
  if (DB.mode === "local") { $("#appView").hidden = true; $("#loginView").hidden = false; }
});

// =====================================================
//   تحميل البيانات
// =====================================================
async function loadAll(first = false) {
  $("#modeBadge").textContent = DB.mode === "firebase" ? "🟢 متصل بـ Firebase" : "🟡 وضع تجريبي (هذا المتصفح فقط)";
  try {
    let [products, settings, customers, orders, visits] = await Promise.all([
      DB.getProducts(), DB.getSettings(), DB.getCustomers(), DB.getOrders(), DB.getVisits(),
    ]);
    // أول تشغيل مع Firebase: رفع المنتجات الافتراضية
    if (first && DB.mode === "firebase" && products.length === 0) {
      await DB.seedProducts();
      products = await DB.getProducts();
      toast("تمت إضافة المنتجات الافتراضية إلى قاعدة البيانات");
    }
    state = { products, settings, customers, orders, visits };
  } catch (err) {
    console.error(err);
    toast("تعذر تحميل البيانات: تأكد من إعدادات Firebase وقواعد الأمان");
  }
  renderAll();
}

function renderAll() {
  renderOverview();
  renderProducts();
  renderDiscounts();
  renderCustomers();
  renderOrders();
  renderVisits();
  renderSettings();
  const newCount = state.orders.filter((o) => (o.status || "new") === "new").length;
  $("#newOrdersPill").hidden = !newCount;
  $("#newOrdersPill").textContent = newCount;
}

$("#refreshBtn").addEventListener("click", () => loadAll().then(() => toast("تم تحديث البيانات ✅")));

// =====================================================
//   التنقل بين الأقسام
// =====================================================
function showTab(name) {
  $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $$(".tab-panel").forEach((p) => (p.hidden = p.id !== "tab-" + name));
  $("#pageTitle").textContent = TAB_TITLES[name];
  $("#sidebar").classList.remove("open");
  window.scrollTo({ top: 0 });
}
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) showTab(b.dataset.tab); });
document.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) showTab(g.dataset.goto); });
$("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

// ملء قوائم الأقسام
["#prodCat", "#bulkCat", "#offerCat"].forEach((sel) => {
  Object.entries(CATEGORIES).forEach(([k, v]) => $(sel).insertAdjacentHTML("beforeend", `<option value="${k}">${v}</option>`));
});
Object.entries(CATEGORIES).forEach(([k, v]) => $("#pCat").insertAdjacentHTML("beforeend", `<option value="${k}">${v}</option>`));
Object.entries(STATUS).forEach(([k, v]) => $("#orderStatus").insertAdjacentHTML("beforeend", `<option value="${k}">${v}</option>`));

// =====================================================
//   الرسوم البيانية
// =====================================================
function countBy(list, fn) {
  const m = {};
  list.forEach((x) => { const k = fn(x) || "غير معروف"; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

// أعمدة أفقية: الاسم - الشريط - العدد والنسبة
function renderHBars(el, data, limit = 6) {
  if (!data.length) { el.innerHTML = `<p class="empty">لا توجد بيانات بعد</p>`; return; }
  const total = data.reduce((s, d) => s + d.value, 0);
  let rows = data.slice(0, limit);
  if (data.length > limit) {
    rows.push({ name: "أخرى", value: data.slice(limit).reduce((s, d) => s + d.value, 0) });
  }
  const max = Math.max(...rows.map((d) => d.value));
  el.innerHTML = rows.map((d) => {
    const pct = Math.round((d.value / total) * 100);
    return `<div class="hbar-row" data-tip="<b>${esc(d.name)}</b>: ${fmtNum(d.value)} (${pct}%)">
      <span class="name">${esc(d.name)}</span>
      <div class="hbar-track"><div class="hbar-fill" style="width:${(d.value / max) * 100}%"></div></div>
      <span class="val">${fmtNum(d.value)} · ${pct}%</span>
    </div>`;
  }).join("");
}

// أعمدة عمودية للزيارات اليومية
function renderVChart(el, data) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;
  const grid = [1, 2, 3, 4].map((i) => `<div class="gridline" style="bottom:${(i * step / top) * 100}%"><span>${i * step}</span></div>`).join("");
  el.innerHTML = `
    <div class="plot">${grid}${data.map((d) =>
      `<div class="col" data-tip="${esc(d.tip)}: <b>${fmtNum(d.value)}</b> زيارة"><div class="bar" style="height:${(d.value / top) * 100}%"></div></div>`).join("")}
    </div>
    <div class="labels">${data.map((d) => `<span>${esc(d.label)}</span>`).join("")}</div>`;
}

// تلميح عند المرور على الرسوم
const tooltip = $("#tooltip");
document.addEventListener("mousemove", (e) => {
  const t = e.target.closest("[data-tip]");
  if (!t) { tooltip.classList.remove("show"); return; }
  tooltip.innerHTML = t.dataset.tip;
  tooltip.classList.add("show");
  const w = tooltip.offsetWidth;
  tooltip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, e.clientX - w / 2)) + "px";
  tooltip.style.top = e.clientY - 40 + "px";
});

function deviceLabel(x) {
  const type = DEVICE_NAMES[x.deviceType] || "غير معروف";
  return x.model ? `${type} (${x.model})` : type;
}

// =====================================================
//   نظرة عامة
// =====================================================
function renderOverview() {
  const { visits, customers, orders } = state;
  const today = dayKey(Date.now());
  const validOrders = orders.filter((o) => o.status !== "cancelled");

  $("#stVisits").textContent = fmtNum(visits.length);
  $("#stUnique").textContent = fmtNum(new Set(visits.map((v) => v.vid)).size);
  $("#stToday").textContent = fmtNum(visits.filter((v) => dayKey(v.t) === today).length);
  $("#stCustomers").textContent = fmtNum(customers.length);
  $("#stOrders").textContent = fmtNum(orders.length);
  $("#stRevenue").textContent = money(validOrders.reduce((s, o) => s + (Number(o.total) || 0), 0));

  // آخر 14 يوماً
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, tip: d.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" }), value: 0 });
  }
  const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
  visits.forEach((v) => { const i = idx[dayKey(v.t)]; if (i !== undefined) days[i].value++; });
  renderVChart($("#visitsChart"), days);

  renderHBars($("#deviceChart"), countBy(visits, (v) => DEVICE_NAMES[v.deviceType]));
  renderHBars($("#osChart"), countBy(visits, (v) => v.os));
  renderHBars($("#browserChart"), countBy(visits, (v) => v.browser));

  const recent = [...orders].sort((a, b) => b.t - a.t).slice(0, 5);
  $("#recentOrders").innerHTML = recent.length
    ? `<thead><tr><th>التاريخ</th><th>الزبون</th><th>الإجمالي</th><th>الحالة</th></tr></thead><tbody>${recent.map((o) => `
      <tr><td class="nowrap">${fmtDate(o.t)}</td><td>${esc(o.name)}<div class="small" dir="ltr">${esc(o.phone)}</div></td>
      <td class="num">${money(o.total)}</td><td><span class="badge st-${o.status || "new"}">${STATUS[o.status || "new"]}</span></td></tr>`).join("")}</tbody>`
    : `<tr><td class="empty">لا توجد طلبات بعد</td></tr>`;
}

// =====================================================
//   المنتجات
// =====================================================
function thumb(p) {
  return `<div class="thumb">${p.img ? `<img src="${esc(p.img)}" alt="">` : esc(p.emoji || "📦")}</div>`;
}

function renderProducts() {
  const term = $("#prodSearch").value.trim().toLowerCase();
  const cat = $("#prodCat").value;
  const list = state.products.filter((p) =>
    (cat === "all" || p.cat === cat) && p.name.toLowerCase().includes(term));

  $("#productsTable").innerHTML = list.length
    ? `<thead><tr><th></th><th>المنتج</th><th>القسم</th><th>السعر</th><th>الخصم</th><th>السعر النهائي</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${list.map((p) => `
      <tr>
        <td>${thumb(p)}</td>
        <td><b>${esc(p.name)}</b><div class="small">${esc(p.desc)}</div></td>
        <td>${CATEGORIES[p.cat] || "-"}</td>
        <td class="num">${money(p.price)}</td>
        <td>${p.discount > 0 ? `<span class="badge sale">${p.discount}%</span>` : "-"}</td>
        <td class="num"><b>${money(finalPrice(p))}</b></td>
        <td><span class="badge ${p.active !== false ? "on" : "off"}">${p.active !== false ? "● ظاهر" : "○ مخفي"}</span></td>
        <td class="nowrap">
          <button class="icon-act" data-edit="${esc(p.id)}" title="تعديل">✏️</button>
          <button class="icon-act" data-toggle="${esc(p.id)}" title="إظهار / إخفاء">${p.active !== false ? "🙈" : "👁️"}</button>
          <button class="icon-act del" data-del="${esc(p.id)}" title="حذف">🗑️</button>
        </td>
      </tr>`).join("")}</tbody>`
    : `<tr><td class="empty">لا توجد منتجات</td></tr>`;
}
$("#prodSearch").addEventListener("input", renderProducts);
$("#prodCat").addEventListener("change", renderProducts);

$("#productsTable").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.edit) openProductForm(state.products.find((p) => p.id === b.dataset.edit));
  if (b.dataset.toggle) {
    const p = state.products.find((x) => x.id === b.dataset.toggle);
    await DB.saveProduct({ ...p, active: p.active === false });
    toast(p.active === false ? "أصبح المنتج ظاهراً" : "تم إخفاء المنتج");
    await reloadProducts();
  }
  if (b.dataset.del) {
    const p = state.products.find((x) => x.id === b.dataset.del);
    if (!confirm(`حذف "${p.name}" نهائياً؟`)) return;
    await DB.deleteProduct(p.id);
    toast("تم حذف المنتج");
    await reloadProducts();
  }
});

async function reloadProducts() {
  state.products = await DB.getProducts();
  renderProducts();
  renderDiscounts();
}

// ----- نافذة إضافة / تعديل منتج -----
const modal = (id) => $(id);
function openModal(id) { modal(id).classList.add("show"); }
function closeModal(el) { el.classList.remove("show"); }
$$(".modal").forEach((m) => m.addEventListener("click", (e) => {
  if (e.target === m || e.target.closest("[data-close]")) closeModal(m);
}));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal.show").forEach(closeModal); });

let editingProduct = null;
function openProductForm(p) {
  editingProduct = p || null;
  $("#productFormTitle").textContent = p ? "تعديل المنتج" : "إضافة منتج جديد";
  $("#pId").value = p ? p.id : "";
  $("#pName").value = p ? p.name : "";
  $("#pDesc").value = p ? p.desc || "" : "";
  $("#pPrice").value = p ? p.price : "";
  $("#pDiscount").value = p ? p.discount || 0 : 0;
  $("#pCat").value = p ? p.cat : "cases";
  $("#pRating").value = p ? p.rating || 5 : 5;
  $("#pImg").value = p && p.img && !p.img.startsWith("data:") ? p.img : "";
  $("#pImg").dataset.upload = p && p.img && p.img.startsWith("data:") ? p.img : "";
  $("#pEmoji").value = p ? p.emoji || "" : "";
  $("#pActive").checked = p ? p.active !== false : true;
  $("#pImgFile").value = "";
  updatePreview();
  openModal("#productModal");
}
$("#addProductBtn").addEventListener("click", () => openProductForm(null));

function currentImg() { return $("#pImg").dataset.upload || $("#pImg").value.trim(); }
function updatePreview() {
  const img = currentImg();
  const emoji = $("#pEmoji").value.trim();
  $("#pPreview").innerHTML = img ? `<img src="${esc(img)}" alt="">` : emoji ? `<span>${esc(emoji)}</span>` : "";
  const price = Number($("#pPrice").value) || 0;
  const d = Number($("#pDiscount").value) || 0;
  $("#pFinal").textContent = price ? `السعر بعد الخصم: ${money(finalPrice({ price, discount: d }))}` : "";
}
["#pPrice", "#pDiscount", "#pEmoji"].forEach((s) => $(s).addEventListener("input", updatePreview));
$("#pImg").addEventListener("input", () => { $("#pImg").dataset.upload = ""; updatePreview(); });

// تصغير الصورة قبل حفظها
$("#pImgFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      $("#pImg").value = "";
      $("#pImg").dataset.upload = c.toDataURL("image/jpeg", 0.8);
      updatePreview();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

$("#productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const discount = Math.max(0, Math.min(90, Number($("#pDiscount").value) || 0));
  const data = {
    ...(editingProduct || {}),
    name: $("#pName").value.trim(),
    desc: $("#pDesc").value.trim(),
    price: Number($("#pPrice").value) || 0,
    discount,
    cat: $("#pCat").value,
    rating: Number($("#pRating").value) || 5,
    img: currentImg(),
    emoji: $("#pEmoji").value.trim(),
    active: $("#pActive").checked,
  };
  if (!data.name || !data.price) return toast("أدخل اسم المنتج والسعر");
  try {
    await DB.saveProduct(data);
    closeModal($("#productModal"));
    toast(editingProduct ? "تم حفظ التعديلات ✅" : "تمت إضافة المنتج ✅");
    await reloadProducts();
  } catch (err) {
    console.error(err);
    toast("تعذر الحفظ: " + (err.message || err));
  }
});

// =====================================================
//   التخفيضات والعروض
// =====================================================
function renderDiscounts() {
  const list = state.products.filter((p) => p.discount > 0);
  $("#discountedTable").innerHTML = list.length
    ? `<thead><tr><th></th><th>المنتج</th><th>قبل</th><th>الخصم</th><th>بعد</th><th></th></tr></thead><tbody>${list.map((p) => `
      <tr><td>${thumb(p)}</td><td>${esc(p.name)}</td><td class="num"><del>${money(p.price)}</del></td>
      <td><span class="badge sale">${p.discount}%</span></td><td class="num"><b>${money(finalPrice(p))}</b></td>
      <td><button class="icon-act" data-undisc="${esc(p.id)}">إلغاء الخصم</button></td></tr>`).join("")}</tbody>`
    : `<tr><td class="empty">لا توجد منتجات مخفّضة حالياً</td></tr>`;

  const o = state.settings.offer;
  $("#offerEnabled").checked = !!o.enabled;
  $("#offerTitle").value = o.title || "";
  $("#offerCode").value = o.code || "";
  $("#offerPercent").value = o.percent || "";
  $("#offerCat").value = o.category || "all";
  $("#offerEnd").value = o.endDate || "";
}

$("#discountedTable").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-undisc]");
  if (!b) return;
  const p = state.products.find((x) => x.id === b.dataset.undisc);
  await DB.saveProduct({ ...p, discount: 0 });
  toast("تم إلغاء الخصم");
  await reloadProducts();
});

async function bulkDiscount(percent) {
  const cat = $("#bulkCat").value;
  const targets = state.products.filter((p) => cat === "all" || p.cat === cat);
  for (const p of targets) await DB.saveProduct({ ...p, discount: percent });
  await reloadProducts();
  return targets.length;
}

$("#bulkDiscountForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pct = Math.max(0, Math.min(90, Number($("#bulkPercent").value) || 0));
  const n = await bulkDiscount(pct);
  toast(`تم تطبيق خصم ${pct}% على ${n} منتج ✅`);
});
$("#removeDiscountsBtn").addEventListener("click", async () => {
  if (!confirm("إلغاء التخفيضات عن منتجات القسم المحدد؟")) return;
  const n = await bulkDiscount(0);
  toast(`تم إلغاء التخفيض عن ${n} منتج`);
});

$("#offerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  state.settings.offer = {
    enabled: $("#offerEnabled").checked,
    title: $("#offerTitle").value.trim(),
    code: $("#offerCode").value.trim().toUpperCase(),
    percent: Number($("#offerPercent").value) || 0,
    category: $("#offerCat").value,
    endDate: $("#offerEnd").value,
  };
  await DB.saveSettings(state.settings);
  toast("تم حفظ العرض ✅");
});

// =====================================================
//   الزبائن
// =====================================================
function waNumber(phone) {
  let p = String(phone || "").replace(/\D/g, "");
  const cc = String(state.settings.countryCode || "218").replace(/\D/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = cc + p.slice(1);
  else if (p.length <= 9) p = cc + p;
  return p;
}

function ordersOf(phone) { return state.orders.filter((o) => o.phone === phone); }

function filteredCustomers() {
  const term = $("#custSearch").value.trim().toLowerCase();
  const dev = $("#custDevice").value;
  return [...state.customers]
    .filter((c) => (dev === "all" || c.deviceType === dev) &&
      ((c.name || "").toLowerCase().includes(term) || (c.phone || "").includes(term)))
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
}

function renderCustomers() {
  const list = filteredCustomers();
  $("#customersTable").innerHTML = list.length
    ? `<thead><tr><th>الاسم</th><th>الهاتف</th><th>الجهاز</th><th>النظام / المتصفح</th><th>الزيارات</th><th>الطلبات</th><th>تاريخ التسجيل</th><th>آخر زيارة</th><th></th></tr></thead>
    <tbody>${list.map((c) => {
      const ords = ordersOf(c.phone);
      const spent = ords.filter((o) => o.status !== "cancelled").reduce((s, o) => s + (Number(o.total) || 0), 0);
      return `<tr>
        <td><b>${esc(c.name)}</b></td>
        <td class="nowrap" dir="ltr">${esc(c.phone)}</td>
        <td>${esc(deviceLabel(c))}</td>
        <td>${esc(c.os || "-")}<div class="small">${esc(c.browser || "")}</div></td>
        <td class="num">${fmtNum(c.visits || 1)}</td>
        <td class="num">${ords.length}${ords.length ? `<div class="small">${money(spent)}</div>` : ""}</td>
        <td class="nowrap">${fmtDate(c.createdAt, false)}</td>
        <td class="nowrap">${fmtDate(c.lastSeen)}</td>
        <td class="nowrap">
          <a class="icon-act" href="https://wa.me/${waNumber(c.phone)}" target="_blank" rel="noopener" title="مراسلة على واتساب">💬</a>
          <a class="icon-act" href="tel:${esc(c.phone)}" title="اتصال">📞</a>
          <button class="icon-act del" data-delcust="${esc(c.phone)}" title="حذف">🗑️</button>
        </td>
      </tr>`;
    }).join("")}</tbody>`
    : `<tr><td class="empty">لا يوجد زبائن مسجلون بعد</td></tr>`;
}
$("#custSearch").addEventListener("input", renderCustomers);
$("#custDevice").addEventListener("change", renderCustomers);

$("#customersTable").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-delcust]");
  if (!b || !confirm("حذف هذا الزبون؟")) return;
  await DB.deleteCustomer(b.dataset.delcust);
  state.customers = await DB.getCustomers();
  renderCustomers();
  renderOverview();
  toast("تم حذف الزبون");
});

// تصدير ملف يفتح في Excel
$("#exportCustomers").addEventListener("click", () => {
  const rows = [["الاسم", "الهاتف", "نوع الجهاز", "الموديل", "النظام", "المتصفح", "الزيارات", "عدد الطلبات", "تاريخ التسجيل", "آخر زيارة"]];
  filteredCustomers().forEach((c) => rows.push([
    c.name, c.phone, DEVICE_NAMES[c.deviceType] || "", c.model || "", c.os || "", c.browser || "",
    c.visits || 1, ordersOf(c.phone).length, fmtDate(c.createdAt, false), fmtDate(c.lastSeen),
  ]));
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// =====================================================
//   الطلبات
// =====================================================
function renderOrders() {
  const term = $("#orderSearch").value.trim().toLowerCase();
  const st = $("#orderStatus").value;
  const list = [...state.orders]
    .filter((o) => (st === "all" || (o.status || "new") === st) &&
      ((o.name || "").toLowerCase().includes(term) || (o.phone || "").includes(term)))
    .sort((a, b) => b.t - a.t);

  $("#ordersTable").innerHTML = list.length
    ? `<thead><tr><th>التاريخ</th><th>الزبون</th><th>العنوان</th><th>المنتجات</th><th>الإجمالي</th><th>الحالة</th><th></th></tr></thead>
    <tbody>${list.map((o) => `
      <tr>
        <td class="nowrap">${fmtDate(o.t)}</td>
        <td><b>${esc(o.name)}</b><div class="small" dir="ltr">${esc(o.phone)}</div></td>
        <td>${esc(o.address)}</td>
        <td>${(o.items || []).map((i) => `${esc(i.name)} × ${i.qty}`).join("<br>")}</td>
        <td class="num"><b>${money(o.total)}</b>${o.coupon ? `<div class="small">كوبون ${esc(o.coupon)}</div>` : ""}</td>
        <td><select class="status-select st-${o.status || "new"}" data-status="${esc(o.id)}">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === (o.status || "new") ? "selected" : ""}>${v}</option>`).join("")}
        </select></td>
        <td class="nowrap">
          <button class="icon-act" data-view="${esc(o.id)}" title="التفاصيل">🔍</button>
          <a class="icon-act" href="https://wa.me/${waNumber(o.phone)}" target="_blank" rel="noopener" title="مراسلة الزبون">💬</a>
          <button class="icon-act del" data-delorder="${esc(o.id)}" title="حذف">🗑️</button>
        </td>
      </tr>`).join("")}</tbody>`
    : `<tr><td class="empty">لا توجد طلبات</td></tr>`;
}
$("#orderSearch").addEventListener("input", renderOrders);
$("#orderStatus").addEventListener("change", renderOrders);

$("#ordersTable").addEventListener("change", async (e) => {
  const s = e.target.closest("[data-status]");
  if (!s) return;
  await DB.updateOrder(s.dataset.status, { status: s.value });
  const o = state.orders.find((x) => x.id === s.dataset.status);
  if (o) o.status = s.value;
  renderAll();
  toast("تم تحديث حالة الطلب");
});

$("#ordersTable").addEventListener("click", async (e) => {
  const v = e.target.closest("[data-view]");
  if (v) return showOrder(state.orders.find((o) => o.id === v.dataset.view));
  const d = e.target.closest("[data-delorder]");
  if (d && confirm("حذف هذا الطلب؟")) {
    await DB.deleteOrder(d.dataset.delorder);
    state.orders = await DB.getOrders();
    renderAll();
    toast("تم حذف الطلب");
  }
});

function showOrder(o) {
  $("#orderDetails").innerHTML = `
    <button type="button" class="modal-close" data-close aria-label="إغلاق">✕</button>
    <h3>تفاصيل الطلب</h3>
    <p class="muted">${fmtDate(o.t)}</p>
    <dl class="kv" style="margin-top:12px">
      <dt>الزبون</dt><dd>${esc(o.name)}</dd>
      <dt>الهاتف</dt><dd dir="ltr" style="text-align:right">${esc(o.phone)}</dd>
      <dt>العنوان</dt><dd>${esc(o.address)}</dd>
      <dt>الجهاز</dt><dd>${esc(DEVICE_NAMES[o.deviceType] || "-")} ${o.os ? "· " + esc(o.os) : ""}</dd>
      ${o.notes ? `<dt>ملاحظات</dt><dd>${esc(o.notes)}</dd>` : ""}
    </dl>
    <div class="order-lines">
      ${(o.items || []).map((i) => `<div><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join("")}
      ${o.discount ? `<div><span>خصم الكوبون ${esc(o.coupon)}</span><span>- ${money(o.discount)}</span></div>` : ""}
      <div class="tot"><span>الإجمالي</span><span>${money(o.total)}</span></div>
    </div>
    <a class="btn primary full" style="display:block;text-align:center" href="https://wa.me/${waNumber(o.phone)}" target="_blank" rel="noopener">💬 مراسلة الزبون على واتساب</a>`;
  openModal("#orderModal");
}

// =====================================================
//   الزيارات والأجهزة
// =====================================================
function renderVisits() {
  const byPhone = Object.fromEntries(state.customers.map((c) => [c.phone, c.name]));
  renderHBars($("#modelChart"), countBy(state.visits, (v) => deviceLabel(v)), 10);
  const list = [...state.visits].sort((a, b) => b.t - a.t).slice(0, 200);
  $("#visitsTable").innerHTML = list.length
    ? `<thead><tr><th>الوقت</th><th>الزائر</th><th>الجهاز</th><th>النظام</th><th>المتصفح</th><th>الشاشة</th><th>المصدر</th></tr></thead>
    <tbody>${list.map((v) => `
      <tr>
        <td class="nowrap">${fmtDate(v.t)}</td>
        <td>${v.phone && byPhone[v.phone] ? `<b>${esc(byPhone[v.phone])}</b>` : `<span class="small">زائر غير مسجل</span>`}</td>
        <td>${esc(deviceLabel(v))}</td>
        <td>${esc(v.os || "-")}</td>
        <td>${esc(v.browser || "-")}</td>
        <td class="num" dir="ltr">${esc(v.screen || "-")}</td>
        <td>${esc(v.ref || "مباشر")}</td>
      </tr>`).join("")}</tbody>`
    : `<tr><td class="empty">لا توجد زيارات بعد</td></tr>`;
}

// =====================================================
//   الإعدادات
// =====================================================
function renderSettings() {
  $("#setWhatsapp").value = state.settings.whatsapp || "";
  $("#setCountry").value = state.settings.countryCode || "218";
  const local = DB.mode === "local";
  $("#pwNote").textContent = local
    ? "في الوضع التجريبي تُحفظ كلمة المرور في هذا المتصفح."
    : "في وضع Firebase تُغيَّر كلمة المرور من Firebase Console ← Authentication.";
  $("#newPass").disabled = !local;
  $("#pwBtn").disabled = !local;
  $("#dbStatus").innerHTML = local
    ? "🟡 <b>وضع تجريبي:</b> كل البيانات (المنتجات، الزبائن، الزيارات، الطلبات) محفوظة في هذا المتصفح فقط، ولن تظهر هنا زيارات وطلبات الأجهزة الأخرى. لتفعيل قاعدة بيانات حقيقية مشتركة اتبع خطوات Firebase في ملف README.md."
    : "🟢 <b>متصل بـ Firebase:</b> البيانات محفوظة على الإنترنت وتظهر لك زيارات وطلبات جميع الزبائن.";
}

$("#settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  state.settings.whatsapp = $("#setWhatsapp").value.replace(/\D/g, "").replace(/^00/, "");
  state.settings.countryCode = $("#setCountry").value.replace(/\D/g, "") || "218";
  await DB.saveSettings(state.settings);
  toast("تم حفظ الإعدادات ✅");
});

$("#passwordForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const pw = $("#newPass").value;
  if (pw.length < 6) return toast("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  DB.setLocalPassword(pw);
  $("#newPass").value = "";
  toast("تم تغيير كلمة المرور ✅");
});

boot();
