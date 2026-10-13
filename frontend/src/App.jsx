import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STAT_COLORS = ["#8270d8", "#6ba3e8", "#5bb8a8", "#e8c45a", "#e89ab0", "#7a8fd4", "#a99ae8", "#4a9d93"];

const API = "";

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = "请求失败";
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {
      /* ignore */
    }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json();
}

async function apiUpload(path, token, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(API + path, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let msg = "上传失败";
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {
      /* ignore */
    }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json();
}

function UserAvatar({ user, size = 36, className = "" }) {
  const name = user?.display_name || user?.username || "?";
  const initial = name.slice(0, 1);
  const px = size;
  if (user?.avatar_url) {
    return (
      <img
        className={`user-avatar ${className}`}
        src={user.avatar_url}
        alt={name}
        width={px}
        height={px}
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <span
      className={`user-avatar dot-avatar ${className}`}
      style={{ background: user?.avatar_color || "#81B29A", width: px, height: px, fontSize: px * 0.42 }}
    >
      {initial}
    </span>
  );
}

const LEDGER_ICON_KEYS = [
  "notebook",
  "house",
  "user",
  "briefcase",
  "sparkles",
  "utensils",
  "train-front",
  "gift",
  "wallet",
  "book",
  "coffee",
  "package",
];

const LEDGER_EMOJI_TO_ICON = {
  "📒": "notebook",
  "🏠": "house",
  "👤": "user",
  "💼": "briefcase",
  "🎨": "sparkles",
  "🍜": "utensils",
  "🚗": "train-front",
  "🎁": "gift",
  "💰": "wallet",
  "🐾": "sparkles",
  "📚": "book",
  "🌿": "sparkles",
};

function resolveLedgerIcon(icon = "") {
  if (LEDGER_ICON_KEYS.includes(icon)) return icon;
  return LEDGER_EMOJI_TO_ICON[icon] || "notebook";
}

function LedgerThumb({ ledger, size = 40, className = "" }) {
  const px = size;
  if (ledger?.cover_url) {
    return (
      <img
        className={`ledger-thumb ${className}`}
        src={ledger.cover_url}
        alt={ledger.name || "账本"}
        width={px}
        height={px}
        style={{ width: px, height: px }}
      />
    );
  }
  const iconSize = Math.max(14, Math.round(px * 0.48));
  return (
    <span
      className={`ledger-thumb icon-thumb ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <Icon name={resolveLedgerIcon(ledger?.icon)} size={iconSize} />
    </span>
  );
}

function canEditLedger(me, ledger) {
  if (!me?.user || !ledger) return false;
  if (me.user.role === "viewer") return false;
  if (me.user.role === "owner") return true;
  if (ledger.type === "personal" && ledger.owner_user_id === me.user.id) return true;
  return (ledger.type === "family" || ledger.type === "business") && me.user.role === "member";
}

function canEditTx(me, t) {
  if (!me?.user || !t) return false;
  if (me.user.role === "viewer") return false;
  if (me.user.role === "owner") return true;
  return t.user_id === me.user.id;
}

/** Lock page scroll while a mobile modal/sheet is open (iOS-safe). */
function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

function money(n) {
  return Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CAT_DISPLAY = {
  餐饮: "餐饮美食",
  日用: "日用购物",
  购物: "购物消费",
  交通: "交通出行",
  居住: "居家住房",
  娱乐: "休闲娱乐",
  医疗: "医疗健康",
  教育: "学习成长",
  人情: "人情往来",
  其他支出: "更多分类",
  工资: "工资收入",
  奖金: "奖金红包",
  报销: "报销入账",
  其他收入: "其他收入",
};

function categoryLabel(name = "") {
  return CAT_DISPLAY[name] || name;
}

function formatCnDate(iso = "") {
  const d = iso.slice(0, 10);
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
}

function formatDayHeading(iso = "") {
  const d = iso.slice(0, 10);
  if (!d) return "";
  const dt = new Date(`${d}T12:00:00`);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const wd = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][dt.getDay()];
  const label = `${dt.getMonth() + 1}月${dt.getDate()}日 ${wd}`;
  if (d === todayStr) return `今天 · ${label}`;
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
  if (d === yestStr) return `昨天 · ${label}`;
  return label;
}

function groupTxByDay(rows = []) {
  const map = new Map();
  for (const t of rows) {
    const d = t.occurred_at?.slice(0, 10) || "未知";
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(t);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function dayExpenseTotal(rows = []) {
  return rows.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
}

const DRAFT_KEY = "ln_tx_draft";

const ACCOUNT_KIND_LABELS = {
  cash: "现金",
  bank: "银行卡",
  ewallet: "微信/支付宝",
  credit: "信用卡",
  business: "经营收款",
};
const ACCOUNT_KINDS = Object.entries(ACCOUNT_KIND_LABELS);

function accountKindLabel(kind) {
  return ACCOUNT_KIND_LABELS[kind] || kind;
}

const BRAND_NAME = "luckynest";
const BRAND_TAGLINE = "每一笔，都是认真生活的印记";
const BRAND_DESC = "和家人一起，把日子记得清楚一点。生活有规划，经营有底气。";

const NAV = [
  ["home", "首页"],
  ["bills", "账单"],
  ["add", "记账"],
  ["stats", "统计"],
  ["me", "我的"],
];

const TABS = [
  { id: "home", label: "首页", icon: "home" },
  { id: "bills", label: "账单", icon: "bills" },
  { id: "add", label: "记账", icon: "plus", fab: true },
  { id: "stats", label: "统计", icon: "stats" },
  { id: "me", label: "我的", icon: "me" },
];

const ME_PAGES = ["me", "more", "budget", "settings", "books", "backup", "ai", "biz", "family"];
const HOME_SECONDARY = ["calendar", "accounts"];

function Icon({ name, size = 22, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v10h12V10" />
        </svg>
      );
    case "bills":
    case "notebook":
      return (
        <svg {...common}>
          <path d="M8 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M10 8h6M10 12h6M10 16h4" />
        </svg>
      );
    case "stats":
    case "chart-pie":
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 1 0 9 9h-9V3z" />
          <path d="M14.2 3.4A9 9 0 0 1 20.6 9.8H14.2V3.4z" />
        </svg>
      );
    case "me":
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19.5c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "calendar":
    case "calendar-days":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
        </svg>
      );
    case "chart":
    case "budget":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15l3.5-4.5 3 2.5L19 7" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...common}>
          <path d="M3.5 8.5h17v10a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z" />
          <path d="M3.5 8.5l2-3.2A2 2 0 0 1 7.2 4.5h9.6a2 2 0 0 1 1.7.9l2 3.1" />
          <circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "users":
    case "family":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="16.5" cy="9" r="2.4" />
          <path d="M3.8 19c1.1-3 3.3-4.5 5.2-4.5S14 16 15.2 19" />
          <path d="M14.2 14.6c1.3-.4 2.8-.2 4.3 1.8" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg {...common}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...common}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...common}>
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z" />
          <path d="M21 15v7" />
        </svg>
      );
    case "shopping-basket":
      return (
        <svg {...common}>
          <path d="M5 11h14l-1 7.5a2 2 0 0 1-2 1.5H8a2 2 0 0 1-2-1.5L5 11z" />
          <path d="M8.5 11 10 6h4l1.5 5" />
          <path d="M10 14v3M14 14v3" />
        </svg>
      );
    case "train":
    case "train-front":
      return (
        <svg {...common}>
          <rect x="6" y="3.5" width="12" height="14" rx="3" />
          <path d="M6 12h12M9 16.5v2.5M15 16.5v2.5M8.5 7.5h3M12.5 7.5h3" />
          <circle cx="9.5" cy="14" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="14" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "house":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 9.5V20h11V9.5" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case "coffee":
      return (
        <svg {...common}>
          <path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z" />
          <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
          <path d="M8 4.5c.5.8.5 1.5 0 2.2M11 4.5c.5.8.5 1.5 0 2.2" />
          <path d="M6 20h10" />
        </svg>
      );
    case "heart-pulse":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
          <path d="M8.5 11h2l1.2-2.5L13.5 14l1.2-3H16" />
        </svg>
      );
    case "graduation-cap":
      return (
        <svg {...common}>
          <path d="M2.5 9.5L12 4.5l9.5 5-9.5 5-9.5-5z" />
          <path d="M6.5 11.5v4.2c0 .6 2.4 2.3 5.5 2.3s5.5-1.7 5.5-2.3v-4.2" />
          <path d="M21.5 9.5v5" />
        </svg>
      );
    case "ellipsis":
      return (
        <svg {...common}>
          <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3.5" y="7" width="17" height="12.5" rx="2" />
          <path d="M9 7V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2V7M3.5 12h17" />
        </svg>
      );
    case "gift":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="9" rx="1.5" />
          <path d="M4 11h16v-2.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V11zM12 6.5v13.5" />
          <path d="M12 6.5c-1.8-2.4-4.5-1.2-4.5.6S9.8 8.5 12 6.5zM12 6.5c1.8-2.4 4.5-1.2 4.5.6S14.2 8.5 12 6.5z" />
        </svg>
      );
    case "package":
      return (
        <svg {...common}>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...common}>
          <path d="M12 3l1.2 4.2L17.5 8.5 13.2 9.8 12 14l-1.2-4.2L6.5 8.5l4.3-1.3L12 3z" />
          <path d="M18.5 14l.7 2.2 2.3.7-2.3.7-.7 2.2-.7-2.2-2.3-.7 2.3-.7.7-2.2z" />
        </svg>
      );
    case "gamepad":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="10" rx="4" />
          <path d="M8 13h2M9 12v2M15.2 12.5h.01M17.2 14h.01" />
        </svg>
      );
    case "pill":
      return (
        <svg {...common}>
          <path d="M9.5 4.5l10 10a3.5 3.5 0 0 1-5 5l-10-10a3.5 3.5 0 0 1 5-5z" />
          <path d="M8.2 10.8l5 5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21V5.5z" />
          <path d="M5 18.5h14" />
        </svg>
      );
    case "paperclip":
      return (
        <svg {...common}>
          <path d="M15.5 7.5 8.2 14.8a3 3 0 0 0 4.2 4.2l8.1-8.1a5 5 0 0 0-7.1-7.1L5.2 12a1.5 1.5 0 0 0 2.1 2.1l7.5-7.5" />
        </svg>
      );
    case "backspace":
      return (
        <svg {...common}>
          <path d="M8 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-5-6 5-6z" />
          <path d="M12 10l4 4M16 10l-4 4" />
        </svg>
      );
    case "circle-check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.2 2.2 4.8-5" />
        </svg>
      );
    case "cloud-check":
      return (
        <svg {...common}>
          <path d="M6.5 17.5h11a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.5 1.8A3.5 3.5 0 0 0 6.5 17.5z" />
          <path d="M9.5 13.2l1.8 1.8 3.4-3.5" />
        </svg>
      );
    case "shapes":
      return (
        <svg {...common}>
          <path d="M12 3l4 7H8l4-7z" />
          <rect x="3.5" y="13" width="7" height="7" rx="1.2" />
          <circle cx="17.5" cy="16.5" r="3.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 16v-4a6 6 0 0 1 12 0v4l2 3H4l2-3z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 4v10M8 10l4 4 4-4" />
          <path d="M5 18h14" />
        </svg>
      );
    case "repeat":
      return (
        <svg {...common}>
          <path d="M17 2l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 22l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    case "shield-check":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6M12 7.5h.01" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    default:
      return null;
  }
}

function resolveCategoryIcon(name = "", emoji = "") {
  const n = String(name);
  const pairs = [
    [/餐饮|美食|吃饭|外卖/, "utensils"],
    [/日用|购物|超市|淘宝/, "shopping-basket"],
    [/交通|出行|地铁|打车/, "train-front"],
    [/居家|住房|居住|房租|水电/, "house"],
    [/休闲|娱乐|咖啡|电影/, "coffee"],
    [/医疗|健康|医院/, "heart-pulse"],
    [/学习|成长|教育/, "graduation-cap"],
    [/工资|薪水/, "briefcase"],
    [/奖金|红包|人情|礼物/, "gift"],
    [/进货|成本|材料|包装/, "package"],
    [/游戏/, "gamepad"],
    [/药/, "pill"],
    [/书|课/, "book"],
    [/其他|更多|杂/, "ellipsis"],
  ];
  for (const [re, key] of pairs) {
    if (re.test(n)) return key;
  }
  const emojiMap = {
    "🍜": "utensils",
    "🚌": "train-front",
    "🏠": "house",
    "🧴": "shopping-basket",
    "🛍️": "shopping-basket",
    "🎮": "coffee",
    "💊": "heart-pulse",
    "📚": "graduation-cap",
    "🎁": "gift",
    "✨": "ellipsis",
    "💼": "briefcase",
    "🎉": "gift",
    "📎": "sparkles",
    "🍀": "ellipsis",
    "📦": "package",
    "🧾": "sparkles",
    "🛠️": "sparkles",
    "🎨": "sparkles",
    "🛒": "shopping-basket",
  };
  return emojiMap[emoji] || "ellipsis";
}

function CategoryIcon({ name, emoji, size = 22, className = "" }) {
  const iconName = resolveCategoryIcon(name, emoji);
  const glyph = Icon({ name: iconName, size }) || Icon({ name: "ellipsis", size });
  return (
    <span className={`cat-icon ${className}`} aria-hidden>
      {glyph}
    </span>
  );
}

function TabIcon({ name }) {
  return <Icon name={name} size={22} />;
}

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("ln_token") || "");
  const [me, setMe] = useState(null);
  const [page, setPage] = useState("home");
  const [settingsTab, setSettingsTab] = useState("profile");
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function openSettings(tab = "profile") {
    setSettingsTab(tab);
    setPage("settings");
  }

  function openAdd() {
    setAddOpen(true);
  }

  function go(next) {
    if (next === "add") {
      openAdd();
      return;
    }
    setPage(next);
  }

  function show(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  useEffect(() => {
    if (!token) return;
    api("/api/v1/me", { token })
      .then(setMe)
      .catch(() => {
        setToken("");
        localStorage.removeItem("ln_token");
      });
  }, [token]);

  if (!token) {
    return (
      <Login
        onLogin={(t) => {
          localStorage.setItem("ln_token", t);
          setToken(t);
        }}
        show={show}
        toast={toast}
      />
    );
  }

  function logout() {
    localStorage.removeItem("ln_token");
    setToken("");
  }

  return (
    <div className="shell">
      <header className="m-header">
        <button type="button" className="header-avatar-btn" onClick={() => openSettings("profile")} aria-label="账户设置">
          <UserAvatar user={me?.user} size={40} />
        </button>
        <div className="m-header-text">
          <strong className="brand-cn">{BRAND_NAME}</strong>
          <span>{me?.user.display_name} · {me?.household?.name}</span>
        </div>
      </header>
      <aside className="sider">
        <button type="button" className="brand brand-clickable" onClick={() => openSettings("profile")}>
          <img className="brand-logo" src="/brand/luckynest-mark.png" alt="" width="52" height="52" />
          <div>
            <h1 className="brand-cn">{BRAND_NAME}</h1>
            <p>家庭账本 · 认真生活</p>
          </div>
        </button>
        <nav className="nav">
          {NAV.map(([id, label]) => (
            <button
              key={id}
              className={id === "add" ? (addOpen ? "active" : "") : page === id ? "active" : ""}
              onClick={() => go(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {me && (
          <div className="who">
            <div className="who-row">
              <UserAvatar user={me.user} size={32} />
              <span>{me.user.display_name} · {me.household?.name}</span>
            </div>
            <p className="muted">角色 {me.user.role === "owner" ? "家长" : "成员"}</p>
            <button className="btn ghost" style={{ marginTop: 10, width: "100%" }} onClick={logout}>
              退出登录
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        <div className="page-stack">
        {page === "home" && <Home token={token} me={me} go={go} show={show} openSettings={openSettings} />}
        {page === "bills" && <BillsPage token={token} me={me} show={show} go={go} />}
        {page === "stats" && <StatsPage token={token} me={me} go={go} show={show} />}
        {page === "books" && <Books token={token} me={me} show={show} />}
        {page === "calendar" && <CalendarPage token={token} me={me} show={show} go={go} />}
        {page === "accounts" && <AccountsHome token={token} me={me} show={show} go={go} openSettings={openSettings} />}
        {page === "biz" && <Biz token={token} me={me} show={show} />}
        {page === "budget" && <Budget token={token} show={show} />}
        {(page === "settings" || page === "family") && (
          <SettingsPanel
            token={token}
            me={me}
            show={show}
            onMeUpdate={setMe}
            initialTab={settingsTab}
          />
        )}
        {page === "backup" && <BackupPanel token={token} me={me} show={show} />}
        {page === "ai" && <AiPanel token={token} show={show} me={me} />}
        {(page === "me" || page === "more") && (
          <MeHub
            me={me}
            go={go}
            openSettings={openSettings}
            logout={logout}
          />
        )}
        </div>
      </main>
      <nav className="tabbar" aria-label="手机导航">
        {TABS.map((tab) => {
          const on = tab.fab
            ? addOpen
            : tab.id === "me"
              ? ME_PAGES.includes(page)
              : tab.id === "home"
                ? page === "home" || HOME_SECONDARY.includes(page)
                : page === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`tab ${on ? "on" : ""} ${tab.fab ? "fab" : ""}`}
              aria-current={on ? "page" : undefined}
              aria-label={tab.label}
              onClick={() => (tab.fab ? openAdd() : go(tab.id))}
            >
              <span className="tab-icon" aria-hidden="true">
                <TabIcon name={tab.icon} />
              </span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      {addOpen && (
        <AddSheet
          token={token}
          me={me}
          show={show}
          onClose={() => setAddOpen(false)}
          onGoBills={() => setPage("bills")}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

function WelcomeIcon({ name }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (name === "house") {
    return (
      <svg {...common}>
        <path d="M4 11l8-7 8 7" />
        <path d="M6 10v10h12V10" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3.2" />
        <circle cx="16.5" cy="9" r="2.4" />
        <path d="M3.5 19c1.2-3 3.5-4.5 5.5-4.5S13.3 16 14.5 19" />
        <path d="M14 14.8c1.4-.4 3-.2 4.5 1.7" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 9h16M8 3v4M16 3v4" />
      </svg>
    );
  }
  return null;
}

function Login({ onLogin, show, toast }) {
  const [step, setStep] = useState("welcome"); // welcome | login | join
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agreed, setAgreed] = useState(true);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      show("请输入用户名和密码");
      return;
    }
    setBusy(true);
    try {
      const data = await api("/api/v1/auth/login", {
        method: "POST",
        body: { username: username.trim(), password },
      });
      if (remember) localStorage.setItem("ln_remember_user", username.trim());
      else localStorage.removeItem("ln_remember_user");
      onLogin(data.token);
    } catch (err) {
      show(err.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("ln_remember_user");
    if (saved) setUsername(saved);
  }, []);

  function openAuth(next) {
    if (!agreed) {
      show("请先阅读并同意用户协议与隐私政策");
      return;
    }
    setStep(next);
  }

  return (
    <div className="login-wrap">
      <div className="login-stage">
        {step === "welcome" ? (
          <>
            <header className="login-hero">
              <h1 className="sr-only">{BRAND_NAME}</h1>
              <img
                className="login-logo"
                src="/brand/luckynest-logo.png"
                alt="luckynest"
                width="220"
                height="165"
              />
              <p className="login-brand brand-cn" aria-hidden>
                {BRAND_NAME}
              </p>
              <p className="login-tagline">{BRAND_TAGLINE}</p>
              <p className="login-desc">{BRAND_DESC}</p>
            </header>

            <div className="welcome-values">
              {[
                ["house", "生活与经营，各有一本账", "家庭收支和店铺往来，清晰分开"],
                ["users", "一家人，一起记录", "共享账本、分工记账，权限可控"],
                ["calendar", "让每一天心中有数", "日历查账、预算提醒，照顾日常"],
              ].map(([icon, title, desc]) => (
                <div className="welcome-value" key={title}>
                  <span className="welcome-value-icon">
                    <WelcomeIcon name={icon} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="welcome-actions">
              <button type="button" className="btn" onClick={() => openAuth("login")}>
                + 创建我的家庭账本
              </button>
              <button type="button" className="btn secondary" onClick={() => openAuth("join")}>
                已有家庭？加入家庭账本
              </button>
              <label className="welcome-agree">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>已阅读并同意《用户协议》和《隐私政策》</span>
              </label>
              <p className="welcome-note">本原型中的金额与家庭信息均为示例</p>
            </div>
          </>
        ) : (
          <>
            <button type="button" className="login-back" onClick={() => setStep("welcome")}>
              ← 返回
            </button>
            <header className="login-hero">
              <img
                className="login-logo"
                src="/brand/luckynest-logo.png"
                alt="luckynest"
                width="120"
                height="120"
                style={{ width: 96, height: 96 }}
              />
            </header>
            <form className="login-panel" onSubmit={submit} noValidate>
              <h2 className="login-panel-title">
                {step === "join" ? "加入家庭账本" : "创建 / 登录账本"}
              </h2>
              <p className="login-panel-sub">
                {step === "join"
                  ? "请使用家长在「家庭成员」里为你创建的账号登录。"
                  : "使用家庭账号登录。新家庭请先用管理员账号进入。"}
              </p>

              <label className="login-field">
                <span>用户名</span>
                <input
                  autoComplete="username"
                  name="username"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                />
              </label>

              <label className="login-field">
                <span>密码</span>
                <div className="login-password-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    name="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? "隐藏" : "显示"}
                  </button>
                </div>
              </label>

              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                记住我
              </label>

              <button className="btn login-submit" disabled={busy}>
                {busy ? "登录中…" : step === "join" ? "加入并登录" : "登录账本"}
              </button>
            </form>
          </>
        )}
      </div>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

function MeHub({ me, go, openSettings, logout }) {
  const roleLabel = me?.user.role === "owner" ? "家长管理员" : me?.user.role === "viewer" ? "只读成员" : "记账成员";
  const groups = [
    {
      items: [
        ["ledgers", "notebook", "账本管理", `${me?.household?.name || "家庭"} · 生活/经营`, () => openSettings("ledgers")],
        ["members", "users", "家庭成员", roleLabel, () => openSettings("members")],
      ],
    },
    {
      items: [
        ["cats", "shapes", "分类管理", "生活与经营分类", () => openSettings("ledgers")],
        ["books", "repeat", "账本流水", "按账本查看", () => go("books")],
        ["budget", "bell", "预算提醒", "本月提醒线", () => go("budget")],
        ["backup", "download", "导出与备份", "本地与 NAS 备份", () => go("backup")],
      ],
    },
    {
      items: [
        ["ai", "cloud-check", "微信 / AI 同步", "OpenClaw 语音入账", () => go("ai")],
        ["accounts", "shield-check", "账户资产", "现金、银行卡、钱包", () => go("accounts")],
        ["stats", "chart-pie", "统计分析", "构成与趋势", () => go("stats")],
        ["profile", "info", "关于与资料", `luckynest · @${me?.user?.username || ""}`, () => openSettings("profile")],
      ],
    },
  ];

  return (
    <div className="me-hub figma-me">
      <div className="me-page-head">
        <h2>我的</h2>
        <p className="add-page-sub">{me?.household?.name || "家庭账本"}</p>
      </div>

      <button type="button" className="me-hero" onClick={() => openSettings("profile")}>
        <UserAvatar user={me?.user} size={58} />
        <div className="me-hero-text">
          <strong>{me?.user.display_name}</strong>
          <span className="muted">
            @{me?.user.username} · {me?.household?.name}
          </span>
          <span className="me-role-pill">{roleLabel}</span>
        </div>
        <span className="me-chevron" aria-hidden>
          <Icon name="chevron-right" size={18} />
        </span>
      </button>

      {groups.map((g, gi) => (
        <section key={gi} className="me-group">
          <div className="me-list">
            {g.items.map(([id, icon, title, value, action]) => (
              <button key={id} type="button" className="me-row me-row-figma" onClick={action}>
                <span className="me-row-icon">
                  <Icon name={icon} size={18} />
                </span>
                <span className="me-row-label">{title}</span>
                <span className="me-row-value">{value}</span>
                <span className="me-chevron" aria-hidden>
                  <Icon name="chevron-right" size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <p className="me-lock-note">
        <Icon name="lock" size={15} />
        <span>数据保存在家庭 NAS，仅家人可见</span>
      </p>
      <div className="me-brand-sign">
        <img src="/brand/luckynest-mark.png" alt="" width="40" height="30" />
        <span>luckynest · 认真生活</span>
      </div>

      <button className="btn ghost logout-btn" onClick={logout}>
        退出登录
      </button>
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          className={`segmented-item ${value === id ? "on" : ""}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FilterBar({ children, label }) {
  return (
    <div className="filter-bar">
      {label && <span className="filter-bar-label">{label}</span>}
      <div className="filter-scroll">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children, className = "" }) {
  return (
    <button type="button" className={`filter-chip ${active ? "on" : ""} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}

const CAL_WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const CAL_SCOPES = [
  ["family", "生活"],
  ["business", "经营"],
  ["all", "对照"],
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** 周一为一周起点时，当月 1 号前的占位格数 */
function leadingBlanks(year, month) {
  const dow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}

function CalendarPage({ token, me, show, go }) {
  const now = new Date();
  const [mode, setMode] = useState("month"); // month | year
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [scope, setScope] = useState("family");
  const [personId, setPersonId] = useState("");
  const [members, setMembers] = useState([]);
  const [monthData, setMonthData] = useState(null);
  const [yearData, setYearData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayRows, setDayRows] = useState([]);
  const [dayTick, setDayTick] = useState(0);
  const [editTx, setEditTx] = useState(null);
  const [txMeta, setTxMeta] = useState({ ledgers: [], accounts: [], cats: [] });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const personQs = personId ? `&owner_user_id=${personId}` : "";
  const visibleMembers = members.filter((m) => me?.user.role === "owner" || m.id === me?.user.id);
  const selectedPerson = members.find((m) => String(m.id) === String(personId));

  useEffect(() => {
    api("/api/v1/members", { token }).then(setMembers).catch(() => {});
  }, [token]);

  useEffect(() => {
    Promise.all([
      api("/api/v1/ledgers", { token }),
      api("/api/v1/accounts", { token }),
      api("/api/v1/categories", { token }),
    ]).then(([l, a, c]) => setTxMeta({ ledgers: l, accounts: a, cats: c }));
  }, [token]);

  function refreshCalendarLists() {
    setDayTick((n) => n + 1);
    if (mode === "month") {
      api(`/api/v1/calendar/month?year=${year}&month=${month}&scope=${scope}${personQs}`, { token })
        .then(setMonthData)
        .catch(() => {});
    }
  }

  async function deleteDayTx(t) {
    if (!window.confirm("确定删除这笔流水？删除后无法恢复。")) return;
    try {
      await api(`/api/v1/transactions/${t.id}`, { token, method: "DELETE" });
      show("流水已删除");
      setEditTx(null);
      refreshCalendarLists();
    } catch (err) {
      show(err.message);
    }
  }

  useEffect(() => {
    if (mode !== "month") return;
    api(`/api/v1/calendar/month?year=${year}&month=${month}&scope=${scope}${personQs}`, { token })
      .then((data) => {
        setMonthData(data);
        const inThisMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
        if (inThisMonth) {
          setSelectedDay(now.getDate());
          return;
        }
        const first = data.days?.[0]?.date;
        setSelectedDay(first ? Number(first.slice(-2)) : 1);
      })
      .catch((err) => show(err.message));
  }, [token, year, month, scope, personId, mode]);

  useEffect(() => {
    if (mode !== "year") return;
    api(`/api/v1/calendar/year?year=${year}&scope=${scope}${personQs}`, { token })
      .then(setYearData)
      .catch((err) => show(err.message));
  }, [token, year, scope, personId, mode]);

  useEffect(() => {
    if (mode !== "month" || !selectedDay) {
      setDayRows([]);
      return;
    }
    const qs = [
      `year=${year}`,
      `month=${month}`,
      `day=${selectedDay}`,
      "limit=100",
      personId ? `owner_user_id=${personId}` : "",
      scope === "business" ? "ledger_type=business" : "",
    ]
      .filter(Boolean)
      .join("&");
    api(`/api/v1/transactions?${qs}`, { token })
      .then((rows) => {
        if (!personId && scope === "family") {
          setDayRows(rows.filter((t) => t.ledger_type !== "business"));
        } else if (personId && scope === "family") {
          setDayRows(rows.filter((t) => t.ledger_type !== "business"));
        } else if (scope === "business") {
          setDayRows(rows.filter((t) => t.ledger_type === "business"));
        } else {
          setDayRows(rows);
        }
      })
      .catch((err) => show(err.message));
  }, [token, year, month, selectedDay, scope, personId, mode, dayTick]);

  function shiftMonth(delta) {
    let y = year;
    let m = month + delta;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
    setSelectedDay(null);
  }

  function shiftYear(delta) {
    setYear((y) => y + delta);
  }

  const dayMap = Object.fromEntries((monthData?.days || []).map((d) => [d.date, d]));
  const blanks = leadingBlanks(year, month);
  const totalDays = daysInMonth(year, month);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevDays = daysInMonth(prevYear, prevMonth);
  const cells = [];
  for (let i = 0; i < blanks; i++) {
    cells.push({ day: prevDays - blanks + i + 1, outside: true, dir: "prev" });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, outside: false });
  }
  const remain = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remain; i++) {
    cells.push({ day: i, outside: true, dir: "next" });
  }

  const selectedKey = selectedDay ? `${year}-${pad2(month)}-${pad2(selectedDay)}` : null;
  const selectedCell = selectedKey ? dayMap[selectedKey] : null;
  const isToday = (d) =>
    d && !d.outside && year === now.getFullYear() && month === now.getMonth() + 1 && d.day === now.getDate();

  const weekdayLabel = selectedDay
    ? WEEKDAYS[(leadingBlanks(year, month) + selectedDay - 1) % 7]
    : "";
  const scopeLabel =
    scope === "business" ? "经营账" : scope === "all" ? "全部账本" : "生活账";
  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth() + 1);
    setSelectedDay(t.getDate());
    setMode("month");
  };

  return (
    <div className="calendar-page">
      <div className="cal-page-head">
        <div className="cal-page-head-row">
          <button type="button" className="cal-back" onClick={() => go("home")} aria-label="返回首页">
            <Icon name="chevron-left" size={20} />
            <h2>日历查账</h2>
          </button>
          <button type="button" className="text-link" onClick={goToday}>
            今天
          </button>
        </div>
        <p className="cal-page-sub">
          {me?.household?.name || "家庭"} · {selectedPerson ? selectedPerson.display_name : scopeLabel}
        </p>
      </div>

      <div className="cal-filter-toggle-row">
        <button type="button" className="cal-filter-toggle" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? "收起筛选" : "筛选账本 / 成员"}
        </button>
        <Segmented
          value={mode}
          options={[
            ["month", "月历"],
            ["year", "年览"],
          ]}
          onChange={setMode}
        />
      </div>
      {filtersOpen && (
        <div className="cal-toolbar">
          <FilterBar label="账本">
            {CAL_SCOPES.map(([id, label]) => (
              <FilterChip key={id} active={scope === id} onClick={() => setScope(id)}>
                {label}
              </FilterChip>
            ))}
          </FilterBar>
          <FilterBar label="成员">
            <FilterChip active={!personId} onClick={() => setPersonId("")}>
              全家人
            </FilterChip>
            {visibleMembers.map((m) => (
              <FilterChip
                key={m.id}
                active={String(personId) === String(m.id)}
                onClick={() => setPersonId(String(m.id))}
                className="person-filter"
              >
                <UserAvatar user={m} size={20} />
                {m.display_name}
              </FilterChip>
            ))}
          </FilterBar>
        </div>
      )}

      {mode === "month" && (
        <>
          <div className="cal-nav">
            <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(-1)} aria-label="上月">
              <Icon name="chevron-left" size={20} />
            </button>
            <strong className="cal-title">
              {year}年{month}月
            </strong>
            <button type="button" className="cal-nav-btn" onClick={() => shiftMonth(1)} aria-label="下月">
              <Icon name="chevron-right" size={20} />
            </button>
          </div>

          {monthData && (
            <div className="cal-summary-inline">
              <span className="cal-sum-in">收入 ¥{money(monthData.summary.income)}</span>
              <span className="cal-sum-out">支出 ¥{money(monthData.summary.expense)}</span>
            </div>
          )}

          <div className="card cal-grid-wrap">
            <div className="cal-weekdays">
              {CAL_WEEKDAYS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((cellMeta, i) => {
                if (cellMeta.outside) {
                  return (
                    <div key={`o${i}`} className="cal-cell outside" aria-hidden>
                      <span className="cal-day-num">{cellMeta.day}</span>
                      <span className="cal-dots" />
                    </div>
                  );
                }
                const d = cellMeta.day;
                const key = `${year}-${pad2(month)}-${pad2(d)}`;
                const cell = dayMap[key];
                const on = selectedDay === d;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`cal-cell ${on ? "on" : ""} ${isToday(cellMeta) ? "today" : ""}`}
                    onClick={() => setSelectedDay(d)}
                  >
                    <span className="cal-day-num">{d}</span>
                    <span className="cal-dots" aria-hidden>
                      {cell?.income > 0 && <i className="dot in" />}
                      {cell?.expense > 0 && <i className="dot out" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="cal-legend">
              <span>
                <i className="dot in" /> 收入
              </span>
              <span>
                <i className="dot out" /> 支出
              </span>
              <span>
                <i className="dot todo" /> 待办
              </span>
              <span className="cal-legend-hint">点日期查看当日账单</span>
            </div>
          </div>

          <div className="cal-day-head">
            <h3>
              {selectedDay ? `${month}月${selectedDay}日 · ${weekdayLabel}` : "选择日期"}
            </h3>
            {selectedCell && (
              <span className="cal-day-total">
                {selectedCell.expense > 0
                  ? `支出 ¥${money(selectedCell.expense)}`
                  : selectedCell.income > 0
                    ? `收入 ¥${money(selectedCell.income)}`
                    : "暂无收支"}
              </span>
            )}
          </div>
          <div className="card cal-day-panel">
            {dayRows.length === 0 && (
              <p className="muted empty-cal-day">
                {selectedPerson
                  ? `${selectedPerson.display_name} 这一天还没有个人账本流水。`
                  : "今天还没有账单，去记第一笔吧。"}
              </p>
            )}
            {dayRows.map((t) => (
              <TxRow key={t.id} t={t} canEdit={canEditTx(me, t)} onEdit={(row) => setEditTx(row)} />
            ))}
          </div>
        </>
      )}

      {mode === "year" && (
        <>
          <div className="cal-nav">
            <button type="button" className="btn ghost btn-sm" onClick={() => shiftYear(-1)}>
              上一年
            </button>
            <strong className="cal-title">{year} 年</strong>
            <button type="button" className="btn ghost btn-sm" onClick={() => shiftYear(1)}>
              下一年
            </button>
          </div>

          {yearData && (
            <div className="row three cal-summary">
              <div className="card sage">
                <div className="label">
                  {scope === "business" ? "全年经营收入" : scope === "all" ? "全年合计收入" : "全年生活收入"}
                </div>
                <div className="num">¥ {money(yearData.summary.income)}</div>
              </div>
              <div className="card coral">
                <div className="label">
                  {scope === "business" ? "全年经营支出" : scope === "all" ? "全年合计支出" : "全年生活支出"}
                </div>
                <div className="num">¥ {money(yearData.summary.expense)}</div>
              </div>
              <div className="card butter">
                <div className="label">
                  {scope === "business" ? "全年经营结余" : scope === "all" ? "全年合计结余" : "全年生活结余"}
                </div>
                <div className="num">¥ {money(yearData.summary.balance)}</div>
              </div>
            </div>
          )}

          <div className="cal-year-grid">
            {(yearData?.months || []).map((m) => {
              const active = m.month === month && yearData.year === year;
              const empty = m.income === 0 && m.expense === 0;
              return (
                <button
                  key={m.month}
                  type="button"
                  className={`card cal-month-card ${active ? "on" : ""} ${empty ? "empty" : ""}`}
                  onClick={() => {
                    setMonth(m.month);
                    setMode("month");
                    setSelectedDay(null);
                  }}
                >
                  <strong>{m.month} 月</strong>
                  {empty ? (
                    <p className="muted">暂无流水</p>
                  ) : (
                    <>
                      <div className="cal-in">+{money(m.income)}</div>
                      <div className="cal-out">-{money(m.expense)}</div>
                      <div className={`cal-bal ${m.balance >= 0 ? "pos" : "neg"}`}>
                        结余 ¥ {money(m.balance)}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {editTx && (
        <TxEditModal
          tx={editTx}
          token={token}
          me={me}
          ledgers={txMeta.ledgers}
          accounts={txMeta.accounts}
          cats={txMeta.cats}
          show={show}
          onClose={() => setEditTx(null)}
          onSaved={() => refreshCalendarLists()}
          onDelete={deleteDayTx}
        />
      )}
    </div>
  );
}

function Home({ token, me, go, show, openSettings }) {
  const [dash, setDash] = useState(null);
  const [scope, setScope] = useState(() => localStorage.getItem("ln_home_scope") || "life");
  const [editTx, setEditTx] = useState(null);
  const [txMeta, setTxMeta] = useState({ ledgers: [], accounts: [], cats: [] });

  function reloadHome() {
    api("/api/v1/dashboard", { token }).then(setDash);
  }

  useEffect(() => {
    reloadHome();
  }, [token]);

  useEffect(() => {
    localStorage.setItem("ln_home_scope", scope);
  }, [scope]);

  useEffect(() => {
    Promise.all([
      api("/api/v1/ledgers", { token }),
      api("/api/v1/accounts", { token }),
      api("/api/v1/categories", { token }),
    ]).then(([l, a, c]) => setTxMeta({ ledgers: l, accounts: a, cats: c }));
  }, [token]);

  async function deleteHomeTx(t) {
    if (!window.confirm(`删除这笔「${t.note || t.category_name} ¥${money(t.amount)}」？`)) return;
    try {
      await api(`/api/v1/transactions/${t.id}`, { token, method: "DELETE" });
      show("流水已删除");
      setEditTx(null);
      reloadHome();
    } catch (err) {
      show(err.message);
    }
  }

  if (!dash) return <p className="muted">正在打开账本…</p>;

  const isLife = scope === "life";
  const summary = isLife
    ? { expense: dash.family.expense, income: dash.family.income, balance: dash.family.balance }
    : { expense: dash.business.expense, income: dash.business.income, balance: dash.business.profit };
  const recent = isLife ? dash.recent || [] : dash.recent_business || [];
  const budgetTotal = (dash.budgets || []).reduce((s, b) => s + (b.amount || 0), 0);
  const budgetSpent = (dash.budgets || []).reduce((s, b) => s + (b.spent || 0), 0);
  const budgetLeft = Math.max(0, budgetTotal - budgetSpent);
  const budgetPct = budgetTotal > 0 ? Math.min(100, Math.round((budgetSpent / budgetTotal) * 100)) : 0;
  const members = dash.members || [];
  const householdName = me?.household?.name || "我的家庭";
  const monthLabel = `${dash.period.year}年${dash.period.month}月`;

  return (
    <div className="home-page">
      <div className="home-top">
        <div>
          <h2>LuckyNote</h2>
          <p className="sub">
            {householdName} · {isLife ? "生活账" : "经营账"}
          </p>
        </div>
        <button type="button" className="home-switch" onClick={() => go("books")}>
          切换账本⌄
        </button>
      </div>

      <Segmented
        value={scope}
        options={[
          ["life", "生活账"],
          ["biz", "经营账"],
        ]}
        onChange={setScope}
      />

      <section className="today-hero" aria-label={isLife ? "本月生活概况" : "本月经营概况"} style={{ marginTop: 14 }}>
        <div className="h-row" style={{ marginBottom: 10 }}>
          <span className="t" style={{ color: "var(--ink)", fontWeight: 600 }}>
            {monthLabel} · {isLife ? "生活账" : "经营账"}
          </span>
        </div>
        <div className="lbl" style={{ color: "var(--ink2)" }}>
          {isLife ? "本月支出" : "本月实付"}
        </div>
        <div className="amt">¥ {money(summary.expense)}</div>
        <div className="h-row" style={{ marginTop: 8, marginBottom: 0 }}>
          <div>
            <div className="kl">{isLife ? "本月收入" : "本月实收"}</div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>¥ {money(summary.income)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="kl">{isLife ? "本月结余" : "净利润"}</div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>¥ {money(summary.balance)}</div>
          </div>
        </div>
      </section>

      <div className="quick-grid">
        {[
          ["calendar", "日历查账", "calendar-days"],
          ["budget", "预算管理", "chart"],
          ["accounts", "账户资产", "wallet"],
          ["family", "家庭成员", "users"],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            className="quick-cell"
            onClick={() => (id === "family" ? openSettings("members") : go(id))}
          >
            <span className="qi">
              <Icon name={icon} size={20} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {isLife && (
        <div className="budget-card">
          <div className="h-row">
            <span className="t" style={{ color: "var(--ink)" }}>
              本月预算
            </span>
            <button type="button" className="more" onClick={() => go("budget")}>
              查看预算 ›
            </button>
          </div>
          {budgetTotal > 0 ? (
            <>
              <div className="h-row" style={{ marginBottom: 0 }}>
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  已用 ¥{money(budgetSpent)} / ¥{money(budgetTotal)}
                </span>
                <span style={{ color: "var(--brand-mid)", fontSize: "0.75rem" }}>{budgetPct}%</span>
              </div>
              <div className="prog" aria-hidden>
                <i style={{ width: `${budgetPct}%` }} />
              </div>
              <p className="hint">还可支出 ¥{money(budgetLeft)}，给生活留一点余地。</p>
            </>
          ) : (
            <p className="hint">还没有设置预算，去定一条提醒线吧。</p>
          )}
        </div>
      )}

      {!isLife && (
        <div className="budget-card">
          <div className="h-row">
            <span className="t" style={{ color: "var(--ink)" }}>
              经营概览
            </span>
            <button type="button" className="more" onClick={() => go("biz")}>
              经营详情 ›
            </button>
          </div>
          <p className="hint">经营账与生活账分开统计，互不影响家庭结余。</p>
        </div>
      )}

      {members.length > 0 && (
        <div className="home-family-row">
          <div className="avatars">
            {members.slice(0, 4).map((m) => (
              <UserAvatar key={m.user_id || m.display_name} user={m} size={26} />
            ))}
            <span>{members.length}位家人共同记账</span>
          </div>
          <span className="home-sync" title="已同步">
            <Icon name="cloud-check" size={17} />
          </span>
        </div>
      )}

      <div className="h-row" style={{ marginTop: 4 }}>
        <span className="t" style={{ color: "var(--ink)", fontSize: "1rem" }}>
          近期账单
        </span>
        <button type="button" className="more" onClick={() => go("bills")}>
          全部账单 ›
        </button>
      </div>
      {recent.length === 0 ? (
        <div className="empty-state" style={{ margin: "8px 0 14px" }}>
          这里还是空白，记下生活的第一笔吧。
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <TxDayGroups rows={recent.slice(0, 8)} me={me} onEdit={(row) => setEditTx(row)} />
        </div>
      )}

      {editTx && (
        <TxEditModal
          tx={editTx}
          token={token}
          me={me}
          ledgers={txMeta.ledgers}
          accounts={txMeta.accounts}
          cats={txMeta.cats}
          show={show}
          onClose={() => setEditTx(null)}
          onSaved={() => reloadHome()}
          onDelete={deleteHomeTx}
        />
      )}
    </div>
  );
}

function BillsPage({ token, me, show, go }) {
  const [scope, setScope] = useState("all");
  const [q, setQ] = useState("");

  return (
    <div className="bills-page">
      <div className="page-head compact">
        <div>
          <h2 className="hello">账单</h2>
          <p className="sub">按日期查看流水，点一笔看详情。</p>
        </div>
        <button type="button" className="text-link" onClick={() => go("calendar")}>
          日历查账
        </button>
      </div>
      <Segmented
        value={scope}
        options={[
          ["all", "全部"],
          ["life", "生活账"],
          ["biz", "经营账"],
        ]}
        onChange={setScope}
      />
      <label className="search-bar" style={{ marginTop: 12 }}>
        <span aria-hidden>⌕</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索备注、类目…" />
      </label>
      <div className="list" style={{ marginTop: 12 }}>
        <BillsList token={token} me={me} show={show} scope={scope} filterText={q} />
      </div>
    </div>
  );
}

function BillsList({ token, me, show, scope, filterText }) {
  const [rows, setRows] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cats, setCats] = useState([]);
  const [editTx, setEditTx] = useState(null);

  function loadRows() {
    const path =
      scope === "biz"
        ? "/api/v1/transactions?limit=80&ledger_type=business"
        : "/api/v1/transactions?limit=80";
    return api(path, { token }).then(setRows);
  }

  useEffect(() => {
    loadRows();
  }, [token, scope]);

  useEffect(() => {
    Promise.all([
      api("/api/v1/ledgers", { token }),
      api("/api/v1/accounts", { token }),
      api("/api/v1/categories", { token }),
    ]).then(([l, a, c]) => {
      setLedgers(l);
      setAccounts(a);
      setCats(c);
    });
  }, [token]);

  async function deleteTx(t) {
    if (!window.confirm(`删除这笔「${t.note || t.category_name} ¥${money(t.amount)}」？`)) return;
    try {
      await api(`/api/v1/transactions/${t.id}`, { token, method: "DELETE" });
      show("流水已删除");
      setEditTx(null);
      loadRows();
    } catch (err) {
      show(err.message);
    }
  }

  const filtered = rows.filter((t) => {
    if (scope === "life" && t.ledger_type === "business") return false;
    if (!filterText?.trim()) return true;
    const hay = `${t.note || ""}${t.category_name || ""}${t.ledger_name || ""}${t.user_name || ""}`.toLowerCase();
    return hay.includes(filterText.trim().toLowerCase());
  });

  return (
    <>
      {filtered.length === 0 ? (
        <div className="empty-state">今天还没有账单，去记第一笔吧。</div>
      ) : (
        <TxDayGroups rows={filtered} me={me} onEdit={(row) => setEditTx(row)} />
      )}
      {editTx && (
        <TxEditModal
          tx={editTx}
          token={token}
          me={me}
          ledgers={ledgers}
          accounts={accounts}
          cats={cats}
          show={show}
          onClose={() => setEditTx(null)}
          onSaved={() => loadRows()}
          onDelete={deleteTx}
        />
      )}
    </>
  );
}

function StatsPage({ token, me, go, show }) {
  const now = new Date();
  const [dash, setDash] = useState(null);
  const [monthCal, setMonthCal] = useState(null);
  const [book, setBook] = useState("life"); // life | biz
  const [kind, setKind] = useState("expense"); // expense | income
  const [range, setRange] = useState("month"); // month | year
  const year = dash?.period?.year || now.getFullYear();
  const month = dash?.period?.month || now.getMonth() + 1;

  useEffect(() => {
    api("/api/v1/dashboard", { token })
      .then(setDash)
      .catch((e) => show(e.message));
  }, [token, show]);

  useEffect(() => {
    if (!dash) return;
    const scope = book === "biz" ? "business" : "family";
    api(`/api/v1/calendar/month?year=${year}&month=${month}&scope=${scope}`, { token })
      .then(setMonthCal)
      .catch(() => setMonthCal(null));
  }, [token, dash, book, year, month]);

  if (!dash) return <p className="muted">正在汇总统计…</p>;

  const isLife = book === "life";
  const isExpense = kind === "expense";
  const total = isLife
    ? isExpense
      ? dash.family.expense
      : dash.family.income
    : isExpense
      ? dash.business.expense
      : dash.business.income;

  const catsRaw = isExpense ? dash.by_category || [] : [];
  const catTotal = catsRaw.reduce((s, c) => s + (c.value || 0), 0) || 1;
  const cats = catsRaw.map((c, i) => ({
    ...c,
    color: c.color || STAT_COLORS[i % STAT_COLORS.length],
    pct: ((c.value || 0) / catTotal) * 100,
  }));

  const dayMap = Object.fromEntries((monthCal?.days || []).map((d) => [Number(d.date.slice(-2)), d]));
  const dim = daysInMonth(year, month);
  const todayCap =
    year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : dim;
  const dailyBars = [];
  let maxDay = { day: 1, expense: 0 };
  let sumDays = 0;
  for (let d = 1; d <= todayCap; d++) {
    const exp = dayMap[d]?.expense || 0;
    dailyBars.push({ day: d, expense: exp, label: String(d) });
    sumDays += exp;
    if (exp >= maxDay.expense) maxDay = { day: d, expense: exp };
  }
  const avgDay = todayCap > 0 ? sumDays / todayCap : 0;

  const members = (dash.members || [])
    .map((m) => ({
      name: m.display_name,
      value: isExpense ? m.expense || 0 : m.income || 0,
    }))
    .sort((a, b) => b.value - a.value);
  const memberMax = Math.max(...members.map((m) => m.value), 1);

  return (
    <div className="stats-page">
      <div className="stats-head">
        <div className="stats-head-row">
          <h2>统计分析</h2>
          <button type="button" className="text-link" onClick={() => go("books")}>
            切换账本⌄
          </button>
        </div>
        <p className="stats-sub">
          {me?.household?.name || "家庭"} · {isLife ? "生活账" : "经营账"}
        </p>
      </div>

      <div className="stats-range-row">
        <button type="button" className="stats-month-btn">
          {year}年{month}月 ⌄
        </button>
        <div className="stats-range-tabs">
          {[
            ["month", "月度"],
            ["year", "年度"],
            ["custom", "自定义"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={range === id ? "on" : ""}
              onClick={() => {
                if (id === "custom") {
                  show("自定义区间即将支持");
                  return;
                }
                setRange(id);
                if (id === "year") show("年度视图：当前展示本月明细，年汇总可看下方趋势");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Segmented
        value={kind}
        options={[
          ["expense", "支出分析"],
          ["income", "收入分析"],
        ]}
        onChange={setKind}
      />

      <div className="stats-book-switch">
        <FilterChip active={book === "life"} onClick={() => setBook("life")}>
          生活账
        </FilterChip>
        <FilterChip active={book === "biz"} onClick={() => setBook("biz")}>
          经营账
        </FilterChip>
      </div>

      <section className="card stats-donut-card">
        <div className="stats-donut-top">
          <div>
            <p className="kl">{isExpense ? "本月累计支出" : "本月累计收入"}</p>
            <p className="stats-big-amt">¥{money(total)}</p>
          </div>
          <span className="stats-pill">截至{todayCap}日</span>
        </div>

        {isExpense && isLife && cats.length > 0 ? (
          <div className="stats-donut-body">
            <div className="stats-donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cats}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {cats.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="stats-donut-center">
                <strong>{cats.length}</strong>
                <span>{isExpense ? "支出分类" : "收入分类"}</span>
              </div>
            </div>
            <div className="stats-legend">
              {cats.slice(0, 6).map((c) => (
                <div className="stats-legend-row" key={c.name}>
                  <span className="stats-legend-name">
                    <i style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <span className="stats-legend-val">
                    {c.pct.toFixed(1)}% · ¥{money(c.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted" style={{ margin: "8px 0 0" }}>
            {isExpense
              ? isLife
                ? "本月还没有支出分类数据。"
                : `经营实付 ¥${money(dash.business.expense)}，毛利 ¥${money(dash.business.profit)}。`
              : `本月${isLife ? "生活" : "经营"}收入 ¥${money(total)}。`}
          </p>
        )}
      </section>

      {isExpense && (
        <section className="card stats-trend-card">
          <div className="h-row">
            <span className="stats-card-title">每日支出趋势</span>
            <span className="text-link" style={{ cursor: "default" }}>
              1–{todayCap}日
            </span>
          </div>
          <div className="stats-bar-wrap">
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={dailyBars} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 9, fill: "#aba8ba" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  ticks={[1, 5, 9, todayCap].filter((d, i, a) => a.indexOf(d) === i && d <= todayCap)}
                />
                <Tooltip formatter={(v) => [`¥${money(v)}`, "支出"]} />
                <Bar dataKey="expense" radius={[3, 3, 0, 0]} maxBarSize={14}>
                  {dailyBars.map((d) => (
                    <Cell
                      key={d.day}
                      fill={d.day === todayCap ? "#8270d8" : "#cbc2ef"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="stats-trend-foot">
            <span>日均 ¥{money(avgDay)}</span>
            <span>
              最高 {maxDay.day}日 · ¥{money(maxDay.expense)}
            </span>
          </div>
        </section>
      )}

      {isLife && (
        <>
          <div className="h-row stats-section-title">
            <span className="stats-card-title">家庭成员消费</span>
            <span className="text-link" style={{ cursor: "default" }}>
              仅生活账
            </span>
          </div>
          <section className="card stats-member-card">
            {members.length === 0 && <p className="muted">暂无成员消费数据</p>}
            {members.map((m) => (
              <div className="stats-member-row" key={m.name}>
                <span className="stats-member-name">{m.name}</span>
                <div className="stats-member-track">
                  <i style={{ width: `${Math.max(4, (m.value / memberMax) * 100)}%` }} />
                </div>
                <span className="stats-member-amt">¥{money(m.value)}</span>
              </div>
            ))}
          </section>
        </>
      )}

      {!isLife && (
        <section className="card" style={{ padding: 18 }}>
          <h3 className="stats-card-title" style={{ marginTop: 0 }}>
            经营概览
          </h3>
          <p className="muted">
            实收 ¥{money(dash.business.income)} · 实付 ¥{money(dash.business.expense)} · 净利润 ¥
            {money(dash.business.profit)}
          </p>
          <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => go("biz")}>
            打开经营副业
          </button>
        </section>
      )}

      {range === "year" && isLife && (
        <section className="card" style={{ padding: 18, marginTop: 14 }}>
          <h3 className="stats-card-title" style={{ marginTop: 0 }}>
            近半年收支
          </h3>
          <div className="chart-box" style={{ height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={dash.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(70,55,110,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip />
                <Area type="monotone" dataKey="income" stroke="#8270d8" fill="#f0ecfc" name="收入" />
                <Area type="monotone" dataKey="expense" stroke="#d5879f" fill="#fce8ef" name="支出" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

function AccountsHome({ token, me, show, go, openSettings }) {
  const [wallets, setWallets] = useState([]);
  const [dash, setDash] = useState(null);

  useEffect(() => {
    api("/api/v1/accounts", { token }).then(setWallets).catch((e) => show(e.message));
    api("/api/v1/dashboard", { token }).then(setDash).catch(() => {});
  }, [token, show]);

  const lifeOpening = wallets
    .filter((w) => w.kind !== "business")
    .reduce((s, w) => s + (w.opening_balance || 0), 0);
  const bizOpening = wallets
    .filter((w) => w.kind === "business")
    .reduce((s, w) => s + (w.opening_balance || 0), 0);

  return (
    <div className="accounts-home">
      <div className="page-head">
        <div>
          <h2 className="hello">账户资产</h2>
          <p className="sub">{me?.user.display_name} · 生活与经营账户分开统计</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="text-link" onClick={() => go("home")}>
            ← 首页
          </button>
          <button type="button" className="btn" onClick={() => openSettings("wallets")}>
            管理
          </button>
        </div>
      </div>

      <div className="asset-hero">
        <div className="kl">生活账户期初合计</div>
        <div className="kv">¥ {money(lifeOpening)}</div>
        <div className="asset-split">
          <div>
            <span>生活支出</span>
            <b>¥ {money(dash?.family?.expense || 0)}</b>
          </div>
          <div>
            <span>生活收入</span>
            <b>¥ {money(dash?.family?.income || 0)}</b>
          </div>
          <div>
            <span>经营期初</span>
            <b>¥ {money(bizOpening)}</b>
          </div>
        </div>
      </div>

      <div className="card acct-strip">
        {wallets.map((w) => (
          <div className="acct-item" key={w.id}>
            <div className="acct-ic" style={{ background: "linear-gradient(135deg,var(--brand-d),#a884e8)" }}>
              {w.name.slice(0, 1)}
            </div>
            <div>
              <div className="an">{w.name}</div>
              <div className="as">
                {accountKindLabel(w.kind)} · {w.kind === "business" ? "经营" : "生活"}
              </div>
            </div>
            <div className="abal">
              <b>¥ {money(w.opening_balance)}</b>
              <small>期初余额</small>
            </div>
          </div>
        ))}
        {wallets.length === 0 && <div className="empty-state">还没有资金账户，点右上角「管理」添加。</div>}
      </div>
    </div>
  );
}

function TxRow({ t, canEdit, onEdit }) {
  const metaParts = [categoryLabel(t.category_name), t.user_name, t.account_name || t.ledger_name].filter(Boolean);
  return (
    <div
      className={`tx ${canEdit || onEdit ? "editable" : ""}`}
      onClick={onEdit ? () => onEdit(t) : undefined}
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onKeyDown={
        onEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(t);
              }
            }
          : undefined
      }
    >
      <div className="icon-bubble">
        <CategoryIcon name={t.category_name} emoji={t.category_icon} size={20} />
      </div>
      <div className="tx-body">
        <div className="tx-title">{t.note || categoryLabel(t.category_name)}</div>
        <div className="muted tx-meta">{metaParts.join(" · ")}</div>
      </div>
      <div className={`amount ${t.type}`}>
        {t.type === "expense" ? "−" : "+"}
        {money(t.amount)}
      </div>
    </div>
  );
}

function TxDayGroups({ rows, me, onEdit }) {
  const groups = groupTxByDay(rows);
  if (groups.length === 0) return null;
  return (
    <div className="tx-day-groups">
      {groups.map(([day, list]) => (
        <section key={day} className="tx-day-card">
          <div className="tx-day-head">
            <span>{formatDayHeading(day)}</span>
            <span className="tx-day-sum">支出 ¥{money(dayExpenseTotal(list))}</span>
          </div>
          <div className="list">
            {list.map((t) => (
              <TxRow key={t.id} t={t} canEdit={canEditTx(me, t)} onEdit={onEdit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function txFormFromRow(t) {
  const date = t.occurred_at?.slice(0, 10) || "";
  return {
    type: t.type,
    amount: String(t.amount),
    note: t.note || "",
    ledger_id: t.ledger_id,
    account_id: t.account_id,
    category_id: t.category_id,
    date,
  };
}

function TxEditModal({ tx, token, me, ledgers, accounts, cats, onClose, onSaved, onDelete, show }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => txFormFromRow(tx));
  const ledger = ledgers.find((l) => String(l.id) === String(form.ledger_id));
  const filteredCats = cats.filter(
    (c) => c.kind === form.type && (!ledger || c.ledger_type === ledger.type)
  );
  const canEdit = canEditTx(me, tx);
  useBodyScrollLock(true);

  useEffect(() => {
    setForm(txFormFromRow(tx));
    setEditing(false);
  }, [tx]);

  async function save(e) {
    e.preventDefault();
    try {
      const body = {
        type: form.type,
        amount: Number(form.amount),
        note: form.note,
        ledger_id: Number(form.ledger_id),
        account_id: Number(form.account_id),
        category_id: Number(form.category_id || filteredCats[0]?.id),
        occurred_at: `${form.date}T12:00:00`,
      };
      const updated = await api(`/api/v1/transactions/${tx.id}`, {
        token,
        method: "PATCH",
        body,
      });
      show("流水已更新");
      onSaved(updated);
      onClose();
    } catch (err) {
      show(err.message);
    }
  }

  if (!editing) {
    return (
      <div className="add-page tx-detail-page">
        <header className="add-page-head">
          <button type="button" className="add-back" onClick={onClose} aria-label="返回">
            <Icon name="chevron-left" size={22} />
          </button>
          <div className="add-page-titles">
            <div className="add-page-title-row">
              <h2>账单详情</h2>
              {canEdit && (
                <button type="button" className="text-link" onClick={() => setEditing(true)}>
                  编辑
                </button>
              )}
            </div>
            <p className="add-page-sub">
              {tx.ledger_name} · {tx.source === "ai_wechat" ? "微信入账" : "手工记账"}
            </p>
          </div>
        </header>
        <div className="tx-detail-hero">
          <span className="tx-detail-icon">
            <CategoryIcon name={tx.category_name} emoji={tx.category_icon} size={28} />
          </span>
          <p className="tx-detail-note">{tx.note || categoryLabel(tx.category_name)}</p>
          <p className={`tx-detail-amt ${tx.type}`}>
            {tx.type === "expense" ? "−" : "+"}¥{money(tx.amount)}
          </p>
        </div>
        <div className="add-info-card">
          <div className="add-field-row static">
            <span>分类</span>
            <strong>{categoryLabel(tx.category_name)}</strong>
          </div>
          <div className="add-field-row static">
            <span>账户</span>
            <strong>{tx.account_name}</strong>
          </div>
          <div className="add-field-row static">
            <span>账本</span>
            <strong>{tx.ledger_name}</strong>
          </div>
          <div className="add-field-row static">
            <span>成员</span>
            <strong>{tx.user_name}</strong>
          </div>
          <div className="add-field-row static">
            <span>时间</span>
            <strong>{formatCnDate(tx.occurred_at)}</strong>
          </div>
        </div>
        {canEdit && (
          <div className="add-page-foot">
            <button type="button" className="btn ghost danger" onClick={() => onDelete(tx)}>
              删除这笔账单
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="add-page tx-detail-page">
      <header className="add-page-head">
        <button type="button" className="add-back" onClick={() => setEditing(false)} aria-label="返回">
          <Icon name="chevron-left" size={22} />
        </button>
        <div>
          <h2>编辑账单</h2>
          <p className="add-page-sub">{tx.user_name} 记的</p>
        </div>
      </header>
      <form className="add-page-body" onSubmit={save}>
        <Segmented
          value={form.type}
          options={[
            ["expense", "支出"],
            ["income", "收入"],
          ]}
          onChange={(type) => setForm({ ...form, type, category_id: "" })}
        />
        <label className="amount-field">
          金额
          <input
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })}
            required
          />
        </label>
        <label>
          日期
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>
        <label>
          账本
          <select
            value={form.ledger_id}
            onChange={(e) => setForm({ ...form, ledger_id: e.target.value, category_id: "" })}
          >
            {ledgers.map((l) => (
              <option key={l.id} value={l.id}>
                <LedgerThumb ledger={l} size={22} /> {l.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          账户
          <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {accountKindLabel(a.kind)}
              </option>
            ))}
          </select>
        </label>
        <div className="cat-block">
          <span className="cat-label">分类</span>
          <div className="cat-grid">
            {filteredCats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`cat-tile ${String(form.category_id) === String(c.id) ? "on" : ""}`}
                onClick={() => setForm({ ...form, category_id: c.id })}
              >
                <span className="cat-tile-icon">
                  <CategoryIcon name={c.name} emoji={c.icon} size={22} />
                </span>
                <span className="cat-tile-label">{categoryLabel(c.name)}</span>
              </button>
            ))}
          </div>
        </div>
        <label>
          备注
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <div className="add-page-foot dual" style={{ marginTop: 16 }}>
          <button type="button" className="btn secondary" onClick={() => setEditing(false)}>
            取消
          </button>
          <button className="btn" type="submit">
            保存修改
          </button>
        </div>
      </form>
    </div>
  );
}

function TransactionList({ token, me, show, query, emptyText = "还没有流水。" }) {
  const [rows, setRows] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cats, setCats] = useState([]);
  const [editTx, setEditTx] = useState(null);

  const qs = Object.entries(query || {})
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  function loadRows() {
    const path = `/api/v1/transactions?limit=80${qs ? `&${qs}` : ""}`;
    return api(path, { token }).then(setRows);
  }

  useEffect(() => {
    if (!query || Object.values(query).some((v) => v != null && v !== "")) {
      loadRows();
    }
  }, [token, qs]);

  useEffect(() => {
    setEditTx(null);
  }, [qs]);

  useEffect(() => {
    Promise.all([
      api("/api/v1/ledgers", { token }),
      api("/api/v1/accounts", { token }),
      api("/api/v1/categories", { token }),
    ]).then(([l, a, c]) => {
      setLedgers(l);
      setAccounts(a);
      setCats(c);
    });
  }, [token]);

  async function deleteTx(t) {
    if (!window.confirm("确定删除这笔流水？删除后无法恢复。")) return;
    try {
      await api(`/api/v1/transactions/${t.id}`, { token, method: "DELETE" });
      show("流水已删除");
      setEditTx(null);
      loadRows();
    } catch (err) {
      show(err.message);
    }
  }

  return (
    <>
      {rows.length === 0 ? (
        <div className="empty-state">{emptyText}</div>
      ) : (
        <TxDayGroups rows={rows} me={me} onEdit={(row) => setEditTx(row)} />
      )}
      {editTx && (
        <TxEditModal
          tx={editTx}
          token={token}
          me={me}
          ledgers={ledgers}
          accounts={accounts}
          cats={cats}
          show={show}
          onClose={() => setEditTx(null)}
          onSaved={() => loadRows()}
          onDelete={deleteTx}
        />
      )}
    </>
  );
}

function Books({ token, me, show }) {
  const [ledgers, setLedgers] = useState([]);
  const [active, setActive] = useState(null);
  useEffect(() => {
    api("/api/v1/ledgers", { token }).then((ls) => {
      setLedgers(ls);
      setActive(ls[0]?.id);
    });
  }, [token]);
  const current = ledgers.find((l) => l.id === active);
  return (
    <div className="books-page">
      <div className="page-head">
        <div>
          <h2 className="hello">账本流水</h2>
          <p className="sub">点账本切换；点流水可编辑或删除。</p>
        </div>
      </div>
      <FilterBar label="账本">
        {ledgers.map((l) => (
          <FilterChip
            key={l.id}
            active={active === l.id}
            onClick={() => setActive(l.id)}
            className="ledger-filter"
          >
            <LedgerThumb ledger={l} size={22} />
            {l.name}
          </FilterChip>
        ))}
      </FilterBar>
      {current && (
        <>
          {current.cover_url && (
            <div className="ledger-cover-banner" style={{ backgroundImage: `url(${current.cover_url})` }} />
          )}
          <p className="muted books-desc">
            {current.description || (current.type === "business" ? "经营账不进入家庭消费饼图。" : "会计入家庭总览。")}
          </p>
        </>
      )}
      <div className="card books-list">
        {active && (
          <TransactionList
            token={token}
            me={me}
            show={show}
            query={{ ledger_id: active }}
            emptyText="这本账还空着，去记一笔吧。"
          />
        )}
      </div>
    </div>
  );
}

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function emptyAddForm(partial = {}) {
  return {
    type: "expense",
    amount: "",
    note: "",
    ledger_id: "",
    account_id: "",
    to_account_id: "",
    category_id: "",
    date: todayIso(),
    ...partial,
  };
}

function AddSuccess({ me, saved, onAgain, onBills, onHome }) {
  const isBiz = saved?.ledger_type === "business";
  return (
    <div className="modal-backdrop add-sheet-backdrop" onClick={onHome}>
      <div
        className="add-sheet-panel add-success-page"
        role="dialog"
        aria-labelledby="add-success-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-sheet-grab" aria-hidden />
        <header className="add-page-head">
          <div className="add-page-titles">
            <div className="add-page-title-row">
              <h2 id="add-success-title">记账完成</h2>
              <button type="button" className="text-link add-sheet-cancel" onClick={onHome}>
                完成
              </button>
            </div>
            <p className="add-page-sub">{me?.household?.name || "家庭"} · 已同步</p>
          </div>
        </header>
        <div className="add-page-body">
          <div className="add-success-hero">
            <span className="add-success-check">
              <Icon name="circle-check" size={48} />
            </span>
            <h3>保存成功</h3>
            <p>这笔账已记入家庭账本</p>
            <span className="add-success-pill">{isBiz ? "经营账" : "生活账"}</span>
          </div>
          <div className="add-info-card add-success-card">
            <div className="add-success-card-top">
              <span>{saved?.note || categoryLabel(saved?.category_name) || "账单"}</span>
              <span className={`add-type-tag ${saved?.type}`}>{saved?.type === "income" ? "收入" : "支出"}</span>
            </div>
            <div className={`add-success-amt ${saved?.type}`}>
              {saved?.type === "expense" ? "−" : "+"}¥{money(saved?.amount)}
            </div>
            <div className="add-field-row static">
              <span>分类</span>
              <strong>{categoryLabel(saved?.category_name)}</strong>
            </div>
            <div className="add-field-row static">
              <span>账户</span>
              <strong>{saved?.account_name}</strong>
            </div>
            <div className="add-field-row static">
              <span>记账时间</span>
              <strong>{formatCnDate(saved?.occurred_at)}</strong>
            </div>
          </div>
        </div>
        <div className="add-page-foot dual">
          <button type="button" className="btn secondary" onClick={onAgain}>
            再记一笔
          </button>
          <button type="button" className="btn" onClick={onBills}>
            查看账单
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSheet({ token, me, show, onClose, onGoBills }) {
  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(() => emptyAddForm());
  const [picker, setPicker] = useState(""); // account | date | ledger | note | transferTo
  const [moreCats, setMoreCats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  useBodyScrollLock(true);

  useEffect(() => {
    Promise.all([
      api("/api/v1/ledgers", { token }),
      api("/api/v1/accounts", { token }),
      api("/api/v1/categories", { token }),
    ]).then(([l, a, c]) => {
      setLedgers(l);
      setAccounts(a);
      setCats(c);
      let draft = null;
      try {
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      } catch {
        draft = null;
      }
      setForm((f) =>
        emptyAddForm({
          ...f,
          ...(draft || {}),
          ledger_id: draft?.ledger_id || l.find((x) => x.type !== "business")?.id || l[0]?.id || "",
          account_id: draft?.account_id || a[0]?.id || "",
          to_account_id: draft?.to_account_id || a[1]?.id || a[0]?.id || "",
          date: draft?.date || todayIso(),
        })
      );
    });
  }, [token]);

  const ledger = ledgers.find((l) => String(l.id) === String(form.ledger_id));
  const isBiz = ledger?.type === "business";
  const isTransfer = form.type === "transfer";
  const filteredCats = cats.filter(
    (c) => c.kind === (form.type === "income" ? "income" : "expense") && (!ledger || c.ledger_type === ledger.type)
  );
  const primaryNames = isBiz
    ? ["项目款", "带货/销售", "进货成本", "平台扣点", "工具订阅", "其他成本", "其他经营收入"]
    : form.type === "income"
      ? ["工资", "奖金", "报销", "其他收入"]
      : ["餐饮", "日用", "交通", "居住", "娱乐", "医疗", "教育"];
  const primaryCats = primaryNames.map((n) => filteredCats.find((c) => c.name === n)).filter(Boolean);
  const extraCats = filteredCats.filter((c) => !primaryCats.some((p) => p.id === c.id));
  const visibleCats = moreCats ? [...primaryCats, ...extraCats] : primaryCats;
  const selectedCat =
    filteredCats.find((c) => String(c.id) === String(form.category_id)) || visibleCats[0] || filteredCats[0];
  const account = accounts.find((a) => String(a.id) === String(form.account_id));
  const toAccount = accounts.find((a) => String(a.id) === String(form.to_account_id));
  const amountLabel =
    form.type === "income" ? "收入金额（元）" : form.type === "transfer" ? "转账金额（元）" : "支出金额（元）";
  const typeLabel = form.type === "income" ? "收入" : form.type === "transfer" ? "转账" : "支出";
  const draftHint = `${me?.household?.name || "家庭"} · ${isBiz ? "经营账" : "生活账"} · ${typeLabel}草稿`;

  function tapKey(key) {
    setForm((f) => {
      let amt = f.amount || "";
      if (key === "back") {
        amt = amt.slice(0, -1);
      } else if (key === ".") {
        if (!amt.includes(".")) amt = amt ? `${amt}.` : "0.";
      } else {
        if (amt.includes(".") && amt.split(".")[1]?.length >= 2) return f;
        if (amt === "0") amt = key;
        else amt = `${amt}${key}`;
      }
      return { ...f, amount: amt };
    });
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    show("草稿已保存（尚未计入收支）");
  }

  function resetFormKeepMeta() {
    setForm((f) =>
      emptyAddForm({
        ledger_id: f.ledger_id,
        account_id: f.account_id,
        to_account_id: f.to_account_id,
        type: f.type === "transfer" ? "expense" : f.type,
      })
    );
    setSaved(null);
    setMoreCats(false);
    setPicker("");
  }

  async function submit(keepGoing) {
    if (isTransfer) {
      show("转账将记为两笔流水，请确认转出与转入账户不同");
      if (!form.account_id || !form.to_account_id || String(form.account_id) === String(form.to_account_id)) {
        show("请选择不同的转出与转入账户");
        return;
      }
    }
    const amt = Number(form.amount);
    if (!(amt > 0)) {
      show("请输入大于 0 的金额");
      return;
    }
    if (!isTransfer && !selectedCat) {
      show("请选择分类");
      return;
    }
    setSaving(true);
    try {
      if (isTransfer) {
        const transferCat =
          cats.find((c) => c.name.includes("其他") && c.kind === "expense") ||
          cats.find((c) => c.kind === "expense");
        const incomeCat =
          cats.find((c) => c.name.includes("其他") && c.kind === "income") ||
          cats.find((c) => c.kind === "income");
        await api("/api/v1/transactions", {
          token,
          method: "POST",
          body: {
            type: "expense",
            amount: amt,
            note: form.note || "账户转出",
            ledger_id: Number(form.ledger_id),
            account_id: Number(form.account_id),
            category_id: Number(transferCat?.id),
            occurred_at: `${form.date}T12:00:00`,
          },
        });
        const created = await api("/api/v1/transactions", {
          token,
          method: "POST",
          body: {
            type: "income",
            amount: amt,
            note: form.note || "账户转入",
            ledger_id: Number(form.ledger_id),
            account_id: Number(form.to_account_id),
            category_id: Number(incomeCat?.id),
            occurred_at: `${form.date}T12:00:00`,
          },
        });
        localStorage.removeItem(DRAFT_KEY);
        if (keepGoing) {
          show("转账已保存。继续记账会新建一笔。");
          resetFormKeepMeta();
        } else {
          setSaved({ ...created, type: "expense", note: form.note || "账户转账", amount: amt });
        }
      } else {
        const created = await api("/api/v1/transactions", {
          token,
          method: "POST",
          body: {
            type: form.type,
            amount: amt,
            note: form.note,
            ledger_id: Number(form.ledger_id),
            account_id: Number(form.account_id),
            category_id: Number(form.category_id || selectedCat?.id),
            occurred_at: `${form.date}T12:00:00`,
          },
        });
        localStorage.removeItem(DRAFT_KEY);
        if (keepGoing) {
          show("已保存。继续记账会新建一笔。");
          resetFormKeepMeta();
        } else {
          setSaved(created);
        }
      }
    } catch (err) {
      show(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <AddSuccess
        me={me}
        saved={saved}
        onAgain={resetFormKeepMeta}
        onBills={() => {
          onClose();
          onGoBills?.();
        }}
        onHome={onClose}
      />
    );
  }

  return (
    <div className="modal-backdrop add-sheet-backdrop" onClick={onClose}>
      <div
        className="add-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="add-sheet-grab" aria-hidden />
        <header className="add-page-head">
          <div className="add-page-titles">
            <div className="add-page-title-row">
              <h2 id="add-sheet-title">{isBiz ? "记经营账" : "记一笔"}</h2>
              <div className="add-head-actions">
                <button type="button" className="text-link" onClick={saveDraft}>
                  草稿
                </button>
                <button type="button" className="text-link add-sheet-cancel" onClick={onClose}>
                  取消
                </button>
              </div>
            </div>
            <p className="add-page-sub">{draftHint}</p>
          </div>
        </header>

        <div className="add-page-body">
          <Segmented
            value={form.type}
            options={[
              ["expense", "支出"],
              ["income", "收入"],
              ["transfer", "转账"],
            ]}
            onChange={(type) => setForm({ ...form, type, category_id: "" })}
          />

          <div className="add-amount-block">
            <span className="add-amount-label">{amountLabel}</span>
            <div className="add-amount-value">
              <span>{form.amount ? money(form.amount) : "0.00"}</span>
              <i className="add-caret" aria-hidden />
            </div>
          </div>

          {!isTransfer && (
            <div className="cat-grid add-cat-grid">
              {visibleCats.map((c) => {
                const on = String(selectedCat?.id) === String(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`cat-tile ${on ? "on" : ""}`}
                    onClick={() => setForm({ ...form, category_id: c.id })}
                  >
                    <span className="cat-tile-icon">
                      <CategoryIcon name={c.name} emoji={c.icon} size={22} />
                    </span>
                    <span className="cat-tile-label">{categoryLabel(c.name)}</span>
                  </button>
                );
              })}
              {!moreCats && extraCats.length > 0 && (
                <button type="button" className="cat-tile" onClick={() => setMoreCats(true)}>
                  <span className="cat-tile-icon">
                    <Icon name="ellipsis" size={22} />
                  </span>
                  <span className="cat-tile-label">更多分类</span>
                </button>
              )}
            </div>
          )}

          <div className="add-info-card">
            {!isTransfer && (
              <button
                type="button"
                className="add-field-row"
                onClick={() => setPicker(picker === "ledger" ? "" : "ledger")}
              >
                <Icon name="notebook" size={18} />
                <span>账本</span>
                <strong>{ledger?.name || "选择账本"}</strong>
                <Icon name="chevron-right" size={15} />
              </button>
            )}
            <button
              type="button"
              className="add-field-row"
              onClick={() => setPicker(picker === "account" ? "" : "account")}
            >
              <Icon name="wallet" size={18} />
              <span>{form.type === "income" ? "收款账户" : isTransfer ? "转出账户" : "付款账户"}</span>
              <strong>{account ? `${account.name}` : "选择账户"}</strong>
              <Icon name="chevron-right" size={15} />
            </button>
            {isTransfer && (
              <button
                type="button"
                className="add-field-row"
                onClick={() => setPicker(picker === "transferTo" ? "" : "transferTo")}
              >
                <Icon name="wallet" size={18} />
                <span>转入账户</span>
                <strong>{toAccount ? `${toAccount.name}` : "选择账户"}</strong>
                <Icon name="chevron-right" size={15} />
              </button>
            )}
            <button type="button" className="add-field-row" onClick={() => setPicker(picker === "date" ? "" : "date")}>
              <Icon name="calendar-days" size={18} />
              <span>日期</span>
              <strong>{formatCnDate(form.date)}</strong>
              <Icon name="chevron-right" size={15} />
            </button>
            <div className="add-field-row static">
              <Icon name="user" size={18} />
              <span>记账成员</span>
              <strong>
                {me?.user?.display_name || "我"}
                {me?.user ? "（我）" : ""}
              </strong>
            </div>
            <button type="button" className="add-field-row" onClick={() => setPicker(picker === "note" ? "" : "note")}>
              <Icon name="paperclip" size={18} />
              <span>备注 / 附件</span>
              <strong>{form.note || "添加备注"}</strong>
              <Icon name="chevron-right" size={15} />
            </button>
          </div>

          {picker === "ledger" && (
            <div className="add-picker">
              {ledgers.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={String(form.ledger_id) === String(l.id) ? "on" : ""}
                  onClick={() => {
                    setForm({ ...form, ledger_id: l.id, category_id: "" });
                    setPicker("");
                    setMoreCats(false);
                  }}
                >
                  <LedgerThumb ledger={l} size={22} /> {l.name}
                </button>
              ))}
            </div>
          )}
          {(picker === "account" || picker === "transferTo") && (
            <div className="add-picker">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={
                    String(picker === "transferTo" ? form.to_account_id : form.account_id) === String(a.id) ? "on" : ""
                  }
                  onClick={() => {
                    if (picker === "transferTo") setForm({ ...form, to_account_id: a.id });
                    else setForm({ ...form, account_id: a.id });
                    setPicker("");
                  }}
                >
                  {a.name} · {accountKindLabel(a.kind)}
                </button>
              ))}
            </div>
          )}
          {picker === "date" && (
            <div className="add-picker">
              <input
                type="date"
                value={form.date}
                onChange={(e) => {
                  setForm({ ...form, date: e.target.value });
                  setPicker("");
                }}
              />
            </div>
          )}
          {picker === "note" && (
            <div className="add-picker">
              <input
                autoFocus
                value={form.note}
                placeholder="午饭 / 客户尾款 / 水电…"
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                onBlur={() => setPicker("")}
              />
            </div>
          )}
        </div>

        <div className="add-sheet-dock">
          <div className="num-pad" role="group" aria-label="数字键盘">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"].map((k) => (
              <button key={k} type="button" className="num-key" onClick={() => tapKey(k)}>
                {k === "back" ? <Icon name="backspace" size={20} /> : k}
              </button>
            ))}
          </div>
          <div className="add-page-foot dual">
            <button type="button" className="btn secondary" disabled={saving} onClick={() => submit(true)}>
              保存并再记
            </button>
            <button type="button" className="btn" disabled={saving} onClick={() => submit(false)}>
              {saving ? "保存中…" : "保存账单"}
            </button>
          </div>
          <p className="add-page-hint">草稿尚未计入收支 · 保存后自动同步家庭账本</p>
        </div>
      </div>
    </div>
  );
}

function Biz({ token, me, show }) {
  const [dash, setDash] = useState(null);
  useEffect(() => {
    api("/api/v1/dashboard", { token }).then(setDash);
  }, [token]);
  if (!dash) return null;
  return (
    <>
      <h2 className="hello">经营账本 · 副业小摊</h2>
      <p className="sub">进账、进货、订阅费单独统计，不计入家庭生活总额。点击流水可编辑或删除。</p>
      <div className="row three" style={{ marginTop: 16 }}>
        <div className="card sage">
          <div className="label">经营收入</div>
          <div className="num">¥ {money(dash.business.income)}</div>
        </div>
        <div className="card coral">
          <div className="label">经营成本</div>
          <div className="num">¥ {money(dash.business.expense)}</div>
        </div>
        <div className="card butter">
          <div className="label">毛利</div>
          <div className="num">¥ {money(dash.business.profit)}</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <TransactionList
          token={token}
          me={me}
          show={show}
          query={{ ledger_type: "business" }}
          emptyText="经营账还没有流水。"
        />
      </div>
    </>
  );
}

function Budget({ token, show }) {
  const now = new Date();
  const [amount, setAmount] = useState("8000");
  const [dash, setDash] = useState(null);
  useEffect(() => {
    api("/api/v1/dashboard", { token }).then(setDash);
  }, [token]);
  async function save(e) {
    e.preventDefault();
    await api("/api/v1/budgets", {
      token,
      method: "POST",
      body: { year: now.getFullYear(), month: now.getMonth() + 1, amount: Number(amount) },
    });
    show("预算已更新");
    api("/api/v1/dashboard", { token }).then(setDash);
  }
  return (
    <>
      <h2 className="hello">给这个月画一条温柔的线</h2>
      <form className="card" onSubmit={save} style={{ marginTop: 16, maxWidth: 420 }}>
        <label>
          家庭总支出预算（元）
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button className="btn" style={{ marginTop: 16 }}>
          保存
        </button>
      </form>
      <div className="card" style={{ marginTop: 16 }}>
        {dash?.budgets.map((b) => (
          <div key={b.id} style={{ marginBottom: 14 }}>
            <strong>{b.category_name}</strong>
            <div className={`budget-bar ${b.ratio > 0.85 ? "warn" : ""}`}>
              <span style={{ width: `${Math.min(100, b.ratio * 100)}%` }} />
            </div>
            <p className="muted">
              已用 {money(b.spent)} / {money(b.amount)}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

const AVATAR_COLORS = ["#E07A5F", "#81B29A", "#F2CC8F", "#3D405B", "#C77DFF", "#D4A373"];
const ROLE_LABEL = { owner: "家长", member: "成员", viewer: "只读" };

const LEDGER_TYPES = [
  ["personal", "个人账本"],
  ["family", "家庭公共"],
  ["business", "经营副业"],
];
const LEDGER_ICONS = LEDGER_ICON_KEYS;

function SettingsPanel({ token, me, show, onMeUpdate, initialTab = "profile" }) {
  const [tab, setTab] = useState(initialTab);
  const [profile, setProfile] = useState({
    username: "",
    display_name: "",
    wechat_alias: "",
    avatar_color: "#E07A5F",
  });
  const [pwd, setPwd] = useState({ old_password: "", new_password: "", confirm: "" });
  const [members, setMembers] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [memberForm, setMemberForm] = useState({
    username: "",
    password: "",
    display_name: "",
    wechat_alias: "",
    role: "member",
  });
  const [walletForm, setWalletForm] = useState({ name: "", kind: "cash", opening_balance: "0" });
  const [editWallet, setEditWallet] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [resetPwd, setResetPwd] = useState({ id: null, password: "" });
  const [ledgers, setLedgers] = useState([]);
  const [ledgerForm, setLedgerForm] = useState({
    name: "",
    type: "personal",
    icon: "notebook",
    description: "",
    include_in_family: true,
    owner_user_id: "",
  });
  const [editLedger, setEditLedger] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (me?.user) {
      setProfile({
        username: me.user.username,
        display_name: me.user.display_name,
        wechat_alias: me.user.wechat_alias || "",
        avatar_color: me.user.avatar_color,
      });
    }
  }, [me]);

  function loadMembers() {
    api("/api/v1/members", { token }).then(setMembers);
  }
  function loadWallets() {
    api("/api/v1/accounts", { token }).then(setWallets);
  }
  function loadLedgers() {
    api("/api/v1/ledgers", { token }).then(setLedgers);
  }
  useEffect(() => {
    loadMembers();
    loadWallets();
    loadLedgers();
  }, [token]);
  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    try {
      const updated = await apiUpload("/api/v1/me/avatar", token, file);
      onMeUpdate((prev) => ({ ...prev, user: { ...prev.user, ...updated } }));
      show("头像已更新");
    } catch (err) {
      show(err.message);
    } finally {
      setAvatarBusy(false);
      e.target.value = "";
    }
  }

  async function addLedger(e) {
    e.preventDefault();
    try {
      const body = {
        name: ledgerForm.name,
        type: ledgerForm.type,
        icon: ledgerForm.icon,
        description: ledgerForm.description,
        include_in_family: ledgerForm.type === "business" ? false : ledgerForm.include_in_family,
      };
      if (ledgerForm.type === "personal" && isOwner && ledgerForm.owner_user_id) {
        body.owner_user_id = Number(ledgerForm.owner_user_id);
      }
      await api("/api/v1/ledgers", { token, method: "POST", body });
      show("账本已创建");
      setLedgerForm({
        name: "",
        type: "personal",
        icon: "notebook",
        description: "",
        include_in_family: true,
        owner_user_id: "",
      });
      loadLedgers();
    } catch (err) {
      show(err.message);
    }
  }

  async function saveLedgerEdit(e) {
    e.preventDefault();
    try {
      const updated = await api(`/api/v1/ledgers/${editLedger.id}`, {
        token,
        method: "PATCH",
        body: {
          name: editLedger.name,
          icon: editLedger.icon,
          description: editLedger.description,
          include_in_family: editLedger.include_in_family,
          owner_user_id:
            editLedger.type === "personal" && isOwner && editLedger.owner_user_id
              ? Number(editLedger.owner_user_id)
              : undefined,
        },
      });
      setEditLedger({ ...editLedger, ...updated });
      show("账本已保存");
      loadLedgers();
    } catch (err) {
      show(err.message);
    }
  }

  async function uploadLedgerCover(e) {
    const file = e.target.files?.[0];
    if (!file || !editLedger) return;
    try {
      const updated = await apiUpload(`/api/v1/ledgers/${editLedger.id}/cover`, token, file);
      setEditLedger({ ...editLedger, ...updated });
      show("封面已更新");
      loadLedgers();
    } catch (err) {
      show(err.message);
    } finally {
      e.target.value = "";
    }
  }

  async function removeLedger(id) {
    if (!window.confirm("确定删除这个账本？已有流水的账本无法删除。")) return;
    try {
      await api(`/api/v1/ledgers/${id}`, { token, method: "DELETE" });
      show("账本已删除");
      loadLedgers();
      if (editLedger?.id === id) setEditLedger(null);
    } catch (err) {
      show(err.message);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      const updated = await api("/api/v1/me", {
        token,
        method: "PATCH",
        body: profile,
      });
      onMeUpdate((prev) => ({ ...prev, user: { ...prev.user, ...updated } }));
      show("资料已保存");
    } catch (err) {
      show(err.message);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) {
      show("两次新密码不一致");
      return;
    }
    try {
      await api("/api/v1/me/password", {
        token,
        method: "POST",
        body: { old_password: pwd.old_password, new_password: pwd.new_password },
      });
      setPwd({ old_password: "", new_password: "", confirm: "" });
      show("密码已更新");
    } catch (err) {
      show(err.message);
    }
  }

  async function addMember(e) {
    e.preventDefault();
    try {
      await api("/api/v1/members", { token, method: "POST", body: memberForm });
      show("新成员已添加");
      setMemberForm({ username: "", password: "", display_name: "", wechat_alias: "", role: "member" });
      loadMembers();
    } catch (err) {
      show(err.message);
    }
  }

  async function saveMemberEdit(e) {
    e.preventDefault();
    try {
      await api(`/api/v1/members/${editMember.id}`, {
        token,
        method: "PATCH",
        body: {
          display_name: editMember.display_name,
          wechat_alias: editMember.wechat_alias,
          role: editMember.role,
          avatar_color: editMember.avatar_color,
        },
      });
      show("成员资料已更新");
      setEditMember(null);
      loadMembers();
      if (editMember.id === me?.user.id) {
        const fresh = await api("/api/v1/me", { token });
        onMeUpdate(fresh);
      }
    } catch (err) {
      show(err.message);
    }
  }

  async function doResetPassword(e) {
    e.preventDefault();
    try {
      await api(`/api/v1/members/${resetPwd.id}/password`, {
        token,
        method: "POST",
        body: { new_password: resetPwd.password },
      });
      show("密码已重置");
      setResetPwd({ id: null, password: "" });
    } catch (err) {
      show(err.message);
    }
  }

  async function addWallet(e) {
    e.preventDefault();
    try {
      await api("/api/v1/accounts", {
        token,
        method: "POST",
        body: {
          name: walletForm.name,
          kind: walletForm.kind,
          opening_balance: Number(walletForm.opening_balance) || 0,
        },
      });
      show("资金账户已添加");
      setWalletForm({ name: "", kind: "cash", opening_balance: "0" });
      loadWallets();
    } catch (err) {
      show(err.message);
    }
  }

  async function removeWallet(id) {
    if (!window.confirm("确定删除这个资金账户？已有流水的账户无法删除。")) return;
    try {
      await api(`/api/v1/accounts/${id}`, { token, method: "DELETE" });
      show("已删除");
      loadWallets();
    } catch (err) {
      show(err.message);
    }
  }

  async function saveWalletEdit(e) {
    e.preventDefault();
    try {
      await api(`/api/v1/accounts/${editWallet.id}`, {
        token,
        method: "PATCH",
        body: {
          name: editWallet.name,
          kind: editWallet.kind,
          opening_balance: Number(editWallet.opening_balance) || 0,
        },
      });
      show("资金账户已更新");
      setEditWallet(null);
      loadWallets();
    } catch (err) {
      show(err.message);
    }
  }

  const isOwner = me?.user.role === "owner";

  return (
    <div className="accounts-page">
      <div className="page-head">
        <div>
          <h2 className="hello">设置</h2>
          <p className="sub">资料、账本、家人与资金账户。</p>
        </div>
      </div>
      <div className="settings-tabs-wrap">
        <Segmented
          value={tab}
          options={[
            ["profile", "资料"],
            ["ledgers", "账本"],
            ["members", "家人"],
            ["wallets", "账户"],
          ]}
          onChange={setTab}
        />
      </div>

      {tab === "profile" && (
        <>
          <form className="card form-grid" onSubmit={saveProfile}>
            <h3 style={{ gridColumn: "1 / -1" }}>个人资料</h3>
            <div className="avatar-upload" style={{ gridColumn: "1 / -1" }}>
              <UserAvatar user={me?.user} size={72} />
              <div>
                <p className="muted">上传头像（JPG/PNG，最大 2MB）</p>
                <label className="btn ghost btn-sm avatar-btn">
                  {avatarBusy ? "上传中…" : "更换头像"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={uploadAvatar} />
                </label>
              </div>
            </div>
            <label>
              登录名
              <input
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                autoComplete="username"
                minLength={2}
                maxLength={40}
                required
              />
            </label>
            <label>
              角色
              <input value={ROLE_LABEL[me?.user.role] || me?.user.role} disabled />
            </label>
            <label>
              显示昵称
              <input
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                required
              />
            </label>
            <label>
              微信别名
              <input
                value={profile.wechat_alias}
                onChange={(e) => setProfile({ ...profile, wechat_alias: e.target.value })}
                placeholder="与微信备注一致，语音记账用"
              />
            </label>
            <div style={{ gridColumn: "1 / -1" }}>
              <span className="cat-label">头像颜色</span>
              <div className="chips">
                {AVATAR_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`color-dot ${profile.avatar_color === c ? "on" : ""}`}
                    style={{ background: c }}
                    onClick={() => setProfile({ ...profile, avatar_color: c })}
                  />
                ))}
              </div>
            </div>
            <button className="btn" style={{ gridColumn: "1 / -1" }}>
              保存资料
            </button>
          </form>
          <form className="card form-grid" onSubmit={savePassword} style={{ marginTop: 16 }}>
            <h3 style={{ gridColumn: "1 / -1" }}>修改密码</h3>
            <label style={{ gridColumn: "1 / -1" }}>
              当前密码
              <input
                type="password"
                value={pwd.old_password}
                onChange={(e) => setPwd({ ...pwd, old_password: e.target.value })}
                required
              />
            </label>
            <label>
              新密码
              <input
                type="password"
                value={pwd.new_password}
                onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
                minLength={6}
                required
              />
            </label>
            <label>
              确认新密码
              <input
                type="password"
                value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                minLength={6}
                required
              />
            </label>
            <button className="btn ghost" style={{ gridColumn: "1 / -1" }}>
              更新密码
            </button>
          </form>
        </>
      )}

      {tab === "ledgers" && (
        <>
          <div className="card">
            {ledgers.map((l) => (
              <div className="member-row ledger-row" key={l.id}>
                <div className="member-main">
                  <LedgerThumb ledger={l} size={48} />
                  <div>
                    <strong>{l.name}</strong>
                    <div className="muted">
                      {LEDGER_TYPES.find(([t]) => t === l.type)?.[1] || l.type}
                      {l.include_in_family ? " · 计入家庭总览" : " · 不计入家庭总览"}
                    </div>
                    {l.description && <div className="muted">{l.description}</div>}
                  </div>
                </div>
                <div className="member-actions">
                  {canEditLedger(me, l) && (
                    <button type="button" className="btn ghost btn-sm" onClick={() => setEditLedger({ ...l })}>
                      编辑
                    </button>
                  )}
                  {isOwner && (
                    <button type="button" className="btn ghost btn-sm" onClick={() => removeLedger(l.id)}>
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
            {ledgers.length === 0 && <p className="muted">还没有账本，在下方添加一本。</p>}
          </div>
          {me?.user.role !== "viewer" && (
            <form className="card form-grid" onSubmit={addLedger} style={{ marginTop: 16 }}>
              <h3 style={{ gridColumn: "1 / -1" }}>新增账本</h3>
              <label>
                名称
                <input
                  value={ledgerForm.name}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, name: e.target.value })}
                  placeholder="小林私房 / 周末摆摊"
                  required
                />
              </label>
              <label>
                类型
                <select
                  value={ledgerForm.type}
                  onChange={(e) =>
                    setLedgerForm({
                      ...ledgerForm,
                      type: e.target.value,
                      include_in_family: e.target.value !== "business",
                    })
                  }
                >
                  {LEDGER_TYPES.map(([t, label]) => (
                    <option key={t} value={t} disabled={!isOwner && t !== "personal"}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {ledgerForm.type === "personal" && isOwner && (
                <label style={{ gridColumn: "1 / -1" }}>
                  归属成员
                  <select
                    value={ledgerForm.owner_user_id || me?.user.id}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, owner_user_id: e.target.value })}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label style={{ gridColumn: "1 / -1" }}>
                简介
                <input
                  value={ledgerForm.description}
                  onChange={(e) => setLedgerForm({ ...ledgerForm, description: e.target.value })}
                  placeholder="可选，账本页会显示"
                />
              </label>
              {ledgerForm.type !== "business" && (
                <label style={{ gridColumn: "1 / -1", flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={ledgerForm.include_in_family}
                    onChange={(e) => setLedgerForm({ ...ledgerForm, include_in_family: e.target.checked })}
                    style={{ width: 20, height: 20, minHeight: 20 }}
                  />
                  计入家庭总览与饼图
                </label>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="cat-label">图标</span>
                <div className="chips">
                  {LEDGER_ICONS.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      className={`chip icon-chip ${resolveLedgerIcon(ledgerForm.icon) === ic ? "on" : ""}`}
                      onClick={() => setLedgerForm({ ...ledgerForm, icon: ic })}
                      aria-label={ic}
                    >
                      <Icon name={ic} size={18} />
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn" style={{ gridColumn: "1 / -1" }}>
                创建账本
              </button>
            </form>
          )}
        </>
      )}

      {tab === "members" && (
        <>
          <div className="card">
            {members.map((m) => (
              <div className="member-row" key={m.id}>
                <div className="member-main">
                  <UserAvatar user={m} size={40} />
                  <div>
                    <strong>{m.display_name}</strong>
                    <div className="muted">@{m.username} · {ROLE_LABEL[m.role] || m.role}</div>
                    <div className="muted">微信：{m.wechat_alias || "未设置"}</div>
                  </div>
                </div>
                <div className="member-actions">
                  {(isOwner || m.id === me?.user.id) && (
                    <button type="button" className="btn ghost btn-sm" onClick={() => setEditMember({ ...m })}>
                      编辑
                    </button>
                  )}
                  {(isOwner || m.id === me?.user.id) && (
                    <button
                      type="button"
                      className="btn ghost btn-sm"
                      onClick={() => {
                        if (m.id === me?.user.id) {
                          setTab("profile");
                          show("请在下方「修改密码」表单操作");
                        } else {
                          setResetPwd({ id: m.id, password: "" });
                        }
                      }}
                    >
                      改密
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {isOwner && (
            <form className="card form-grid" onSubmit={addMember} style={{ marginTop: 16 }}>
              <h3 style={{ gridColumn: "1 / -1" }}>添加家庭成员</h3>
              <label>
                登录名
                <input
                  value={memberForm.username}
                  onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })}
                  required
                />
              </label>
              <label>
                初始密码
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  minLength={6}
                  required
                />
              </label>
              <label>
                昵称
                <input
                  value={memberForm.display_name}
                  onChange={(e) => setMemberForm({ ...memberForm, display_name: e.target.value })}
                  required
                />
              </label>
              <label>
                微信别名
                <input
                  value={memberForm.wechat_alias}
                  onChange={(e) => setMemberForm({ ...memberForm, wechat_alias: e.target.value })}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                角色
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                >
                  <option value="member">成员</option>
                  <option value="viewer">只读</option>
                  <option value="owner">家长</option>
                </select>
              </label>
              <button className="btn" style={{ gridColumn: "1 / -1" }}>
                添加成员
              </button>
            </form>
          )}
        </>
      )}

      {tab === "wallets" && (
        <>
          <div className="card">
            {wallets.map((w) => (
              <div className="member-row" key={w.id}>
                <div>
                  <strong>{w.name}</strong>
                  <div className="muted">
                    {accountKindLabel(w.kind)} · 期初 ¥ {money(w.opening_balance)}
                  </div>
                </div>
                <div className="member-actions">
                  {me?.user.role !== "viewer" && (
                    <button type="button" className="btn ghost btn-sm" onClick={() => setEditWallet({ ...w })}>
                      编辑
                    </button>
                  )}
                  {isOwner && (
                    <button type="button" className="btn ghost btn-sm" onClick={() => removeWallet(w.id)}>
                      删除
                    </button>
                  )}
                </div>
              </div>
            ))}
            {wallets.length === 0 && <p className="muted">还没有资金账户，记帐时需要选择账户。</p>}
          </div>
          {me?.user.role !== "viewer" && (
            <form className="card form-grid" onSubmit={addWallet} style={{ marginTop: 16 }}>
              <h3 style={{ gridColumn: "1 / -1" }}>新增资金账户</h3>
              <label>
                名称
                <input
                  value={walletForm.name}
                  onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })}
                  placeholder="小林微信 / 家庭备用金"
                  required
                />
              </label>
              <label>
                类型
                <select value={walletForm.kind} onChange={(e) => setWalletForm({ ...walletForm, kind: e.target.value })}>
                  {ACCOUNT_KINDS.map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                期初余额
                <input
                  type="text"
                  inputMode="decimal"
                  value={walletForm.opening_balance}
                  onChange={(e) => setWalletForm({ ...walletForm, opening_balance: e.target.value })}
                />
              </label>
              <button className="btn" style={{ gridColumn: "1 / -1" }}>
                添加账户
              </button>
            </form>
          )}
        </>
      )}

      {editWallet && (
        <div className="modal-backdrop" onClick={() => setEditWallet(null)}>
          <form className="card modal" onSubmit={saveWalletEdit} onClick={(e) => e.stopPropagation()}>
            <h3>编辑资金账户 · {editWallet.name}</h3>
            <label>
              名称
              <input
                value={editWallet.name}
                onChange={(e) => setEditWallet({ ...editWallet, name: e.target.value })}
                required
              />
            </label>
            <label>
              类型
              <select
                value={editWallet.kind}
                onChange={(e) => setEditWallet({ ...editWallet, kind: e.target.value })}
              >
                {ACCOUNT_KINDS.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              期初余额
              <input
                type="text"
                inputMode="decimal"
                value={editWallet.opening_balance}
                onChange={(e) => setEditWallet({ ...editWallet, opening_balance: e.target.value })}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setEditWallet(null)}>
                取消
              </button>
              <button className="btn">保存</button>
            </div>
          </form>
        </div>
      )}

      {editLedger && (
        <div className="modal-backdrop" onClick={() => setEditLedger(null)}>
          <form className="card modal" onSubmit={saveLedgerEdit} onClick={(e) => e.stopPropagation()}>
            <h3>编辑账本 · {editLedger.name}</h3>
            <div className="ledger-edit-cover">
              <LedgerThumb ledger={editLedger} size={72} />
              <label className="btn ghost btn-sm">
                上传封面
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={uploadLedgerCover} />
              </label>
            </div>
            <label>
              名称
              <input
                value={editLedger.name}
                onChange={(e) => setEditLedger({ ...editLedger, name: e.target.value })}
                required
              />
            </label>
            <label>
              简介
              <input
                value={editLedger.description || ""}
                onChange={(e) => setEditLedger({ ...editLedger, description: e.target.value })}
              />
            </label>
            {editLedger.type === "personal" && isOwner && (
              <label>
                归属成员
                <select
                  value={editLedger.owner_user_id || ""}
                  onChange={(e) => setEditLedger({ ...editLedger, owner_user_id: Number(e.target.value) })}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.display_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editLedger.type !== "business" && (
              <label style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={editLedger.include_in_family}
                  onChange={(e) => setEditLedger({ ...editLedger, include_in_family: e.target.checked })}
                  style={{ width: 20, height: 20, minHeight: 20 }}
                />
                计入家庭总览
              </label>
            )}
            <div className="chips" style={{ marginTop: 8 }}>
              {LEDGER_ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  className={`chip icon-chip ${resolveLedgerIcon(editLedger.icon) === ic ? "on" : ""}`}
                  onClick={() => setEditLedger({ ...editLedger, icon: ic })}
                  aria-label={ic}
                >
                  <Icon name={ic} size={18} />
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setEditLedger(null)}>
                取消
              </button>
              <button className="btn">保存</button>
            </div>
          </form>
        </div>
      )}

      {editMember && (
        <div className="modal-backdrop" onClick={() => setEditMember(null)}>
          <form className="card modal" onSubmit={saveMemberEdit} onClick={(e) => e.stopPropagation()}>
            <h3>编辑成员 · {editMember.display_name}</h3>
            <label>
              昵称
              <input
                value={editMember.display_name}
                onChange={(e) => setEditMember({ ...editMember, display_name: e.target.value })}
                required
              />
            </label>
            <label>
              微信别名
              <input
                value={editMember.wechat_alias || ""}
                onChange={(e) => setEditMember({ ...editMember, wechat_alias: e.target.value })}
              />
            </label>
            {isOwner && editMember.id !== me?.user.id && (
              <label>
                角色
                <select
                  value={editMember.role}
                  onChange={(e) => setEditMember({ ...editMember, role: e.target.value })}
                >
                  <option value="member">成员</option>
                  <option value="viewer">只读</option>
                  <option value="owner">家长</option>
                </select>
              </label>
            )}
            <div className="chips" style={{ marginTop: 8 }}>
              {AVATAR_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-dot ${editMember.avatar_color === c ? "on" : ""}`}
                  style={{ background: c }}
                  onClick={() => setEditMember({ ...editMember, avatar_color: c })}
                />
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setEditMember(null)}>
                取消
              </button>
              <button className="btn">保存</button>
            </div>
          </form>
        </div>
      )}

      {resetPwd.id && resetPwd.id !== me?.user.id && (
        <div className="modal-backdrop" onClick={() => setResetPwd({ id: null, password: "" })}>
          <form className="card modal" onSubmit={doResetPassword} onClick={(e) => e.stopPropagation()}>
            <h3>重置成员密码</h3>
            <label>
              新密码
              <input
                type="password"
                value={resetPwd.password}
                onChange={(e) => setResetPwd({ ...resetPwd, password: e.target.value })}
                minLength={6}
                required
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setResetPwd({ id: null, password: "" })}>
                取消
              </button>
              <button className="btn">确认重置</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

async function downloadFile(path, token, filename) {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("下载失败");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BackupPanel({ token, me, show }) {
  const [items, setItems] = useState([]);
  const [cfg, setCfg] = useState({
    enabled: false,
    frequency: "daily",
    hour: 3,
    minute: 0,
    weekday: 0,
    keep_count: 7,
  });
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/backups", { token }).then((data) => {
      setItems(data.items || []);
      if (data.config) setCfg((c) => ({ ...c, ...data.config }));
    });
  }
  useEffect(load, [token]);

  if (me?.user.role !== "owner") {
    return (
      <>
        <h2 className="hello">数据备份</h2>
        <p className="muted">仅家长可管理备份与恢复。</p>
      </>
    );
  }

  async function saveConfig(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await api("/api/v1/backup-config", { token, method: "PUT", body: cfg });
      setCfg(saved);
      show("定时备份设置已保存");
    } catch (err) {
      show(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function backupNow() {
    setBusy(true);
    try {
      await api("/api/v1/backups", { token, method: "POST" });
      show("备份已完成");
      load();
    } catch (err) {
      show(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(name) {
    if (!window.confirm(`删除备份 ${name}？`)) return;
    try {
      await api(`/api/v1/backups/${encodeURIComponent(name)}`, { token, method: "DELETE" });
      show("已删除");
      load();
    } catch (err) {
      show(err.message);
    }
  }

  async function restore(name) {
    if (
      !window.confirm(
        `确定用 ${name} 恢复数据？当前账本会被覆盖，建议先手动备份一次。恢复后建议在 NAS 上重启容器。`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await api(`/api/v1/backups/${encodeURIComponent(name)}/restore`, { token, method: "POST" });
      show(res.hint || "已恢复");
    } catch (err) {
      show(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="accounts-page">
      <h2 className="hello">数据备份</h2>
      <p className="sub">备份保存在 NAS 数据卷 /data/backups，可下载到电脑或配合定时任务自动备份。</p>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>立即备份</h3>
        <p className="muted">打包当前账本数据库为 zip，含 luckynote.db 与说明文件。</p>
        <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={backupNow}>
          立即备份
        </button>
      </div>

      <form className="card form-grid" onSubmit={saveConfig} style={{ marginTop: 16 }}>
        <h3 style={{ gridColumn: "1 / -1" }}>定时备份</h3>
        <label style={{ gridColumn: "1 / -1", flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            style={{ width: 20, height: 20, minHeight: 20 }}
          />
          启用自动备份（容器运行中按下方时间执行）
        </label>
        <label>
          频率
          <select value={cfg.frequency} onChange={(e) => setCfg({ ...cfg, frequency: e.target.value })}>
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
          </select>
        </label>
        {cfg.frequency === "weekly" && (
          <label>
            星期
            <select value={cfg.weekday} onChange={(e) => setCfg({ ...cfg, weekday: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          小时 (0-23)
          <input
            type="number"
            min={0}
            max={23}
            value={cfg.hour}
            onChange={(e) => setCfg({ ...cfg, hour: Number(e.target.value) })}
          />
        </label>
        <label>
          分钟
          <input
            type="number"
            min={0}
            max={59}
            value={cfg.minute}
            onChange={(e) => setCfg({ ...cfg, minute: Number(e.target.value) })}
          />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          保留份数（超出自动删最旧）
          <input
            type="number"
            min={1}
            max={365}
            value={cfg.keep_count}
            onChange={(e) => setCfg({ ...cfg, keep_count: Number(e.target.value) })}
          />
        </label>
        <button className="btn sage" style={{ gridColumn: "1 / -1" }} disabled={busy}>
          保存定时设置
        </button>
      </form>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>备份列表</h3>
        {items.length === 0 && <p className="muted">还没有备份，点「立即备份」创建第一份。</p>}
        {items.map((b) => (
          <div className="member-row" key={b.filename}>
            <div>
              <strong>{b.filename}</strong>
              <div className="muted">
                {b.created_at.slice(0, 19).replace("T", " ")} · {b.size_human}
              </div>
            </div>
            <div className="member-actions">
              <button
                type="button"
                className="btn ghost btn-sm"
                onClick={() =>
                  downloadFile(`/api/v1/backups/${encodeURIComponent(b.filename)}/download`, token, b.filename).catch(
                    (e) => show(e.message)
                  )
                }
              >
                下载
              </button>
              <button type="button" className="btn ghost btn-sm" onClick={() => restore(b.filename)}>
                恢复
              </button>
              <button type="button" className="btn ghost btn-sm" onClick={() => remove(b.filename)}>
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiPanel({ token, show, me }) {
  const [text, setText] = useState("中午吃饭花了35，记我账上");
  const [reply, setReply] = useState("");
  const [tokenInfo, setTokenInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    api("/api/v1/tokens", { token }).then(setTokenInfo).catch(() => {});
    if (me?.user.role === "owner") api("/api/v1/ai/logs", { token }).then(setLogs).catch(() => {});
  }, [token, me]);
  async function ingest(dry) {
    try {
      const data = await api("/api/v1/ai/ingest", { token, method: "POST", body: { text, dry_run: dry } });
      setReply(data.reply);
      show(dry ? "只是预览" : "已写入账本");
      if (me?.user.role === "owner") api("/api/v1/ai/logs", { token }).then(setLogs);
    } catch (err) {
      show(err.message);
    }
  }
  async function mint() {
    const data = await api("/api/v1/tokens", { token, method: "POST" });
    setTokenInfo([{ prefix: data.prefix, raw: data.token }]);
    show("Token 已生成，请立刻复制到 OpenClaw");
  }
  return (
    <>
      <h2 className="hello">微信语音，窝窝代记</h2>
      <p className="sub">OpenClaw 转写后调用本接口。也可以在这里先用文字试一试。</p>
      <div className="card" style={{ marginTop: 16 }}>
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn ghost" type="button" onClick={() => ingest(true)}>
            先看看解析
          </button>
          <button className="btn" type="button" onClick={() => ingest(false)}>
            正式入账
          </button>
        </div>
        {reply && <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{reply}</p>}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>OpenClaw Token</h3>
        <p className="muted">家长生成后填入 Skill 环境变量 LUCKYNOTE_API_TOKEN。</p>
        {Array.isArray(tokenInfo) &&
          tokenInfo.map((t, i) => (
            <p key={i}>
              前缀 {t.prefix} {t.raw && <code>{t.raw}</code>}
            </p>
          ))}
        {me?.user.role === "owner" && (
          <button className="btn sage" onClick={mint}>
            生成新 Token
          </button>
        )}
      </div>
      {logs.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>入账审计</h3>
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>时间</th>
                <th>原文</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.created_at.slice(0, 19)}</td>
                  <td>{l.raw_text}</td>
                  <td>{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </>
  );
}
