/* =========================================================
   THE CORE — ЕДИНОЕ ЯДРО ЛОГИКИ И БАЗЫ ДАННЫХ (js/core.js)
   ========================================================= */

const CORE_CONFIG = {
  apiKey: "AIzaSyDrPu0bv13jvnju8JJyHkgeRQcf66fDtlk",
  authDomain: "our-tracker-3cbb5.firebaseapp.com",
  databaseURL: "https://our-tracker-3cbb5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "our-tracker-3cbb5"
};

let db = null;
if (typeof firebase !== "undefined") {
  if (!firebase.apps.length) {
    firebase.initializeApp(CORE_CONFIG);
  }
  db = firebase.database();
}

/* =========================================================
   1. ГИБРИДНОЕ ХРАНИЛИЩЕ (FIREBASE + LOCALSTORAGE)
   ========================================================= */
const CoreDB = {
  getLocal(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`the_core_${key}`);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn("LocalStorage read error:", err);
      return fallback;
    }
  },

  setLocal(key, value) {
    try {
      localStorage.setItem(`the_core_${key}`, JSON.stringify(value));
    } catch (err) {
      console.warn("LocalStorage write error:", err);
    }
  },

  // Подписка на ветку Firebase с мгновенным кэшем из localStorage
  watch(path, callback, fallback = null) {
    const localKey = path.replace(/\//g, "_");
    const cached = this.getLocal(localKey, fallback);
    if (cached !== null) {
      callback(cached);
    }

    if (db) {
      db.ref(path).on("value", (snap) => {
        const val = snap.exists() ? snap.val() : fallback;
        this.setLocal(localKey, val);
        callback(val);
      });
    }
  },

  // Сохранение в оба хранилища сразу
  save(path, data) {
    const localKey = path.replace(/\//g, "_");
    this.setLocal(localKey, data);
    if (db) {
      return db.ref(path).set(data);
    }
    return Promise.resolve();
  },

  // Добавление записи в список (push)
  push(path, item) {
    if (db) {
      return db.ref(path).push(item);
    }
    const localKey = path.replace(/\//g, "_");
    const current = this.getLocal(localKey, {});
    const fakeId = "loc_" + Date.now();
    current[fakeId] = item;
    this.setLocal(localKey, current);
    return Promise.resolve({ key: fakeId });
  },

  remove(path) {
    if (db) {
      return db.ref(path).remove();
    }
    return Promise.resolve();
  }
};

/* =========================================================
   2. ФОРМАТИРОВАНИЕ И ДАТЫ
   ========================================================= */
function formatKZT(val) {
  const num = Number(val) || 0;
  return `${Math.round(num).toLocaleString("ru-RU")} тг`;
}

function getTodayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDeadlineStats(targetIso = "2026-12-16T00:00:00+05:00") {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  return {
    expired: false,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60)
  };
}

/* =========================================================
   3. УВЕДОМЛЕНИЯ (TOAST), ВСПЫШКИ И АВТО-ЛОГ ПОБЕД
   ========================================================= */
function coreToast(message, type = "gold") {
  let container = document.querySelector(".core-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "core-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `core-toast ${type === "danger" ? "danger" : ""}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function triggerVictoryFlash() {
  document.body.classList.remove("flash-gold");
  void document.body.offsetWidth; // перезапуск анимации
  document.body.classList.add("flash-gold");
}

// Запись важного события напрямую в Журнал Трансформации (changelog.html)
function logVictory(title, desc, category = "finance", major = true) {
  return CoreDB.push("man_changelog", {
    title,
    desc,
    category,
    major,
    timestamp: Date.now()
  });
}