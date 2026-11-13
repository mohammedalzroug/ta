// =====================================================
//   طبقة البيانات: تعمل مع Firebase أو مع المتصفح (تجريبي)
// =====================================================

// ----- المنتجات الافتراضية (تُستخدم أول مرة فقط) -----
const DEFAULT_PRODUCTS = [
  { id: "p1",  name: "كفر السلاحف الفضائية", desc: "تصميم فني مميز لهاتف آيفون", price: 60,  discount: 25, cat: "cases",    img: "img/card1.jpg", rating: 5 },
  { id: "p2",  name: "كفر بتصميم جديد",       desc: "كفر آيفون بألوان عصرية",       price: 35,  discount: 0,  cat: "cases",    img: "img/card2.jpg", rating: 4 },
  { id: "p3",  name: "كفر بسيط شفاف",         desc: "تصميم بسيط يحمي هاتفك",        price: 25,  discount: 0,  cat: "cases",    img: "img/card3.jpg", rating: 4 },
  { id: "p4",  name: "شاحن سريع 25 واط",      desc: "شحن سريع مع منفذ USB-C",       price: 55,  discount: 0,  cat: "chargers", emoji: "🔌", rating: 5 },
  { id: "p5",  name: "شاحن لاسلكي",           desc: "قاعدة شحن لاسلكية 15 واط",     price: 90,  discount: 20, cat: "chargers", emoji: "⚡", rating: 4 },
  { id: "p6",  name: "باور بانك 20000mAh",    desc: "بطارية متنقلة بسعة كبيرة",     price: 95,  discount: 0,  cat: "chargers", emoji: "🔋", rating: 5 },
  { id: "p7",  name: "سماعات لاسلكية",        desc: "صوت نقي وعزل للضوضاء",          price: 150, discount: 20, cat: "audio",    emoji: "🎧", rating: 5 },
  { id: "p8",  name: "سماعات أذن بلوتوث",     desc: "خفيفة ومريحة مع علبة شحن",      price: 85,  discount: 0,  cat: "audio",    emoji: "🎵", rating: 4 },
  { id: "p9",  name: "سماعة مكبر صوت",        desc: "سبيكر محمول مقاوم للماء",        price: 110, discount: 0,  cat: "audio",    emoji: "🔊", rating: 4 },
  { id: "p10", name: "حامي شاشة زجاجي",       desc: "زجاج مقوى ضد الخدوش والكسر",    price: 15,  discount: 0,  cat: "other",    emoji: "🛡️", rating: 5 },
  { id: "p11", name: "حامل هاتف للسيارة",     desc: "تثبيت مغناطيسي قوي",             price: 30,  discount: 0,  cat: "other",    emoji: "🚗", rating: 4 },
  { id: "p12", name: "ساعة ذكية",             desc: "تتبع اللياقة والإشعارات",         price: 220, discount: 18, cat: "other",    emoji: "⌚", rating: 5 },
].map((p) => ({ active: true, createdAt: 0, ...p }));

const CATEGORIES = { cases: "كفرات", chargers: "شواحن", audio: "سماعات", other: "إكسسوارات" };

const DEFAULT_SETTINGS = {
  whatsapp: typeof DEFAULT_WHATSAPP !== "undefined" ? DEFAULT_WHATSAPP : "",
  offer: {
    enabled: true,
    title: "خصم 30% على جميع الكفرات",
    code: "MYPHONE30",
    percent: 30,
    category: "cases",
    endDate: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
  },
};

// السعر النهائي بعد التخفيض
function finalPrice(p) {
  const d = Number(p.discount) || 0;
  return Math.round(p.price * (1 - d / 100) * 100) / 100;
}

// =====================================================
//   معرفة جهاز الزائر
// =====================================================
const Device = {
  async get() {
    const ua = navigator.userAgent;
    let os = "غير معروف", browser = "غير معروف", model = "";
    let deviceType = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))
      ? "tablet"
      : /Mobi|iPhone|iPod|Android/i.test(ua) ? "mobile" : "desktop";
    // آيباد الحديث يظهر كأنه ماك
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) deviceType = "tablet";

    if (/Android/i.test(ua)) {
      os = "Android";
      const m = ua.match(/Android [\d.]+; ([^;)]+)/);
      if (m && m[1].trim() !== "K") model = m[1].replace(/ Build.*/, "").trim();
    } else if (/iPhone/.test(ua)) { os = "iOS"; model = "iPhone"; }
    else if (/iPad/.test(ua) || (deviceType === "tablet" && /Macintosh/.test(ua))) { os = "iPadOS"; model = "iPad"; }
    else if (/Windows/.test(ua)) os = "Windows";
    else if (/Mac OS X/.test(ua)) os = "macOS";
    else if (/CrOS/.test(ua)) os = "ChromeOS";
    else if (/Linux/.test(ua)) os = "Linux";

    if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet";
    else if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
    else if (/Firefox|FxiOS/.test(ua)) browser = "Firefox";
    else if (/Chrome|CriOS/.test(ua)) browser = "Chrome";
    else if (/Safari/.test(ua)) browser = "Safari";

    // متصفحات كروم الحديثة تُخفي اسم الجهاز، نطلبه بطريقة أخرى
    try {
      if (!model && navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const h = await navigator.userAgentData.getHighEntropyValues(["model"]);
        if (h.model) model = h.model;
      }
    } catch (e) {}

    return { deviceType, os, browser, model, screen: `${screen.width}x${screen.height}` };
  },
};

const DEVICE_NAMES = { mobile: "جوال", tablet: "تابلت", desktop: "كمبيوتر" };

// =====================================================
//   أدوات التخزين المحلي
// =====================================================
const LS = {
  get(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { alert("تعذر الحفظ: مساحة التخزين ممتلئة. جرّب صوراً أصغر."); return false; }
  },
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// =====================================================
//   واجهة قاعدة البيانات
// =====================================================
const DB = {
  mode: "local",
  fs: null,
  auth: null,

  async init({ withAuth = false } = {}) {
    if (typeof FIREBASE_CONFIG === "undefined" || !FIREBASE_CONFIG) return this;
    try {
      const v = "https://www.gstatic.com/firebasejs/10.12.2/";
      await loadScript(v + "firebase-app-compat.js");
      await loadScript(v + "firebase-firestore-compat.js");
      if (withAuth) await loadScript(v + "firebase-auth-compat.js");
      firebase.initializeApp(FIREBASE_CONFIG);
      this.fs = firebase.firestore();
      if (withAuth) this.auth = firebase.auth();
      this.mode = "firebase";
    } catch (e) {
      console.error("تعذر تحميل Firebase، سيتم استخدام الوضع التجريبي", e);
    }
    return this;
  },

  async _all(col) {
    const snap = await this.fs.collection(col).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // ---------- المنتجات ----------
  async getProducts() {
    let list;
    if (this.mode === "firebase") {
      list = await this._all("products");
    } else {
      list = LS.get("mps_products", null);
      if (!list) { list = DEFAULT_PRODUCTS; LS.set("mps_products", list); }
    }
    return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  },

  async saveProduct(p) {
    const data = { ...p };
    if (!data.createdAt) data.createdAt = Date.now();
    if (this.mode === "firebase") {
      const id = data.id; delete data.id;
      if (id) await this.fs.collection("products").doc(id).set(data);
      else { const ref = await this.fs.collection("products").add(data); return { ...data, id: ref.id }; }
      return { ...data, id };
    }
    const list = await this.getProducts();
    if (!data.id) data.id = uid();
    const i = list.findIndex((x) => x.id === data.id);
    if (i >= 0) list[i] = data; else list.push(data);
    LS.set("mps_products", list);
    return data;
  },

  async deleteProduct(id) {
    if (this.mode === "firebase") return this.fs.collection("products").doc(id).delete();
    LS.set("mps_products", (await this.getProducts()).filter((p) => p.id !== id));
  },

  // رفع المنتجات الافتراضية إلى Firebase أول مرة
  async seedProducts() {
    const batch = this.fs.batch();
    DEFAULT_PRODUCTS.forEach((p) => {
      const { id, ...data } = p;
      batch.set(this.fs.collection("products").doc(id), { ...data, createdAt: Date.now() + Number(id.slice(1)) });
    });
    await batch.commit();
  },

  // ---------- الإعدادات ----------
  async getSettings() {
    let s;
    if (this.mode === "firebase") {
      const d = await this.fs.collection("settings").doc("store").get();
      s = d.exists ? d.data() : null;
    } else s = LS.get("mps_settings", null);
    return { ...DEFAULT_SETTINGS, ...(s || {}), offer: { ...DEFAULT_SETTINGS.offer, ...((s && s.offer) || {}) } };
  },

  async saveSettings(s) {
    if (this.mode === "firebase") return this.fs.collection("settings").doc("store").set(s);
    LS.set("mps_settings", s);
  },

  // ---------- الزيارات ----------
  async logVisit(v) {
    const data = { ...v, t: Date.now() };
    if (this.mode === "firebase") return this.fs.collection("visits").add(data);
    const list = LS.get("mps_visits", []);
    list.push(data);
    LS.set("mps_visits", list.slice(-5000));
  },

  async getVisits() {
    if (this.mode === "firebase") return this._all("visits");
    return LS.get("mps_visits", []);
  },

  // ---------- الزبائن ----------
  // يسجل الزبون أو يحدّث بياناته (المعرّف = رقم الهاتف)
  async saveCustomer(c, isNewVisit) {
    const now = Date.now();
    const upd = {
      name: c.name, lastSeen: now,
      deviceType: c.deviceType, os: c.os, browser: c.browser, model: c.model || "", screen: c.screen || "",
    };
    if (this.mode === "firebase") {
      const ref = this.fs.collection("customers").doc(c.phone);
      try {
        if (isNewVisit) upd.visits = firebase.firestore.FieldValue.increment(1);
        await ref.update(upd);
      } catch (e) {
        // الزبون غير موجود: إنشاء جديد
        await ref.set({ ...upd, phone: c.phone, visits: 1, createdAt: now });
      }
      return;
    }
    const list = LS.get("mps_customers", []);
    const old = list.find((x) => x.phone === c.phone);
    if (old) Object.assign(old, upd, { visits: (old.visits || 1) + (isNewVisit ? 1 : 0) });
    else list.push({ ...upd, phone: c.phone, visits: 1, createdAt: now });
    LS.set("mps_customers", list);
  },

  async getCustomers() {
    if (this.mode === "firebase") return this._all("customers");
    return LS.get("mps_customers", []).map((c) => ({ id: c.phone, ...c }));
  },

  async deleteCustomer(phone) {
    if (this.mode === "firebase") return this.fs.collection("customers").doc(phone).delete();
    LS.set("mps_customers", LS.get("mps_customers", []).filter((c) => c.phone !== phone));
  },

  // ---------- الطلبات ----------
  async addOrder(o) {
    const data = { ...o, status: "new", t: Date.now() };
    if (this.mode === "firebase") return this.fs.collection("orders").add(data);
    const list = LS.get("mps_orders", []);
    list.push({ id: uid(), ...data });
    LS.set("mps_orders", list);
  },

  async getOrders() {
    if (this.mode === "firebase") return this._all("orders");
    return LS.get("mps_orders", []);
  },

  async updateOrder(id, data) {
    if (this.mode === "firebase") return this.fs.collection("orders").doc(id).update(data);
    const list = LS.get("mps_orders", []);
    const o = list.find((x) => x.id === id);
    if (o) Object.assign(o, data);
    LS.set("mps_orders", list);
  },

  async deleteOrder(id) {
    if (this.mode === "firebase") return this.fs.collection("orders").doc(id).delete();
    LS.set("mps_orders", LS.get("mps_orders", []).filter((o) => o.id !== id));
  },

  // ---------- دخول المدير ----------
  onAuth(cb) {
    if (this.mode === "firebase") return this.auth.onAuthStateChanged((u) => cb(!!u));
    cb(sessionStorage.getItem("mps_admin") === "1");
  },

  async login(email, password) {
    if (this.mode === "firebase") return this.auth.signInWithEmailAndPassword(email, password);
    const saved = LS.get("mps_admin_pw", DEFAULT_ADMIN_PASSWORD);
    if (password !== saved) throw new Error("كلمة المرور غير صحيحة");
    sessionStorage.setItem("mps_admin", "1");
  },

  async logout() {
    if (this.mode === "firebase") return this.auth.signOut();
    sessionStorage.removeItem("mps_admin");
  },

  setLocalPassword(pw) { LS.set("mps_admin_pw", pw); },
};
