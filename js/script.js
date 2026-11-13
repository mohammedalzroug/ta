// ================================
//   ماي فون ستور - ملف الجافاسكربت
// ================================

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// حماية النصوص قبل وضعها في الصفحة
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function money(n) { return `${Math.round(n * 100) / 100} ${CURRENCY}`; }

let products = [];
let settings = DEFAULT_SETTINGS;
let device = null;

// ===== الشريط العلوي =====
const navbar = $("#navbar");
const navLinks = $("#navLinks");
const toTop = $("#toTop");

$("#menuBtn").addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

window.addEventListener("scroll", () => {
  navbar.classList.toggle("scrolled", window.scrollY > 50);
  toTop.classList.toggle("show", window.scrollY > 500);

  let current = "home";
  $$("section[id]").forEach((sec) => {
    if (!sec.hidden && window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.classList.toggle("active", a.getAttribute("href") === "#" + current)
  );
});

toTop.addEventListener("click", () => window.scrollTo({ top: 0 }));

// ===== الوضع الليلي =====
const themeBtn = $("#themeToggle");
function setTheme(dark) {
  document.body.classList.toggle("dark", dark);
  themeBtn.textContent = dark ? "☀️" : "🌙";
  try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
}
themeBtn.addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
try { if (localStorage.getItem("theme") === "dark") setTheme(true); } catch (e) {}

// ===== السلايدر =====
const slides = $$(".slide");
const dotsBox = $("#dots");
let slideIndex = 0;
let slideTimer;

slides.forEach((_, i) => {
  const dot = document.createElement("button");
  dot.setAttribute("aria-label", "الشريحة " + (i + 1));
  dot.addEventListener("click", () => showSlide(i));
  dotsBox.appendChild(dot);
});

function showSlide(i) {
  slideIndex = (i + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle("active", n === slideIndex));
  dotsBox.querySelectorAll("button").forEach((d, n) => d.classList.toggle("active", n === slideIndex));
  clearInterval(slideTimer);
  slideTimer = setInterval(() => showSlide(slideIndex + 1), 5000);
}
$("#nextSlide").addEventListener("click", () => showSlide(slideIndex + 1));
$("#prevSlide").addEventListener("click", () => showSlide(slideIndex - 1));
showSlide(0);

// ===== عرض المنتجات =====
const grid = $("#productsGrid");
let currentCat = "all";

function stars(n) {
  n = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function productImage(p) {
  return p.img
    ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">`
    : `<span class="emoji">${esc(p.emoji || "📦")}</span>`;
}

function visibleProducts() { return products.filter((p) => p.active !== false); }

function renderProducts() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const sort = $("#sortSelect").value;

  let list = visibleProducts().filter(
    (p) =>
      (currentCat === "all" || p.cat === currentCat) &&
      (p.name.toLowerCase().includes(term) || (p.desc || "").toLowerCase().includes(term))
  );
  if (sort === "low") list.sort((a, b) => finalPrice(a) - finalPrice(b));
  if (sort === "high") list.sort((a, b) => finalPrice(b) - finalPrice(a));

  grid.innerHTML = list
    .map((p) => {
      const d = Number(p.discount) || 0;
      return `
      <div class="product">
        <div class="product-img">
          ${productImage(p)}
          ${d > 0 ? `<span class="tag">خصم ${d}%</span>` : ""}
        </div>
        <div class="product-body">
          <h3>${esc(p.name)}</h3>
          <div class="rating">${stars(p.rating)}</div>
          <p class="desc">${esc(p.desc)}</p>
          <div class="price-row">
            <span class="price">${money(finalPrice(p))}${d > 0 ? `<del>${p.price}</del>` : ""}</span>
            <button class="add-btn" data-id="${esc(p.id)}">أضف للسلة +</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  $("#emptyMsg").hidden = list.length > 0;
}

$("#filters").addEventListener("click", (e) => {
  const btn = e.target.closest(".filter");
  if (!btn) return;
  $$(".filter").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentCat = btn.dataset.cat;
  renderProducts();
});
$("#searchInput").addEventListener("input", renderProducts);
$("#sortSelect").addEventListener("change", renderProducts);

grid.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-btn");
  if (btn) addToCart(btn.dataset.id);
});

// ===== بيانات الزبون المسجّل =====
function getCustomer() {
  try { return JSON.parse(localStorage.getItem("mps_customer")); } catch (e) { return null; }
}
function setCustomer(c) {
  try { localStorage.setItem("mps_customer", JSON.stringify(c)); } catch (e) {}
  updateUserBtn();
}
function updateUserBtn() {
  const c = getCustomer();
  $("#userName").textContent = c ? c.name.split(" ")[0] : "";
}

// تنظيف رقم الهاتف: أرقام فقط
function normalizePhone(v) {
  let d = String(v).replace(/[٠-٩]/g, (x) => "٠١٢٣٤٥٦٧٨٩".indexOf(x)).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  return d;
}
function validPhone(d) { return d.length >= 9 && d.length <= 15; }

// ===== النوافذ المنبثقة =====
function openModal(id) { $(id).classList.add("show"); }
function closeModal(el) { el.classList.remove("show"); }
$$(".modal").forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m || e.target.closest("[data-close]")) closeModal(m);
  });
});

function setFieldError(input, msg) {
  const field = input.parentElement;
  field.classList.toggle("invalid", !!msg);
  field.querySelector(".error").textContent = msg || "";
  return !msg;
}

// ===== تسجيل الزبون =====
$("#userBtn").addEventListener("click", () => {
  const c = getCustomer();
  $("#regName").value = c ? c.name : "";
  $("#regPhone").value = c ? c.phone : "";
  $("#regTitle").textContent = c ? `مرحباً ${c.name} 👋` : "أهلاً بك في ماي فون ستور 👋";
  openModal("#registerModal");
});

$("#registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#regName").value.trim();
  const phone = normalizePhone($("#regPhone").value);
  const ok1 = setFieldError($("#regName"), name.length >= 3 ? "" : "الرجاء إدخال الاسم (3 أحرف على الأقل)");
  const ok2 = setFieldError($("#regPhone"), validPhone(phone) ? "" : "الرجاء إدخال رقم هاتف صحيح");
  if (!ok1 || !ok2) return;

  const isNew = !getCustomer();
  setCustomer({ name, phone });
  closeModal($("#registerModal"));
  showToast(isNew ? `أهلاً ${name}، تم تسجيلك بنجاح 🎉` : "تم تحديث بياناتك ✅");
  try { await DB.saveCustomer({ name, phone, ...device }, false); } catch (err) { console.error(err); }
});

// ===== سلة المشتريات =====
let cart = [];
try { cart = JSON.parse(localStorage.getItem("mps_cart")) || []; } catch (e) { cart = []; }
let coupon = null; // { code, percent, category }

const cartEl = $("#cart");
const overlay = $("#overlay");

function saveCart() {
  try { localStorage.setItem("mps_cart", JSON.stringify(cart)); } catch (e) {}
}

function openCart() { cartEl.classList.add("open"); overlay.classList.add("show"); }
function closeCart() { cartEl.classList.remove("open"); overlay.classList.remove("show"); }
$("#cartOpen").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeCart();
  $$(".modal.show").forEach(closeModal);
});

function findProduct(id) { return products.find((x) => x.id === id && x.active !== false); }

function addToCart(id) {
  const p = findProduct(id);
  if (!p) return;
  const item = cart.find((c) => c.id === id);
  if (item) item.qty++;
  else cart.push({ id, qty: 1 });
  updateCart();
  showToast(`تمت إضافة "${p.name}" إلى السلة ✅`);
  const count = $("#cartCount");
  count.classList.remove("bump");
  void count.offsetWidth;
  count.classList.add("bump");
}

function changeQty(id, delta) {
  const item = cart.find((c) => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((c) => c.id !== id);
  updateCart();
}

// حساب السلة: المنتجات، المجموع، الخصم، الإجمالي
function cartTotals() {
  const lines = cart
    .map((c) => ({ ...c, p: findProduct(c.id) }))
    .filter((l) => l.p)
    .map((l) => ({ ...l, unit: finalPrice(l.p), sum: finalPrice(l.p) * l.qty }));
  const subtotal = lines.reduce((s, l) => s + l.sum, 0);
  let discount = 0;
  if (coupon) {
    discount = lines
      .filter((l) => coupon.category === "all" || l.p.cat === coupon.category)
      .reduce((s, l) => s + (l.sum * coupon.percent) / 100, 0);
    discount = Math.round(discount * 100) / 100;
  }
  return { lines, subtotal, discount, total: subtotal - discount };
}

function updateCart() {
  // إزالة المنتجات المحذوفة من السلة
  cart = cart.filter((c) => findProduct(c.id));
  const box = $("#cartItems");
  const { lines, subtotal, discount, total } = cartTotals();

  if (lines.length === 0) {
    box.innerHTML = `<p class="cart-empty">السلة فارغة 🛍️<br>ابدأ بإضافة بعض المنتجات!</p>`;
  } else {
    box.innerHTML = lines
      .map(({ p, qty, unit }) => `
        <div class="cart-item">
          <div class="thumb">${p.img ? `<img src="${esc(p.img)}" alt="">` : esc(p.emoji || "📦")}</div>
          <div class="info">
            <h4>${esc(p.name)}</h4>
            <small>${money(unit)}</small>
            <div class="qty">
              <button data-act="plus" data-id="${esc(p.id)}">+</button>
              <span>${qty}</span>
              <button data-act="minus" data-id="${esc(p.id)}">−</button>
            </div>
          </div>
          <button class="remove" data-act="remove" data-id="${esc(p.id)}" aria-label="حذف">🗑️</button>
        </div>`)
      .join("");
  }

  $("#cartSubtotal").textContent = money(subtotal);
  $("#discountRow").hidden = !discount;
  $("#cartDiscount").textContent = "- " + money(discount);
  $("#cartTotal").textContent = Math.round(total * 100) / 100;
  $("#cartCount").textContent = cart.reduce((s, c) => s + c.qty, 0);
  saveCart();
}

$("#cartItems").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === "plus") changeQty(id, 1);
  if (btn.dataset.act === "minus") changeQty(id, -1);
  if (btn.dataset.act === "remove") { cart = cart.filter((c) => c.id !== id); updateCart(); }
});

$("#clearCart").addEventListener("click", () => {
  cart = [];
  coupon = null;
  $("#couponInput").value = "";
  updateCart();
});

// ===== كوبون الخصم =====
function offerActive() {
  const o = settings.offer;
  if (!o || !o.enabled || !o.code) return false;
  return !o.endDate || new Date(o.endDate + "T23:59:59").getTime() > Date.now();
}

$("#couponForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = $("#couponInput").value.trim().toUpperCase();
  if (!code) return;
  if (offerActive() && code === String(settings.offer.code).toUpperCase()) {
    coupon = { code, percent: Number(settings.offer.percent) || 0, category: settings.offer.category || "all" };
    showToast(`تم تطبيق خصم ${coupon.percent}% ✅`);
  } else {
    coupon = null;
    showToast("كود الخصم غير صحيح أو منتهي ❌");
  }
  updateCart();
});

// ===== إتمام الطلب عبر واتساب =====
$("#checkoutBtn").addEventListener("click", () => {
  if (cartTotals().lines.length === 0) return showToast("السلة فارغة! أضف منتجات أولاً");
  const c = getCustomer();
  $("#coName").value = c ? c.name : "";
  $("#coPhone").value = c ? c.phone : "";
  try { $("#coAddress").value = localStorage.getItem("mps_address") || ""; } catch (e) {}
  const { lines, subtotal, discount, total } = cartTotals();
  $("#orderSummary").innerHTML =
    lines.map((l) => `<div><span>${esc(l.p.name)} × ${l.qty}</span><span>${money(l.sum)}</span></div>`).join("") +
    (discount ? `<div class="discount-row"><span>خصم الكوبون</span><span>- ${money(discount)}</span></div>` : "") +
    `<div class="os-total"><span>الإجمالي</span><span>${money(total)}</span></div>`;
  closeCart();
  openModal("#checkoutModal");
});

$("#checkoutForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#coName").value.trim();
  const phone = normalizePhone($("#coPhone").value);
  const address = $("#coAddress").value.trim();
  const notes = $("#coNotes").value.trim();
  const ok = [
    setFieldError($("#coName"), name.length >= 3 ? "" : "الرجاء إدخال الاسم"),
    setFieldError($("#coPhone"), validPhone(phone) ? "" : "الرجاء إدخال رقم هاتف صحيح"),
    setFieldError($("#coAddress"), address.length >= 2 ? "" : "الرجاء إدخال المدينة أو العنوان"),
  ].every(Boolean);
  if (!ok) return;

  const { lines, subtotal, discount, total } = cartTotals();
  const shopNumber = normalizePhone(settings.whatsapp || DEFAULT_WHATSAPP);

  // نص الرسالة
  let msg = `🛒 *طلب جديد - ماي فون ستور*\n\n`;
  msg += `👤 الاسم: ${name}\n📞 الهاتف: ${phone}\n📍 العنوان: ${address}\n\n`;
  msg += `*المنتجات:*\n`;
  lines.forEach((l, i) => { msg += `${i + 1}) ${l.p.name} × ${l.qty} = ${money(l.sum)}\n`; });
  msg += `\nالمجموع: ${money(subtotal)}\n`;
  if (discount) msg += `خصم الكوبون (${coupon.code}): - ${money(discount)}\n`;
  msg += `*الإجمالي: ${money(total)}*\n`;
  if (notes) msg += `\n📝 ملاحظات: ${notes}`;

  // حفظ الزبون والطلب في لوحة التحكم (بدون انتظار حتى لا يتأخر فتح واتساب)
  setCustomer({ name, phone });
  try { localStorage.setItem("mps_address", address); } catch (err) {}
  DB.saveCustomer({ name, phone, ...device }, false).catch(console.error);
  DB.addOrder({
    name, phone, address, notes,
    items: lines.map((l) => ({ id: l.p.id, name: l.p.name, qty: l.qty, price: l.unit })),
    subtotal, discount, total, coupon: coupon ? coupon.code : "",
    deviceType: device ? device.deviceType : "", os: device ? device.os : "",
  }).catch(console.error);

  window.open(`https://wa.me/${shopNumber}?text=${encodeURIComponent(msg)}`, "_blank");

  cart = [];
  coupon = null;
  $("#couponInput").value = "";
  $("#coNotes").value = "";
  updateCart();
  closeModal($("#checkoutModal"));
  showToast("تم تجهيز طلبك، أكمل الإرسال في واتساب 💚");
});

// ===== الإشعارات =====
let toastTimer;
function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

// ===== قسم العروض والعد التنازلي =====
let cdTimer;
function pad(n) { return String(n).padStart(2, "0"); }
function setupOffer() {
  const show = offerActive();
  $("#offers").hidden = !show;
  navLinks.querySelector('a[href="#offers"]').hidden = !show;
  $("#heroOffersBtn").setAttribute("href", show ? "#offers" : "#products");
  if (!show) return;
  const o = settings.offer;
  $("#offerTitle").textContent = o.title;
  $("#offerCode").textContent = o.code;
  const end = o.endDate ? new Date(o.endDate + "T23:59:59").getTime() : null;
  $("#countdown").hidden = !end;
  if (!end) return;
  const tick = () => {
    const diff = Math.max(0, end - Date.now());
    $("#cdDays").textContent = pad(Math.floor(diff / 86400000));
    $("#cdHours").textContent = pad(Math.floor((diff / 3600000) % 24));
    $("#cdMins").textContent = pad(Math.floor((diff / 60000) % 60));
    $("#cdSecs").textContent = pad(Math.floor((diff / 1000) % 60));
  };
  tick();
  clearInterval(cdTimer);
  cdTimer = setInterval(tick, 1000);
}

// ===== عدادات الإحصائيات =====
function runCounter(el) {
  const target = Number(el.dataset.target);
  const start = performance.now();
  const duration = 1500;
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===== حركة الظهور عند التمرير =====
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      entry.target.querySelectorAll(".counter").forEach(runCounter);
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.15 }
);
$$(".reveal").forEach((el) => observer.observe(el));

// ===== نموذج التواصل =====
$("#contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#cName"), email = $("#cEmail"), msg = $("#cMsg");
  const ok = [
    setFieldError(name, name.value.trim().length >= 3 ? "" : "الرجاء إدخال اسم صحيح (3 أحرف على الأقل)"),
    setFieldError(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? "" : "الرجاء إدخال بريد إلكتروني صحيح"),
    setFieldError(msg, msg.value.trim().length >= 10 ? "" : "الرسالة قصيرة جداً (10 أحرف على الأقل)"),
  ].every(Boolean);
  if (!ok) return;

  // إرسال الرسالة على واتساب المحل
  const text = `✉️ رسالة من الموقع\nالاسم: ${name.value.trim()}\nالبريد: ${email.value.trim()}\n\n${msg.value.trim()}`;
  window.open(`https://wa.me/${normalizePhone(settings.whatsapp || DEFAULT_WHATSAPP)}?text=${encodeURIComponent(text)}`, "_blank");
  showToast("شكراً لتواصلك معنا 💛");
  e.target.reset();
});

// ===== تسجيل الزيارة =====
async function trackVisit() {
  device = await Device.get();
  let vid;
  try {
    vid = localStorage.getItem("mps_vid");
    if (!vid) { vid = uid(); localStorage.setItem("mps_vid", vid); }
  } catch (e) { vid = uid(); }

  let alreadyLogged = false;
  try { alreadyLogged = sessionStorage.getItem("mps_visit") === "1"; } catch (e) {}
  if (alreadyLogged) return;
  try { sessionStorage.setItem("mps_visit", "1"); } catch (e) {}

  const c = getCustomer();
  try {
    await DB.logVisit({ vid, ...device, phone: c ? c.phone : "", ref: document.referrer ? new URL(document.referrer).hostname : "" });
    if (c) await DB.saveCustomer({ ...c, ...device }, true);
  } catch (e) { console.error(e); }

  // دعوة الزائر الجديد للتسجيل بعد قليل
  if (!c) setTimeout(() => { if (!getCustomer() && !$(".modal.show")) openModal("#registerModal"); }, 8000);
}

// ===== التشغيل =====
(async function start() {
  $("#year").textContent = new Date().getFullYear();
  $$(".cur").forEach((el) => (el.textContent = CURRENCY));
  updateUserBtn();
  await DB.init();
  try {
    [products, settings] = await Promise.all([DB.getProducts(), DB.getSettings()]);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<p class="loading">تعذر تحميل المنتجات، حاول تحديث الصفحة.</p>`;
    return;
  }
  renderProducts();
  updateCart();
  setupOffer();
  trackVisit();
})();
