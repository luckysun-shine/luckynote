# lucky账本 · LuckyNote

在 NAS Docker 上运行的家庭记账：每人一本日常账、一本家庭公共账、一本经营/副业账；可用 OpenClaw 微信通道语音入账。

完整产品与技术方案见 [docs/DESIGN.md](docs/DESIGN.md)。

## 快速开始

```bash
docker compose up -d --build
# 电脑浏览器：http://localhost:8907
# 手机：同一 Wi-Fi 下打开 http://NAS的局域网IP:8907
```

## NAS 更新与数据保留

账本数据保存在 Docker **数据卷** `luckynote-data` 中，挂载到容器内的 `/data`，与程序镜像分离。因此 **正常更新不会清空已有数据**。

### 数据卷里有什么

| 路径（卷内） | 内容 |
| --- | --- |
| `luckynote.db` | 账本、流水、用户、预算、Token 等 |
| `uploads/` | 用户头像、账本封面图 |
| `backups/` | 手动 / 定时备份 zip |
| `backup-config.json` | 定时备份设置 |

### 推荐更新步骤（保留数据）

在 NAS 上进入项目目录后执行：

```bash
git pull
docker compose up -d --build
```

只会替换容器里的程序代码，**不会删除** `luckynote-data` 卷。更新后账号、流水、头像、备份文件都会保留。

启动时会自动执行数据库结构升级（只增加新字段，不覆盖旧数据）。只有数据库为空时才会初始化演示账号。

### 切勿执行（会丢数据）

| 操作 | 后果 |
| --- | --- |
| `docker compose down -v` | **删除数据卷**，账本全部丢失 |
| 在 Docker 里手动删除 `luckynote-data` 卷 | 同上 |
| 修改 `docker-compose.yml` 换成新的空数据卷 | 看起来像「全新安装」 |
| 应用内「数据备份 → 恢复」 | 用备份 **覆盖** 当前数据（有意为之） |

**不要用 `-v` 参数**，除非确认要清空重来。

### 更新前建议

1. 家长登录 → **更多 → 数据备份 → 立即备份**（大版本更新前做一次更稳妥）。
2. 或开启 **定时备份**，并设置合理的保留份数。
3. 查看数据卷位置（排障用）：
   ```bash
   docker volume inspect luckynote-data
   ```

### 更新后

- 浏览器强刷或重新打开页面即可；若改了 PWA 图标，需删除手机主屏幕旧图标后重新「添加到主屏幕」。
- 若页面异常，可尝试：`docker compose restart luckynote`（**不要**加 `-v`）。

## 手机使用

这是日常记账的主入口。建议：

1. 手机连家里 Wi-Fi，浏览器访问 `http://192.168.x.x:8907`（把 IP 换成 NAS 地址）。
2. **iPhone**：Safari → 底部分享 →「添加到主屏幕」，之后从桌面图标全屏打开。
3. **安卓**：Chrome 菜单 →「添加到主屏幕」或「安装应用」。
4. 底部中间珊瑚圆钮是「记一笔」；总览、账本、经营、更多（预算 / 家人 / 微信）都在底栏。

输入框使用 16px 字号，避免 iOS 聚焦时整页放大。若要从外网访问，请走 Tailscale / 反向代理，不要把 8907 直接暴露到公网。

演示账号（请上线后立刻改密）：

| 用户 | 密码 | 角色 |
| --- | --- | --- |
| `lin` | `luckynote` | 家长 小林 |
| `yuan` | `luckynote` | 成员 小圆 |

本地开发：

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
PYTHONPATH=. uvicorn backend.app.main:app --reload --port 8907

cd frontend && npm install && npm run dev
```

## OpenClaw（微信语音记账）

1. 用家长账号打开「微信 / AI」，生成 Token。
2. 将 `openclaw/luckynote` 拷到 OpenClaw 的 skills 目录。
3. 配置环境变量 `LUCKYNOTE_BASE_URL`、`LUCKYNOTE_API_TOKEN`。
4. 对微信机器人说：「中午吃饭花了 35，记我账上」。

微信备注名需与成员资料里的「微信别名」一致。

## 数据备份

家长登录 → **更多 → 数据备份**（或桌面侧栏 **数据备份**）。更新 NAS 前建议先备份，详见上文 **NAS 更新与数据保留**。

- **立即备份**：生成 zip（含 `luckynote.db`），保存在 NAS 数据卷 `backups/` 目录
- **定时备份**：可设每天/每周自动备份，并配置保留份数
- **下载 / 删除 / 恢复**：恢复后建议在 NAS 执行 `docker compose restart luckynote`

备份文件路径（Docker 卷内）：`/data/backups/luckynote_YYYYMMDD_HHMMSS.zip`

## 三本账

- **个人**：各自收支，汇总进家庭总览。
- **家庭**：水电房租、共同采购。
- **经营**：副业进账与成本，**不进入**日常消费饼图，单独看毛利。
