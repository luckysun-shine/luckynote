"""Chinese natural-language bookkeeping parser (rule-based)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta

CN_DIGITS = {
    "零": 0,
    "〇": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
}

INCOME_HINTS = (
    "收入",
    "进账",
    "到账",
    "收了",
    "收到",
    "赚了",
    "工资",
    "奖金",
    "报销",
    "客户款",
    "尾款",
    "货款",
    "卖了",
)

EXPENSE_HINTS = (
    "花了",
    "支出",
    "买了",
    "付了",
    "缴费",
    "交了",
    "开销",
    "消费",
    "进货",
)

BUSINESS_HINTS = (
    "副业",
    "经营",
    "生意",
    "客户",
    "进货",
    "扣点",
    "平台费",
    "项目款",
    "稿费",
    "外包",
)

FAMILY_HINTS = ("家庭", "家里", "公共", "房贷", "房租", "水电", "物业")


@dataclass
class ParsedItem:
    amount: float
    note: str
    tx_type: str
    ledger_hint: str | None = None
    category_hint: str | None = None
    occurred_at: datetime | None = None


@dataclass
class ParseResult:
    items: list[ParsedItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _cn_int(text: str) -> float | None:
    if not text:
        return None
    if text.isdigit():
        return float(text)
    total = 0
    current = 0
    for ch in text:
        if ch in CN_DIGITS:
            current = CN_DIGITS[ch]
        elif ch == "十":
            total += (current or 1) * 10
            current = 0
        elif ch == "百":
            total += (current or 1) * 100
            current = 0
        elif ch == "千":
            total += (current or 1) * 1000
            current = 0
        elif ch == "万":
            total = (total + current) * 10000
            current = 0
        else:
            return None
    return float(total + current)


def _extract_amounts(text: str) -> list[tuple[str, float]]:
    found: list[tuple[str, float]] = []
    pattern = re.compile(
        r"(?:(?:人民币|RMB|¥)?\s*)(\d+(?:\.\d{1,2})?|[一二两三四五六七八九十百千万零〇]+)(?:\s*)(?:元|块|块钱|块整|块人民币)?"
    )
    for m in pattern.finditer(text):
        raw = m.group(1)
        if re.match(r"^\d", raw):
            amount = float(raw)
        else:
            parsed = _cn_int(raw)
            if parsed is None:
                continue
            amount = parsed
        if amount <= 0:
            continue
        found.append((m.group(0), amount))
    return found


def _relative_time(text: str, now: datetime) -> datetime:
    if "前天" in text:
        base = now - timedelta(days=2)
    elif "昨天" in text or "昨日" in text:
        base = now - timedelta(days=1)
    else:
        base = now
    hm = re.search(r"(\d{1,2})点(\d{1,2})?分?", text)
    if hm:
        hour = int(hm.group(1))
        minute = int(hm.group(2) or 0)
        if "下午" in text or "晚上" in text:
            if hour < 12:
                hour += 12
        return base.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base


def _ledger_hint(text: str) -> str | None:
    if any(k in text for k in BUSINESS_HINTS):
        return "business"
    if any(k in text for k in FAMILY_HINTS):
        return "family"
    if "我的账" in text or "个人" in text or "记我" in text:
        return "personal"
    return None


def _tx_type(text: str, ledger: str | None) -> str:
    if any(k in text for k in INCOME_HINTS) and not any(
        k in text for k in ("进货", "花了进货")
    ):
        return "income"
    if any(k in text for k in EXPENSE_HINTS):
        return "expense"
    if ledger == "business" and any(k in text for k in ("收", "款", "赚")):
        return "income"
    return "expense"


def _split_clauses(text: str) -> list[str]:
    parts = re.split(r"[，,、；;和还有]+", text)
    return [p.strip() for p in parts if p.strip()]


def parse_bookkeeping(text: str, now: datetime | None = None) -> ParseResult:
    now = now or datetime.now()
    text = text.strip()
    result = ParseResult()
    if not text:
        result.warnings.append("空文本")
        return result

    occurred = _relative_time(text, now)
    global_ledger = _ledger_hint(text)
    global_type = _tx_type(text, global_ledger)

    clauses = _split_clauses(text)
    items: list[ParsedItem] = []
    for clause in clauses:
        amounts = _extract_amounts(clause)
        if not amounts:
            continue
        ledger = _ledger_hint(clause) or global_ledger
        tx_type = _tx_type(clause, ledger) if _tx_type(clause, ledger) else global_type
        if not any(k in clause for k in INCOME_HINTS + EXPENSE_HINTS):
            tx_type = global_type
        note = clause
        for raw, _ in amounts:
            note = note.replace(raw, "")
        note = re.sub(r"(记到|记入)?(家庭|个人|经营|副业)?(账本|账上|账)?", "", note)
        note = re.sub(r"(花了|付了|交了|收了|收到|收入)", "", note)
        note = re.sub(r"\s+", " ", note).strip(" ：:。.")
        for _, amount in amounts:
            items.append(
                ParsedItem(
                    amount=amount,
                    note=note or "未备注",
                    tx_type=tx_type,
                    ledger_hint=ledger,
                    category_hint=note or None,
                    occurred_at=occurred,
                )
            )

    if not items:
        amounts = _extract_amounts(text)
        if len(amounts) == 1:
            items.append(
                ParsedItem(
                    amount=amounts[0][1],
                    note=text,
                    tx_type=global_type,
                    ledger_hint=global_ledger,
                    category_hint=text,
                    occurred_at=occurred,
                )
            )
        else:
            result.warnings.append("未能识别金额")

    result.items = items
    return result
