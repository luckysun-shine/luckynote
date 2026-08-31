import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  return (
    <span
      className={`ledger-thumb icon-thumb ${className}`}
      style={{ width: px, height: px, fontSize: px * 0.55 }}
    >
      {ledger?.icon || "📒"}
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

function Fox({ size = 86 }) {
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <ellipse cx="60" cy="102" rx="28" ry="8" fill="#e8d5c4" />
      <rect x="38" y="70" width="44" height="30" rx="10" fill="#f2cc8f" />
      <path d="M44 78h32v8H44z" fill="#e07a5f" />
      <circle cx="60" cy="52" r="28" fill="#e07a5f" />
      <path d="M34 40 L42 18 L54 40 Z" fill="#c45c42" />
      <path d="M86 40 L78 18 L66 40 Z" fill="#c45c42" />
      <circle cx="50" cy="52" r="5" fill="#3d405b" />
      <circle cx="70" cy="52" r="5" fill="#3d405b" />
      <circle cx="51.5" cy="50.5" r="1.6" fill="#fff" />
      <circle cx="71.5" cy="50.5" r="1.6" fill="#fff" />
      <ellipse cx="60" cy="62" rx="5" ry="3.5" fill="#3d405b" />
      <path d="M48 66 Q60 74 72 66" fill="none" stroke="#3d405b" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="28" cy="58" r="7" fill="#e07a5f" />
      <circle cx="92" cy="58" r="7" fill="#e07a5f" />
    </svg>
  );
}

function money(n) {
  return Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const NAV = [
  ["home", "暖窝总览"],
  ["books", "三本账"],
  ["add", "记一笔"],
  ["biz", "经营副业"],
  ["budget", "预算"],
  ["settings", "设置"],
  ["backup", "数据备份"],
  ["ai", "微信 / AI"],
];

const TABS = [
  { id: "home", label: "总览", icon: "🏡" },
  { id: "books", label: "账本", icon: "📒" },
  { id: "add", label: "记账", icon: "✎", fab: true },
  { id: "biz", label: "经营", icon: "🎨" },
  { id: "more", label: "更多", icon: "✦" },
];

const MORE_PAGES = ["more", "budget", "settings", "accounts", "backup", "ai"];

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("ln_token") || "");
  const [me, setMe] = useState(null);
  const [page, setPage] = useState("home");
  const [toast, setToast] = useState("");

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
        onLogin={(t, user) => {
          localStorage.setItem("ln_token", t);
          setToken(t);
          setMe({ user, household: { name: "暖窝一家" } });
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
        <Fox size={40} />
        <div className="m-header-text">
          <strong className="brand-cn">暖窝账本</strong>
          <span>
            <UserAvatar user={me?.user} size={22} className="header-avatar" /> {me?.user.display_name} · {me?.household?.name}
          </span>
        </div>
      </header>
      <aside className="sider">
        <div className="brand">
          <Fox size={58} />
          <div>
            <h1 className="brand-cn">暖窝账本</h1>
            <p>LuckyNote · 家庭小金库</p>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(([id, label]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
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
              离开暖窝
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        <div className="page-stack">
        {page === "home" && <Home token={token} me={me} go={setPage} />}
        {page === "books" && <Books token={token} />}
        {page === "add" && <Add token={token} show={show} />}
        {page === "biz" && <Biz token={token} />}
        {page === "budget" && <Budget token={token} show={show} />}
        {(page === "settings" || page === "accounts" || page === "family") && (
          <SettingsPanel token={token} me={me} show={show} onMeUpdate={setMe} />
        )}
        {page === "backup" && <BackupPanel token={token} me={me} show={show} />}
        {page === "ai" && <AiPanel token={token} show={show} me={me} />}
        {page === "more" && <More go={setPage} logout={logout} me={me} />}
        </div>
      </main>
      <nav className="tabbar" aria-label="手机导航">
        {TABS.map((tab) => {
          const on = tab.id === "more" ? MORE_PAGES.includes(page) : page === tab.id;
          return (
            <button
              key={tab.id}
              className={`tab ${on ? "on" : ""} ${tab.fab ? "fab" : ""}`}
              onClick={() => setPage(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Login({ onLogin, show, toast }) {
  const [username, setUsername] = useState("lin");
  const [password, setPassword] = useState("luckynote");

  async function submit(e) {
    e.preventDefault();
    try {
      const data = await api("/api/v1/auth/login", { method: "POST", body: { username, password } });
      onLogin(data.token, data.user);
    } catch (err) {
      show(err.message);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="hero">
          <Fox />
          <h2>把每一笔生活，收进暖窝</h2>
          <p className="sub">
            家人各自记账，月底一起看家底；副业单独一本账。手机浏览器打开就能用，也可添加到主屏幕。
          </p>
          <p className="muted" style={{ marginTop: 24 }}>
            演示账号 lin / yuan，密码均为 luckynote
          </p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <h3>欢迎回家</h3>
          <label>
            用户名
            <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label style={{ marginTop: 12 }}>
            密码
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn" style={{ marginTop: 22, width: "100%" }}>
            推开暖窝的门
          </button>
        </form>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function More({ go, logout, me }) {
  const items = [
    ["budget", "预算", "给这个月画一条温柔的线"],
    ["settings", "设置", "资料头像、账本配置、家人与资金账户"],
    ["backup", "数据备份", "手动备份与定时备份设置"],
    ["ai", "微信 / AI", "语音记账 Token 与试写"],
  ];
  return (
    <>
      <h2 className="hello">更多</h2>
      <p className="sub">预算、家人和微信入口都在这里。底部中间按钮随时记账。</p>
      <div className="more-list">
        {items.map(([id, title, desc]) => (
          <button key={id} className="more-item" onClick={() => go(id)}>
            <strong>{title}</strong>
            <span className="muted">{desc}</span>
          </button>
        ))}
      </div>
      <div className="card install-card">
        <h3>把暖窝放到手机主屏幕</h3>
        <p className="muted">
          iPhone：用 Safari 打开本页 → 底部分享 →「添加到主屏幕」。安卓 Chrome：菜单 →「添加到主屏幕」。之后像 App 一样全屏使用。
        </p>
        <p className="muted">家里同一 Wi‑Fi 访问 http://NAS的IP:8907 即可。</p>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        当前：{me?.user.display_name} · {me?.user.role === "owner" ? "家长" : "成员"}
      </p>
      <button className="btn ghost" style={{ marginTop: 8, width: "100%" }} onClick={logout}>
        离开暖窝
      </button>
    </>
  );
}

function Home({ token, me, go }) {
  const [dash, setDash] = useState(null);
  useEffect(() => {
    api("/api/v1/dashboard", { token }).then(setDash);
  }, [token]);
  if (!dash) return <p>窝窝正在翻账本…</p>;
  return (
    <>
      <div className="topbar">
        <div>
          <h2 className="hello">
            <span className="hello-full">晚上好，{me?.user.display_name}。窝窝守着账本呢。</span>
            <span className="hello-short">你好，{me?.user.display_name}</span>
          </h2>
          <p className="sub">
            {dash.period.year} 年 {dash.period.month} 月 · 生活账与经营账已分开
          </p>
        </div>
        <button className="btn desktop-only" onClick={() => go("add")}>
          记一笔
        </button>
      </div>
      <div className="row stats">
        <div className="card coral">
          <div className="label">家庭支出</div>
          <div className="num">¥ {money(dash.family.expense)}</div>
        </div>
        <div className="card sage">
          <div className="label">家庭收入</div>
          <div className="num">¥ {money(dash.family.income)}</div>
        </div>
        <div className="card butter">
          <div className="label">家庭结余</div>
          <div className="num">¥ {money(dash.family.balance)}</div>
        </div>
        <div className="card">
          <div className="label">副业本月毛利</div>
          <div className="num">¥ {money(dash.business.profit)}</div>
          <p className="muted">不计入日常消费结构</p>
        </div>
      </div>
      <div className="row two">
        <div className="card">
          <h3>近半年家庭收支</h3>
          <div className="chart-box">
            <ResponsiveContainer>
              <AreaChart data={dash.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efe6dc" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="income" stroke="#81b29a" fill="#cfe8dc" name="收入" />
                <Area type="monotone" dataKey="expense" stroke="#e07a5f" fill="#f4dcd4" name="支出" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>家庭支出构成</h3>
          <div className="chart-box">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dash.by_category} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80}>
                  {dash.by_category.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="row two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>每位家人的个人开销</h3>
          {dash.members.map((m) => (
            <div className="member-pill" key={m.user_id}>
              <span className="member-pill-name">
                <UserAvatar user={m} size={24} />
                {m.display_name}
              </span>
              <strong>¥ {money(m.expense)}</strong>
            </div>
          ))}
          <p className="muted">公共账本开支不拆到个人头上，另记在家庭公共。</p>
        </div>
        <div className="card">
          <h3>预算温度</h3>
          {dash.budgets.length === 0 && <p className="muted">还没有预算，去「预算」页轻轻设一笔。</p>}
          {dash.budgets.map((b) => (
            <div key={b.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{b.category_name}</span>
                <span className="muted">
                  {money(b.spent)} / {money(b.amount)}
                </span>
              </div>
              <div className={`budget-bar ${b.ratio > 0.85 ? "warn" : ""}`}>
                <span style={{ width: `${Math.min(100, b.ratio * 100)}%` }} />
              </div>
            </div>
          ))}
          <h3>最近入账</h3>
          <div className="list">
            {dash.recent.map((t) => (
              <TxRow key={t.id} t={t} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function TxRow({ t }) {
  return (
    <div className="tx">
      <div className="icon-bubble" style={{ background: t.category_color + "33" }}>
        {t.category_icon}
      </div>
      <div className="tx-body">
        <div className="tx-title">
          {t.note || t.category_name} · {t.user_name}
        </div>
        <div className="muted tx-meta">
          {t.ledger_name} · {t.occurred_at.slice(0, 10)} · {t.source === "ai_wechat" ? "微信入账" : "手工"}
        </div>
      </div>
      <div className={`amount ${t.type}`}>
        {t.type === "expense" ? "-" : "+"}¥ {money(t.amount)}
      </div>
    </div>
  );
}

function Books({ token }) {
  const [ledgers, setLedgers] = useState([]);
  const [active, setActive] = useState(null);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/api/v1/ledgers", { token }).then((ls) => {
      setLedgers(ls);
      setActive(ls[0]?.id);
    });
  }, [token]);
  useEffect(() => {
    if (!active) return;
    api(`/api/v1/transactions?ledger_id=${active}&limit=80`, { token }).then(setRows);
  }, [token, active]);
  const current = ledgers.find((l) => l.id === active);
  return (
    <div className="books-page">
      <h2 className="hello">三本账，三种心情</h2>
      <p className="sub">个人日常、家庭公共、经营副业。点开账本看流水。</p>
      <div className="ledger-tabs">
        {ledgers.map((l) => (
          <button key={l.id} className={`chip ledger-chip ${active === l.id ? "on" : ""}`} onClick={() => setActive(l.id)}>
            <LedgerThumb ledger={l} size={28} />
            {l.name}
          </button>
        ))}
      </div>
      {current && (
        <>
          {current.cover_url && (
            <div className="ledger-cover-banner" style={{ backgroundImage: `url(${current.cover_url})` }} />
          )}
          <p className="muted">
            {current.description || (current.type === "business" ? "这笔不进入家庭消费饼图。" : "会计入家庭总览。")}
          </p>
        </>
      )}
      <div className="card books-list">
        {rows.map((t) => (
          <TxRow key={t.id} t={t} />
        ))}
        {rows.length === 0 && <p className="muted">这本账还空着，去记一笔吧。</p>}
      </div>
    </div>
  );
}

function Add({ token, show }) {
  const [ledgers, setLedgers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    note: "",
    ledger_id: "",
    account_id: "",
    category_id: "",
  });
  useEffect(() => {
    Promise.all([
      api("/api/v1/ledgers", { token }),
      api("/api/v1/accounts", { token }),
      api("/api/v1/categories", { token }),
    ]).then(([l, a, c]) => {
      setLedgers(l);
      setAccounts(a);
      setCats(c);
      setForm((f) => ({
        ...f,
        ledger_id: l[0]?.id || "",
        account_id: a[0]?.id || "",
      }));
    });
  }, [token]);
  const ledger = ledgers.find((l) => String(l.id) === String(form.ledger_id));
  const filteredCats = cats.filter(
    (c) => c.kind === form.type && (!ledger || c.ledger_type === ledger.type)
  );
  async function submit(e) {
    e.preventDefault();
    try {
      await api("/api/v1/transactions", {
        token,
        method: "POST",
        body: {
          ...form,
          ledger_id: Number(form.ledger_id),
          account_id: Number(form.account_id),
          category_id: Number(form.category_id || filteredCats[0]?.id),
          amount: Number(form.amount),
        },
      });
      show("窝窝记下了 ✓");
      setForm((f) => ({ ...f, amount: "", note: "" }));
    } catch (err) {
      show(err.message);
    }
  }
  return (
    <>
      <h2 className="hello">轻轻记一笔</h2>
      <form className="card form-grid add-form" onSubmit={submit} style={{ marginTop: 16 }}>
        <div className="chips" style={{ gridColumn: "1 / -1" }}>
          <button type="button" className={`chip ${form.type === "expense" ? "on" : ""}`} onClick={() => setForm({ ...form, type: "expense", category_id: "" })}>
            支出
          </button>
          <button type="button" className={`chip ${form.type === "income" ? "on" : ""}`} onClick={() => setForm({ ...form, type: "income", category_id: "" })}>
            收入
          </button>
        </div>
        <label className="amount-field" style={{ gridColumn: "1 / -1" }}>
          金额
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.]?[0-9]*"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })}
            placeholder="0.00"
            required
          />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          账本
          <div className="ledger-pick">
            {ledgers.map((l) => (
              <button
                type="button"
                key={l.id}
                className={`chip ledger-chip ${String(form.ledger_id) === String(l.id) ? "on" : ""}`}
                onClick={() => setForm({ ...form, ledger_id: l.id, category_id: "" })}
              >
                <LedgerThumb ledger={l} size={28} />
                {l.name}
              </button>
            ))}
          </div>
        </label>
        <label>
          账户
          <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="cat-block" style={{ gridColumn: "1 / -1" }}>
          <span className="cat-label">分类</span>
          <div className="chips">
            {filteredCats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip ${String(form.category_id || filteredCats[0]?.id) === String(c.id) ? "on" : ""}`}
                onClick={() => setForm({ ...form, category_id: c.id })}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>
        <label style={{ gridColumn: "1 / -1" }}>
          备注
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="午饭 / 客户尾款 / 水电…" />
        </label>
        <button className="btn add-submit" style={{ gridColumn: "1 / -1" }}>
          放进暖窝
        </button>
      </form>
    </>
  );
}

function Biz({ token }) {
  const [dash, setDash] = useState(null);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/api/v1/dashboard", { token }).then(setDash);
    api("/api/v1/transactions?ledger_type=business", { token }).then(setRows);
  }, [token]);
  if (!dash) return null;
  return (
    <>
      <h2 className="hello">经营账本 · 副业小摊</h2>
      <p className="sub">进账、进货、订阅费都在这里。生活饼图不会被「进货 2000」带跑。</p>
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
        {rows.map((t) => (
          <TxRow key={t.id} t={t} />
        ))}
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
const ACCOUNT_KINDS = [
  ["cash", "现金"],
  ["bank", "银行卡"],
  ["ewallet", "微信/支付宝"],
  ["credit", "信用卡"],
  ["business", "经营收款"],
];
const ROLE_LABEL = { owner: "家长", member: "成员", viewer: "只读" };

const LEDGER_TYPES = [
  ["personal", "个人账本"],
  ["family", "家庭公共"],
  ["business", "经营副业"],
];
const LEDGER_ICONS = ["📒", "🏠", "👤", "💼", "🎨", "🍜", "🚗", "🎁", "💰", "🐾", "📚", "🌿"];

function SettingsPanel({ token, me, show, onMeUpdate }) {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({
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
  const [editMember, setEditMember] = useState(null);
  const [resetPwd, setResetPwd] = useState({ id: null, password: "" });
  const [ledgers, setLedgers] = useState([]);
  const [ledgerForm, setLedgerForm] = useState({
    name: "",
    type: "personal",
    icon: "📒",
    description: "",
    include_in_family: true,
    owner_user_id: "",
  });
  const [editLedger, setEditLedger] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (me?.user) {
      setProfile({
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
        icon: "📒",
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

  const isOwner = me?.user.role === "owner";

  return (
    <div className="accounts-page">
      <h2 className="hello">设置</h2>
      <p className="sub">个人资料与头像、账本配置、家庭成员与资金账户都在这里。</p>
      <div className="seg-tabs">
        {[
          ["profile", "我的资料"],
          ["ledgers", "账本配置"],
          ["members", "家庭成员"],
          ["wallets", "资金账户"],
        ].map(([id, label]) => (
          <button key={id} className={`seg ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
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
              <input value={me?.user.username || ""} disabled />
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
                      className={`chip ${ledgerForm.icon === ic ? "on" : ""}`}
                      onClick={() => setLedgerForm({ ...ledgerForm, icon: ic })}
                    >
                      {ic}
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
                    {ACCOUNT_KINDS.find(([k]) => k === w.kind)?.[1] || w.kind} · 期初 ¥ {money(w.opening_balance)}
                  </div>
                </div>
                {isOwner && (
                  <button type="button" className="btn ghost btn-sm" onClick={() => removeWallet(w.id)}>
                    删除
                  </button>
                )}
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
                  className={`chip ${editLedger.icon === ic ? "on" : ""}`}
                  onClick={() => setEditLedger({ ...editLedger, icon: ic })}
                >
                  {ic}
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
