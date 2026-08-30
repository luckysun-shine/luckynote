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
  ["family", "家人"],
  ["ai", "微信 / AI"],
];

const TABS = [
  { id: "home", label: "总览", icon: "🏡" },
  { id: "books", label: "账本", icon: "📒" },
  { id: "add", label: "记账", icon: "✎", fab: true },
  { id: "biz", label: "经营", icon: "🎨" },
  { id: "more", label: "更多", icon: "✦" },
];

const MORE_PAGES = ["more", "budget", "family", "ai"];

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
          <span>{me?.user.display_name} · {me?.household?.name}</span>
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
            <div>
              <span className="dot" style={{ background: me.user.avatar_color }} />
              {me.user.display_name} · {me.household?.name}
            </div>
            <p className="muted">角色 {me.user.role === "owner" ? "家长" : "成员"}</p>
            <button className="btn ghost" style={{ marginTop: 10, width: "100%" }} onClick={logout}>
              离开暖窝
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        {page === "home" && <Home token={token} me={me} go={setPage} />}
        {page === "books" && <Books token={token} />}
        {page === "add" && <Add token={token} show={show} />}
        {page === "biz" && <Biz token={token} />}
        {page === "budget" && <Budget token={token} show={show} />}
        {page === "family" && <Family token={token} me={me} show={show} />}
        {page === "ai" && <AiPanel token={token} show={show} me={me} />}
        {page === "more" && <More go={setPage} logout={logout} me={me} />}
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
    ["family", "家人", "邀请成员、绑定微信别名"],
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
        <p className="muted">家里同一 Wi‑Fi 访问 http://NAS的IP:8080 即可。</p>
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
              <span>
                <span className="dot" style={{ background: m.avatar_color, display: "inline-block", width: 10, height: 10, borderRadius: 99, marginRight: 8 }} />
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
      <div>
        <div>
          {t.note || t.category_name} · {t.user_name}
        </div>
        <div className="muted">
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
    <>
      <h2 className="hello">三本账，三种心情</h2>
      <p className="sub">个人日常、家庭公共、经营副业。点开账本看流水。</p>
      <div className="chips chips-scroll" style={{ margin: "16px 0" }}>
        {ledgers.map((l) => (
          <button key={l.id} className={`chip ${active === l.id ? "on" : ""}`} onClick={() => setActive(l.id)}>
            {l.icon} {l.name}
          </button>
        ))}
      </div>
      {current && (
        <p className="muted">
          {current.type === "business" ? "这笔不进入家庭消费饼图。" : "会计入家庭总览。"}
        </p>
      )}
      <div className="card" style={{ marginTop: 12 }}>
        {rows.map((t) => (
          <TxRow key={t.id} t={t} />
        ))}
        {rows.length === 0 && <p className="muted">这本账还空着，去记一笔吧。</p>}
      </div>
    </>
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
        <label>
          账本
          <select value={form.ledger_id} onChange={(e) => setForm({ ...form, ledger_id: e.target.value, category_id: "" })}>
            {ledgers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.icon} {l.name}
              </option>
            ))}
          </select>
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

function Family({ token, me, show }) {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", display_name: "", wechat_alias: "" });
  function load() {
    api("/api/v1/members", { token }).then(setMembers);
  }
  useEffect(load, [token]);
  async function add(e) {
    e.preventDefault();
    try {
      await api("/api/v1/members", { token, method: "POST", body: { ...form, role: "member" } });
      show("新家人进窝了");
      setForm({ username: "", password: "", display_name: "", wechat_alias: "" });
      load();
    } catch (err) {
      show(err.message);
    }
  }
  return (
    <>
      <h2 className="hello">暖窝里的人</h2>
      <div className="card" style={{ marginTop: 16 }}>
        {members.map((m) => (
          <div className="member-pill" key={m.id}>
            <span>
              <span className="dot" style={{ background: m.avatar_color, display: "inline-block", width: 10, height: 10, borderRadius: 99, marginRight: 8 }} />
              {m.display_name} @{m.username}
            </span>
            <span className="muted">微信别名：{m.wechat_alias || "未绑定"} · {m.role}</span>
          </div>
        ))}
      </div>
      {me?.user.role === "owner" && (
        <form className="card form-grid" onSubmit={add} style={{ marginTop: 16 }}>
          <h3 style={{ gridColumn: "1 / -1" }}>邀请一位家人</h3>
          <label>
            登录名
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>
          <label>
            初始密码
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          <label>
            昵称
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
          </label>
          <label>
            微信备注/昵称
            <input value={form.wechat_alias} onChange={(e) => setForm({ ...form, wechat_alias: e.target.value })} />
          </label>
          <button className="btn" style={{ gridColumn: "1 / -1" }}>
            加入暖窝
          </button>
        </form>
      )}
    </>
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
