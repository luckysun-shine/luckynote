# LuckyNote 暖窝账本

在 NAS Docker 上运行的家庭记账：每人一本日常账、一本家庭公共账、一本经营/副业账；可用 OpenClaw 微信通道语音入账。

完整产品与技术方案见 [docs/DESIGN.md](docs/DESIGN.md)。

## 快速开始

```bash
docker compose up -d --build
# 浏览器打开 http://localhost:8080
```

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
