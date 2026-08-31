---
name: luckynote
description: 把微信文字或语音转写后的记账话术写入 LuckyNote 暖窝账本（个人/家庭/经营三本账）。用户提到吃饭花了、记一笔、副业收款、家庭水电时使用。
---

# LuckyNote 暖窝记账

当用户要用自然语言记账时，把话语整理后调用家庭 NAS 上的 LuckyNote。

## 环境变量

- `LUCKYNOTE_BASE_URL`：例如 `http://luckynote:8907` 或 NAS 局域网地址
- `LUCKYNOTE_API_TOKEN`：家长在暖窝账本「微信 / AI」页生成的 Token

## 流程

1. 若是语音，先使用已转写的文本（`{{Transcript}}` 或消息正文）。
2. 识别说话人：用微信昵称/备注作为 `wechat_alias`（需与账本成员资料一致）。
3. 优先调用自然语言接口：

```bash
curl -sS -X POST "$LUCKYNOTE_BASE_URL/api/v1/ai/ingest" \
  -H "X-Api-Token: $LUCKYNOTE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"$TEXT\",\"wechat_alias\":\"$ALIAS\"}"
```

4. 把返回 JSON 里的 `reply` 原样发回微信。
5. 若用户说「先别记，只是问问」，加 `"dry_run": true`。

## 意图映射

| 用户说法 | 期望 |
| --- | --- |
| 午餐 35 / 吃饭花了 35 | 个人账本，支出 |
| 记到家庭：水电 220 | 家庭账本 |
| 副业收了客户 2000 / 进货 480 | 经营账本 |
| 咖啡 18，地铁 4 | 两笔 |

不确定金额时不要调用写入接口，先追问。

## 结构化备选

当已经解析出字段时，可 POST `/api/v1/ai/transactions`：

```json
{
  "amount": 35,
  "type": "expense",
  "ledger": "personal",
  "category": "餐饮",
  "note": "午餐",
  "wechat_alias": "小林"
}
```

`ledger` 只能是 `personal` | `family` | `business`。

## 完成后

确认 `ok: true` 且 `reply` 已发送。若 HTTP 非 2xx，把错误摘要告诉用户，不要编造已入账。
