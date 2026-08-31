from datetime import datetime

from backend.app.parser import parse_bookkeeping


def test_lunch():
    r = parse_bookkeeping("中午吃饭花了35，记我账上")
    assert len(r.items) == 1
    assert r.items[0].amount == 35
    assert r.items[0].tx_type == "expense"
    assert r.items[0].ledger_hint == "personal"


def test_family_utility():
    r = parse_bookkeeping("记到家庭：水电 220")
    assert r.items[0].amount == 220
    assert r.items[0].ledger_hint == "family"


def test_business_income():
    r = parse_bookkeeping("副业收了客户尾款 2000")
    assert r.items[0].amount == 2000
    assert r.items[0].tx_type == "income"
    assert r.items[0].ledger_hint == "business"


def test_multi():
    r = parse_bookkeeping("咖啡 18，地铁 4")
    assert [i.amount for i in r.items] == [18, 4]


def test_cn_number():
    r = parse_bookkeeping("买菜花了八十六元")
    assert r.items[0].amount == 86


def test_yesterday():
    now = datetime(2026, 8, 30, 18, 0, 0)
    r = parse_bookkeeping("昨天买菜花了 86", now=now)
    assert r.items[0].occurred_at.day == 29
