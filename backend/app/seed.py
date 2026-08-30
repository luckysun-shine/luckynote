from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .auth import hash_password
from .models import (
    Account,
    Budget,
    Category,
    Household,
    Ledger,
    Transaction,
    User,
)

LIFE_EXPENSE = [
    ("餐饮", "🍜", "#E07A5F", "吃饭 午餐 晚饭 外卖 咖啡 早餐 买菜 零食 奶茶"),
    ("交通", "🚌", "#81B29A", "地铁 公交 打车 滴滴 油费 停车 高铁"),
    ("居住", "🏠", "#F2CC8F", "房租 房贷 水电 物业 燃气 网费"),
    ("日用", "🧴", "#3D405B", "日用品 超市 纸巾 洗衣液"),
    ("购物", "🛍️", "#D4A373", "衣服 数码 淘宝"),
    ("娱乐", "🎮", "#C77DFF", "电影 游戏 会员"),
    ("医疗", "💊", "#81B29A", "看病 药 医院"),
    ("教育", "📚", "#E07A5F", "课 学费 书"),
    ("人情", "🎁", "#E07A5F", "红包 礼物"),
    ("其他支出", "✨", "#ADB5BD", "杂项"),
]

LIFE_INCOME = [
    ("工资", "💼", "#81B29A", "薪水 工资"),
    ("奖金", "🎉", "#F2CC8F", "年终 奖金"),
    ("报销", "📎", "#3D405B", "报销"),
    ("其他收入", "🍀", "#81B29A", "转入"),
]

BIZ_EXPENSE = [
    ("进货成本", "📦", "#E07A5F", "进货 材料 货"),
    ("平台扣点", "🧾", "#D4A373", "扣点 手续费"),
    ("工具订阅", "🛠️", "#3D405B", "软件 会员 域名"),
    ("其他成本", "✨", "#ADB5BD", "成本"),
]

BIZ_INCOME = [
    ("项目款", "🎨", "#81B29A", "客户 尾款 定金 稿费 设计"),
    ("带货/销售", "🛒", "#E07A5F", "卖了 货款"),
    ("其他经营收入", "🍀", "#F2CC8F", "经营"),
]


def _cats(db: Session, hid: int, ledger_type: str, kind: str, rows: list[tuple]):
    out = []
    for name, icon, color, aliases in rows:
        c = Category(
            household_id=hid,
            ledger_type=ledger_type,
            kind=kind,
            name=name,
            icon=icon,
            color=color,
            aliases=aliases,
        )
        db.add(c)
        out.append(c)
    db.flush()
    return out


def match_category(categories: list[Category], hint: str | None, tx_type: str) -> Category:
    pool = [c for c in categories if c.kind == tx_type]
    if not pool:
        pool = categories
    if hint:
        h = hint.lower()
        for c in pool:
            bag = (c.name + " " + (c.aliases or "")).lower()
            for token in bag.split():
                if token and token in h:
                    return c
            if c.name in (hint or ""):
                return c
    fallback = next((c for c in pool if "其他" in c.name), pool[0])
    return fallback


def seed_if_empty(db: Session) -> None:
    if db.query(User).first():
        return

    house = Household(name="暖窝一家")
    db.add(house)
    db.flush()

    lin = User(
        household_id=house.id,
        username="lin",
        password_hash=hash_password("luckynote"),
        display_name="小林",
        role="owner",
        avatar_color="#E07A5F",
        wechat_alias="小林",
    )
    yuan = User(
        household_id=house.id,
        username="yuan",
        password_hash=hash_password("luckynote"),
        display_name="小圆",
        role="member",
        avatar_color="#81B29A",
        wechat_alias="小圆",
    )
    db.add_all([lin, yuan])
    db.flush()

    ledgers = [
        Ledger(
            household_id=house.id,
            owner_user_id=lin.id,
            type="personal",
            name="小林的日常",
            include_in_family=True,
            icon="🦊",
        ),
        Ledger(
            household_id=house.id,
            owner_user_id=yuan.id,
            type="personal",
            name="小圆的日常",
            include_in_family=True,
            icon="🐰",
        ),
        Ledger(
            household_id=house.id,
            owner_user_id=None,
            type="family",
            name="家庭公共",
            include_in_family=True,
            icon="🏡",
        ),
        Ledger(
            household_id=house.id,
            owner_user_id=lin.id,
            type="business",
            name="小林的设计副业",
            include_in_family=False,
            icon="🎨",
        ),
    ]
    db.add_all(ledgers)
    db.flush()
    lin_book, yuan_book, family_book, biz_book = ledgers

    accounts = [
        Account(household_id=house.id, owner_user_id=lin.id, name="小林微信", kind="ewallet", opening_balance=3200),
        Account(household_id=house.id, owner_user_id=lin.id, name="小林银行卡", kind="bank", opening_balance=18600),
        Account(household_id=house.id, owner_user_id=yuan.id, name="小圆支付宝", kind="ewallet", opening_balance=2100),
        Account(household_id=house.id, owner_user_id=None, name="家庭备用金", kind="cash", opening_balance=1500),
        Account(
            household_id=house.id,
            owner_user_id=lin.id,
            ledger_id=biz_book.id,
            name="经营收款码",
            kind="business",
            opening_balance=0,
        ),
    ]
    db.add_all(accounts)
    db.flush()

    life_exp = _cats(db, house.id, "personal", "expense", LIFE_EXPENSE)
    life_inc = _cats(db, house.id, "personal", "income", LIFE_INCOME)
    for row in LIFE_EXPENSE:
        db.add(
            Category(
                household_id=house.id,
                ledger_type="family",
                kind="expense",
                name=row[0],
                icon=row[1],
                color=row[2],
                aliases=row[3],
            )
        )
    for row in LIFE_INCOME:
        db.add(
            Category(
                household_id=house.id,
                ledger_type="family",
                kind="income",
                name=row[0],
                icon=row[1],
                color=row[2],
                aliases=row[3],
            )
        )
    biz_exp = _cats(db, house.id, "business", "expense", BIZ_EXPENSE)
    biz_inc = _cats(db, house.id, "business", "income", BIZ_INCOME)
    db.flush()

    now = datetime.now()
    month_start = now.replace(day=1, hour=10, minute=0, second=0, microsecond=0)

    def tx(**kwargs):
        db.add(Transaction(household_id=house.id, source="seed", **kwargs))

    food = next(c for c in life_exp if c.name == "餐饮")
    transit = next(c for c in life_exp if c.name == "交通")
    shop = next(c for c in life_exp if c.name == "购物")
    home = next(c for c in life_exp if c.name == "居住")
    wage = next(c for c in life_inc if c.name == "工资")
    project = next(c for c in biz_inc if c.name == "项目款")
    cost = next(c for c in biz_exp if c.name == "进货成本")
    tools = next(c for c in biz_exp if c.name == "工具订阅")
    fam_home = (
        db.query(Category)
        .filter_by(household_id=house.id, ledger_type="family", name="居住")
        .one()
    )
    fam_food = (
        db.query(Category)
        .filter_by(household_id=house.id, ledger_type="family", name="餐饮")
        .one()
    )

    tx(
        ledger_id=lin_book.id,
        user_id=lin.id,
        account_id=accounts[1].id,
        category_id=wage.id,
        type="income",
        amount=18000,
        occurred_at=month_start + timedelta(days=4),
        note="月薪",
    )
    tx(
        ledger_id=yuan_book.id,
        user_id=yuan.id,
        account_id=accounts[2].id,
        category_id=wage.id,
        type="income",
        amount=12000,
        occurred_at=month_start + timedelta(days=5),
        note="月薪",
    )
    samples = [
        (lin_book, lin, accounts[0], food, "expense", 42, 2, "公司楼下拉面"),
        (lin_book, lin, accounts[0], food, "expense", 28, 6, "手冲咖啡"),
        (lin_book, lin, accounts[0], transit, "expense", 6.5, 3, "地铁"),
        (yuan_book, yuan, accounts[2], food, "expense", 86, 7, "买菜"),
        (yuan_book, yuan, accounts[2], shop, "expense", 159, 11, "厨房置物架"),
        (yuan_book, yuan, accounts[2], food, "expense", 36, 14, "晚餐外卖"),
        (family_book, lin, accounts[3], fam_home, "expense", 220, 8, "水电燃气"),
        (family_book, yuan, accounts[3], fam_food, "expense", 132, 12, "周末超市"),
        (biz_book, lin, accounts[4], project, "income", 2800, 9, "品牌海报尾款"),
        (biz_book, lin, accounts[4], cost, "expense", 260, 10, "印刷耗材"),
        (biz_book, lin, accounts[4], tools, "expense", 68, 1, "设计软件订阅"),
        (biz_book, lin, accounts[4], project, "income", 960, 16, "小程序图标"),
    ]
    for ledger, user, acc, cat, typ, amount, day, note in samples:
        day = min(day, max(now.day, 1))
        tx(
            ledger_id=ledger.id,
            user_id=user.id,
            account_id=acc.id,
            category_id=cat.id,
            type=typ,
            amount=amount,
            occurred_at=month_start + timedelta(days=day - 1, hours=day % 5),
            note=note,
        )

    # previous month for trend
    prev = (month_start - timedelta(days=1)).replace(day=1)
    tx(
        ledger_id=lin_book.id,
        user_id=lin.id,
        account_id=accounts[0].id,
        category_id=food.id,
        type="expense",
        amount=980,
        occurred_at=prev + timedelta(days=12),
        note="上月餐饮合计示意",
    )

    db.add(
        Budget(
            household_id=house.id,
            ledger_id=None,
            category_id=None,
            year=now.year,
            month=now.month,
            amount=8000,
        )
    )
    db.add(
        Budget(
            household_id=house.id,
            ledger_id=None,
            category_id=food.id,
            year=now.year,
            month=now.month,
            amount=2500,
        )
    )
    db.commit()
