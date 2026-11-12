// ================================
//   ماي فون ستور - ملف الجافاسكربت
// ================================

// ===== بيانات المنتجات =====
const products = [
  { id: 1,  name: "كفر السلاحف الفضائية", desc: "تصميم فني مميز لهاتف آيفون", price: 45, oldPrice: 60, cat: "cases", img: "img/card1.jpg", rating: 5 },
  { id: 2,  name: "كفر بتصميم جديد",       desc: "كفر آيفون بألوان عصرية",        price: 35, cat: "cases", img: "img/card2.jpg", rating: 4 },
  { id: 3,  name: "كفر بسيط شفاف",         desc: "تصميم بسيط يحمي هاتفك",         price: 25, cat: "cases", img: "img/card3.jpg", rating: 4 },
  { id: 4,  name: "شاحن سريع 25 واط",      desc: "شحن سريع مع منفذ USB-C",        price: 55, cat: "chargers", emoji: "🔌", rating: 5 },
  { id: 5,  name: "شاحن لاسلكي",           desc: "قاعدة شحن لاسلكية 15 واط",      price: 70, oldPrice: 90, cat: "chargers", emoji: "⚡", rating: 4 },
  { id: 6,  name: "باور بانك 20000mAh",    desc: "بطارية متنقلة بسعة كبيرة",      price: 95, cat: "chargers", emoji: "🔋", rating: 5 },
  { id: 7,  name: "سماعات لاسلكية",        desc: "صوت نقي وعزل للضوضاء",           price: 120, oldPrice: 150, cat: "audio", emoji: "🎧", rating: 5 },
  { id: 8,  name: "سماعات أذن بلوتوث",     desc: "خفيفة ومريحة مع علبة شحن",       price: 85, cat: "audio", emoji: "🎵", rating: 4 },
  { id: 9,  name: "سماعة مكبر صوت",        desc: "سبيكر محمول مقاوم للماء",         price: 110, cat: "audio", emoji: "🔊", rating: 4 },
  { id: 10, name: "حامي شاشة زجاجي",       desc: "زجاج مقوى ضد الخدوش والكسر",     price: 15, cat: "other", emoji: "🛡️", rating: 5 },
  { id: 11, name: "حامل هاتف للسيارة",     desc: "تثبيت مغناطيسي قوي",              price: 30, cat: "other", emoji: "🚗", rating: 4 },
  { id: 12, name: "ساعة ذكية",             desc: "تتبع اللياقة والإشعارات",          price: 180, oldPrice: 220, cat: "other", emoji: "⌚", rating: 5 },
];

const CURRENCY = "د.ل";

// ===== اختصارات =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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

  // تفعيل الرابط الحالي حسب القسم
  let current = "home";
  $$("section[id]").forEach((sec) => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
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
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function renderProducts() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const sort = $("#sortSelect").value;

  let list = products.filter(
    (p) =>
      (currentCat === "all" || p.cat === currentCat) &&
      (p.name.toLowerCase().includes(term) || p.desc.toLowerCase().includes(term))
  );
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);

  grid.innerHTML = list
    .map(
      (p) => `
      <div class="product">
        <div class="product-img">
          ${p.img ? `<img src="${p.img}" alt="${p.name}" loading="lazy">` : `<span class="emoji">${p.emoji}</span>`}
          ${p.oldPrice ? `<span class="tag">خصم ${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ""}
        </div>
        <div class="product-body">
          <h3>${p.name}</h3>
          <div class="rating">${stars(p.rating)}</div>
          <p class="desc">${p.desc}</p>
          <div class="price-row">
            <span class="price">${p.price} ${CURRENCY}${p.oldPrice ? `<del>${p.oldPrice}</del>` : ""}</span>
            <button class="add-btn" data-id="${p.id}">أضف للسلة +</button>
          </div>
        </div>
      </div>`
    )
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
  if (btn) addToCart(Number(btn.dataset.id));
});

// ===== سلة المشتريات =====
let cart = [];
try { cart = JSON.parse(localStorage.getItem("cart")) || []; } catch (e) { cart = []; }

const cartEl = $("#cart");
const overlay = $("#overlay");

function saveCart() {
  try { localStorage.setItem("cart", JSON.stringify(cart)); } catch (e) {}
}

function openCart() { cartEl.classList.add("open"); overlay.classList.add("show"); }
function closeCart() { cartEl.classList.remove("open"); overlay.classList.remove("show"); }
$("#cartOpen").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });

function addToCart(id) {
  const item = cart.find((c) => c.id === id);
  if (item) item.qty++;
  else cart.push({ id, qty: 1 });
  updateCart();
  const p = products.find((x) => x.id === id);
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

function updateCart() {
  const box = $("#cartItems");
  let total = 0;
  let count = 0;

  if (cart.length === 0) {
    box.innerHTML = `<p class="cart-empty">السلة فارغة 🛍️<br>ابدأ بإضافة بعض المنتجات!</p>`;
  } else {
    box.innerHTML = cart
      .map((c) => {
        const p = products.find((x) => x.id === c.id);
        if (!p) return "";
        total += p.price * c.qty;
        count += c.qty;
        return `
        <div class="cart-item">
          <div class="thumb">${p.img ? `<img src="${p.img}" alt="">` : p.emoji}</div>
          <div class="info">
            <h4>${p.name}</h4>
            <small>${p.price} ${CURRENCY}</small>
            <div class="qty">
              <button data-act="plus" data-id="${p.id}">+</button>
              <span>${c.qty}</span>
              <button data-act="minus" data-id="${p.id}">−</button>
            </div>
          </div>
          <button class="remove" data-act="remove" data-id="${p.id}" aria-label="حذف">🗑️</button>
        </div>`;
      })
      .join("");
  }

  $("#cartTotal").textContent = total;
  $("#cartCount").textContent = count;
  saveCart();
}

$("#cartItems").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.act === "plus") changeQty(id, 1);
  if (btn.dataset.act === "minus") changeQty(id, -1);
  if (btn.dataset.act === "remove") { cart = cart.filter((c) => c.id !== id); updateCart(); }
});

$("#clearCart").addEventListener("click", () => {
  cart = [];
  updateCart();
});

$("#checkoutBtn").addEventListener("click", () => {
  if (cart.length === 0) return showToast("السلة فارغة! أضف منتجات أولاً");
  showToast("شكراً لك! تم استلام طلبك وسنتواصل معك قريباً 🎉");
  cart = [];
  updateCart();
  closeCart();
});

// ===== الإشعارات =====
let toastTimer;
function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

// ===== العد التنازلي للعرض =====
const offerEnd = Date.now() + 3 * 24 * 60 * 60 * 1000; // ينتهي بعد 3 أيام
function pad(n) { return String(n).padStart(2, "0"); }
function updateCountdown() {
  const diff = Math.max(0, offerEnd - Date.now());
  $("#cdDays").textContent = pad(Math.floor(diff / 86400000));
  $("#cdHours").textContent = pad(Math.floor((diff / 3600000) % 24));
  $("#cdMins").textContent = pad(Math.floor((diff / 60000) % 60));
  $("#cdSecs").textContent = pad(Math.floor((diff / 1000) % 60));
}
updateCountdown();
setInterval(updateCountdown, 1000);

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
  const fields = [
    { el: $("#cName"),  check: (v) => v.length >= 3, msg: "الرجاء إدخال اسم صحيح (3 أحرف على الأقل)" },
    { el: $("#cEmail"), check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: "الرجاء إدخال بريد إلكتروني صحيح" },
    { el: $("#cMsg"),   check: (v) => v.length >= 10, msg: "الرسالة قصيرة جداً (10 أحرف على الأقل)" },
  ];

  let valid = true;
  fields.forEach(({ el, check, msg }) => {
    const ok = check(el.value.trim());
    const field = el.parentElement;
    field.classList.toggle("invalid", !ok);
    field.querySelector(".error").textContent = ok ? "" : msg;
    if (!ok) valid = false;
  });

  if (valid) {
    showToast("تم إرسال رسالتك بنجاح، شكراً لتواصلك معنا 💛");
    e.target.reset();
  }
});

// ===== التشغيل الأولي =====
$("#year").textContent = new Date().getFullYear();
renderProducts();
updateCart();
