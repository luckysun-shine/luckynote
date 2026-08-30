# LuckyNote 暖窝账本

在 NAS Docker 上运行的家庭记账：每人一本日常账、一本家庭公共账、一本经营/副业账；可用 OpenClaw 微信通道语音入账。

完整产品与技术方案见 [docs/DESIGN.md](docs/DESIGN.md)。

## 快速开始

```bash
docker compose up -d --build
# 电脑浏览器：http://localhost:8080
# 手机：同一 Wi-Fi 下打开 http://NAS的局域网IP:8080
```

## 手机使用

这是日常记账的主入口。建议：

1. 手机连家里 Wi-Fi，浏览器访问 `http://192.168.x.x:8080`（把 IP 换成 NAS 地址）。
2. **iPhone**：Safari → 底部分享 →「添加到主屏幕」，之后从桌面图标全屏打开。
3. **安卓**：Chrome 菜单 →「添加到主屏幕」或「安装应用」。
4. 底部中间珊瑚圆钮是「记一笔」；总览、账本、经营、更多（预算 / 家人 / 微信）都在底栏。

输入框使用 16px 字号，避免 iOS 聚焦时整页放大。若要从外网访问，请走 Tailscale / 反向代理，不要把 8080 直接暴露到公网。

演示账号（请上线后立刻改密）：

| 用户 | 密码 | 角色 |
| --- | --- | --- |
| `lin` | `luckynote` | 家长 小林 |
| `yuan` | `luckynote` | 成员 小圆 |

本地开发：

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
PYTHONPATH=. uvicorn backend.app.main:app --reload --port 8080

cd frontend && npm install && npm run dev
```

## OpenClaw（微信语音记账）

1. 用家长账号打开「微信 / AI」，生成 Token。
2. 将 `openclaw/luckynote` 拷到 OpenClaw 的 skills 目录。
3. 配置环境变量 `LUCKYNOTE_BASE_URL`、`LUCKYNOTE_API_TOKEN`。
4. 对微信机器人说：「中午吃饭花了 35，记我账上」。

微信备注名需与成员资料里的「微信别名」一致。

## 三本账

- **个人**：各自收支，汇总进家庭总览。
- **家庭**：水电房租、共同采购。
- **经营**：副业进账与成本，**不进入**日常消费饼图，单独看毛利。
