from __future__ import annotations

import json
import math
import secrets
from datetime import datetime, timedelta
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from .auth import (
    create_access_token,
    decode_token,
    hash_api_token,
    hash_password,
    verify_password,
)
from .database import Base, dispose_engine, engine, get_db
from .models import (
    Account,
    AiLog,
    ApiToken,
    Budget,
    Category,
    Ledger,
    Transaction,
    User,
)
from .backup import (
    backup_path,
    create_backup,
    delete_backup,
    list_backups,
    load_config,
    restore_backup,
    save_config,
)
from .migrate import ensure_schema, ensure_upload_dirs, media_url
from .uploads import delete_media, media_file_path, save_ledger_cover, save_user_avatar
from .scheduler import refresh_backup_schedule, start_backup_scheduler, stop_backup_scheduler
from .parser import parse_bookkeeping
from .seed import match_category, seed_if_empty

app = FastAPI(title="LuckyNote", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    ensure_upload_dirs()
    db = next(get_db())
    try:
        seed_if_empty(db)
    finally:
        db.close()
    start_backup_scheduler()


@app.on_event("shutdown")
def shutdown():
    stop_backup_scheduler()


def current_user(
    authorization: Annotated[str | None, Header()] = None,
    x_api_token: Annotated[str | None, Header(alias="X-Api-Token")] = None,
    db: Session = Depends(get_db),
) -> User:
    if x_api_token:
        hashed = hash_api_token(x_api_token.strip())
        row = db.query(ApiToken).filter(ApiToken.token_hash == hashed).one_or_none()
        if not row:
            raise HTTPException(401, "无效的 API Token")
        row.last_used_at = datetime.utcnow()
        user = db.get(User, row.user_id)
        if not user:
            raise HTTPException(401, "Token 对应用户不存在")
        db.commit()
        return user
    if authorization and authorization.lower().startswith("bearer "):
        uid = decode_token(authorization.split(" ", 1)[1])
        if uid:
            user = db.get(User, uid)
            if user:
                return user
    raise HTTPException(401, "请先登录")


class LoginIn(BaseModel):
    username: str
    password: str


class TxIn(BaseModel):
    ledger_id: int
    account_id: int
    category_id: int
    type: str
    amount: float = Field(gt=0)
    occurred_at: Optional[datetime] = None
    note: str = ""


class TxPatch(BaseModel):
    ledger_id: Optional[int] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    type: Optional[str] = None
    amount: Optional[float] = None
    occurred_at: Optional[datetime] = None
    note: Optional[str] = None


class MemberIn(BaseModel):
    username: str
    password: str
    display_name: str
    role: str = "member"
    wechat_alias: str = ""
    avatar_color: str = "#81B29A"


class MemberPatch(BaseModel):
    display_name: Optional[str] = None
    wechat_alias: Optional[str] = None
    role: Optional[str] = None
    avatar_color: Optional[str] = None


class MePatch(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=40)
    display_name: Optional[str] = None
    wechat_alias: Optional[str] = None
    avatar_color: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=64)


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=6, max_length=64)


class AccountIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    kind: str = "cash"
    opening_balance: float = 0
    owner_user_id: Optional[int] = None
    ledger_id: Optional[int] = None


class AccountPatch(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    opening_balance: Optional[float] = None


class BackupConfigIn(BaseModel):
    enabled: bool
    frequency: str = "daily"
    hour: int = Field(default=3, ge=0, le=23)
    minute: int = Field(default=0, ge=0, le=59)
    weekday: int = Field(default=0, ge=0, le=6)
    keep_count: int = Field(default=7, ge=1, le=365)


class LedgerIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: str = "personal"
    icon: str = "📒"
    description: str = ""
    include_in_family: bool = True
    owner_user_id: Optional[int] = None


class LedgerPatch(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    include_in_family: Optional[bool] = None
    owner_user_id: Optional[int] = None


class BudgetIn(BaseModel):
    year: int
    month: int
    amount: float
    category_id: Optional[int] = None
    ledger_id: Optional[int] = None


class IngestIn(BaseModel):
    text: str
    wechat_alias: Optional[str] = None
    member_username: Optional[str] = None
    dry_run: bool = False


class StructuredTxIn(BaseModel):
    amount: float
    type: str = "expense"
    ledger: str = "personal"
    category: Optional[str] = None
    note: str = ""
    occurred_at: Optional[datetime] = None
    wechat_alias: Optional[str] = None
    member_username: Optional[str] = None


def user_out(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "display_name": u.display_name,
        "role": u.role,
        "avatar_color": u.avatar_color,
        "avatar_url": media_url(getattr(u, "avatar_path", "") or ""),
        "wechat_alias": u.wechat_alias,
        "household_id": u.household_id,
    }


def ledger_out(r: Ledger, user: User | None = None) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "type": r.type,
        "icon": r.icon,
        "description": getattr(r, "description", "") or "",
        "cover_url": media_url(getattr(r, "cover_path", "") or ""),
        "owner_user_id": r.owner_user_id,
        "include_in_family": r.include_in_family,
        "visible": can_see_ledger(user, r) if user else True,
    }


def can_edit_ledger(user: User, ledger: Ledger) -> bool:
    if user.role == "viewer":
        return False
    if user.role == "owner":
        return True
    if ledger.type == "personal" and ledger.owner_user_id == user.id:
        return True
    return ledger.type in ("family", "business") and user.role == "member"


def tx_out(tx: Transaction, db: Session) -> dict:
    cat = db.get(Category, tx.category_id)
    ledger = db.get(Ledger, tx.ledger_id)
    who = db.get(User, tx.user_id)
    acc = db.get(Account, tx.account_id)
    return {
        "id": tx.id,
        "ledger_id": tx.ledger_id,
        "ledger_name": ledger.name if ledger else "",
        "ledger_type": ledger.type if ledger else "",
        "user_id": tx.user_id,
        "user_name": who.display_name if who else "",
        "account_id": tx.account_id,
        "account_name": acc.name if acc else "",
        "category_id": tx.category_id,
        "category_name": cat.name if cat else "",
        "category_icon": cat.icon if cat else "✨",
        "category_color": cat.color if cat else "#ADB5BD",
        "type": tx.type,
        "amount": tx.amount,
        "occurred_at": tx.occurred_at.isoformat(),
        "note": tx.note,
        "source": tx.source,
    }


def can_see_ledger(user: User, ledger: Ledger) -> bool:
    """家庭成员可查看：家庭账、经营账、自己的个人账，以及计入家庭总览的他人个人账。"""
    if user.role == "owner":
        return True
    if ledger.type in ("family", "business"):
        return True
    if ledger.owner_user_id == user.id:
        return True
    # 计入家庭总览的个人账，全家可见（与统计「生活账」口径一致）
    return bool(ledger.include_in_family)


def can_write(user: User) -> bool:
    return user.role != "viewer"


def month_range(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end


@app.post("/api/v1/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(400, "用户名或密码不正确")
    return {"token": create_access_token(user.id), "user": user_out(user)}


@app.get("/api/v1/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    from .models import Household

    house = db.get(Household, user.household_id)
    return {"user": user_out(user), "household": {"id": house.id, "name": house.name}}


@app.patch("/api/v1/me")
def patch_me(body: MePatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.username is not None:
        new_username = body.username.strip()
        if not new_username:
            raise HTTPException(400, "登录名不能为空")
        if db.query(User).filter(User.username == new_username, User.id != user.id).first():
            raise HTTPException(400, "登录名已被占用")
        user.username = new_username
    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.wechat_alias is not None:
        user.wechat_alias = body.wechat_alias.strip()
    if body.avatar_color is not None:
        user.avatar_color = body.avatar_color
    db.commit()
    db.refresh(user)
    return user_out(user)


@app.post("/api/v1/me/avatar")
async def upload_my_avatar(
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    delete_media(user.avatar_path)
    user.avatar_path = await save_user_avatar(file, user.id)
    db.commit()
    db.refresh(user)
    return user_out(user)


@app.get("/api/v1/media/{category}/{filename}")
def get_media(category: str, filename: str):
    if category not in ("avatars", "ledger-covers"):
        raise HTTPException(404, "不存在")
    try:
        path = media_file_path(f"{category}/{filename}")
    except ValueError:
        raise HTTPException(404, "不存在")
    if not path.exists():
        raise HTTPException(404, "不存在")
    return FileResponse(path)


@app.post("/api/v1/me/password")
def change_my_password(
    body: PasswordChange, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(400, "当前密码不正确")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@app.get("/api/v1/members")
def members(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(User).filter(User.household_id == user.household_id).all()
    return [user_out(u) for u in rows]


@app.post("/api/v1/members")
def add_member(body: MemberIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "owner":
        raise HTTPException(403, "只有家长可以添加成员")
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "用户名已存在")
    u = User(
        household_id=user.household_id,
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        role=body.role if body.role in ("owner", "member", "viewer") else "member",
        avatar_color=body.avatar_color,
        wechat_alias=body.wechat_alias,
    )
    db.add(u)
    db.flush()
    db.add(
        Ledger(
            household_id=user.household_id,
            owner_user_id=u.id,
            type="personal",
            name=f"{body.display_name}的日常",
            include_in_family=True,
            icon="📒",
        )
    )
    db.add(
        Account(
            household_id=user.household_id,
            owner_user_id=u.id,
            name=f"{body.display_name}的钱包",
            kind="ewallet",
            opening_balance=0,
        )
    )
    db.commit()
    db.refresh(u)
    return user_out(u)


@app.patch("/api/v1/members/{member_id}")
def patch_member(
    member_id: int,
    body: MemberPatch,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role != "owner" and user.id != member_id:
        raise HTTPException(403, "无权修改")
    m = db.get(User, member_id)
    if not m or m.household_id != user.household_id:
        raise HTTPException(404, "成员不存在")
    if body.display_name is not None:
        m.display_name = body.display_name
    if body.wechat_alias is not None:
        m.wechat_alias = body.wechat_alias
    if body.role is not None and user.role == "owner":
        if m.id == user.id and body.role != "owner":
            raise HTTPException(400, "不能取消自己的家长身份")
        m.role = body.role
    if body.avatar_color is not None:
        if user.role != "owner" and user.id != member_id:
            raise HTTPException(403, "无权修改")
        m.avatar_color = body.avatar_color
    db.commit()
    return user_out(m)


@app.post("/api/v1/members/{member_id}/password")
def reset_member_password(
    member_id: int,
    body: PasswordReset,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    m = db.get(User, member_id)
    if not m or m.household_id != user.household_id:
        raise HTTPException(404, "成员不存在")
    if user.role != "owner" and user.id != member_id:
        raise HTTPException(403, "只有家长可重置他人密码")
    m.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


@app.get("/api/v1/ledgers")
def list_ledgers(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(Ledger).filter(Ledger.household_id == user.household_id).all()
    return [ledger_out(r, user) for r in rows if can_see_ledger(user, r)]


@app.post("/api/v1/ledgers")
def create_ledger(body: LedgerIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not can_write(user):
        raise HTTPException(403, "只读成员不能创建账本")
    if body.type not in ("personal", "family", "business"):
        raise HTTPException(400, "账本类型无效")
    owner_id = body.owner_user_id
    if body.type == "personal":
        owner_id = owner_id or user.id
        if user.role != "owner" and owner_id != user.id:
            raise HTTPException(403, "只能为自己创建个人账本")
    else:
        owner_id = owner_id if body.type == "business" else None
    include = body.include_in_family
    if body.type == "business":
        include = False
    row = Ledger(
        household_id=user.household_id,
        owner_user_id=owner_id,
        type=body.type,
        name=body.name.strip(),
        icon=body.icon[:32] if body.icon else "📒",
        description=body.description[:200],
        include_in_family=include,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return ledger_out(row, user)


@app.patch("/api/v1/ledgers/{ledger_id}")
def patch_ledger(
    ledger_id: int,
    body: LedgerPatch,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    row = db.get(Ledger, ledger_id)
    if not row or row.household_id != user.household_id:
        raise HTTPException(404, "账本不存在")
    if not can_edit_ledger(user, row):
        raise HTTPException(403, "无权编辑该账本")
    if body.name is not None:
        row.name = body.name.strip()
    if body.icon is not None:
        row.icon = body.icon[:32]
    if body.description is not None:
        row.description = body.description[:200]
    if body.include_in_family is not None and row.type != "business":
        row.include_in_family = body.include_in_family
    if body.owner_user_id is not None and row.type == "personal" and user.role == "owner":
        row.owner_user_id = body.owner_user_id
    db.commit()
    db.refresh(row)
    return ledger_out(row, user)


@app.post("/api/v1/ledgers/{ledger_id}/cover")
async def upload_ledger_cover(
    ledger_id: int,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    row = db.get(Ledger, ledger_id)
    if not row or row.household_id != user.household_id:
        raise HTTPException(404, "账本不存在")
    if not can_edit_ledger(user, row):
        raise HTTPException(403, "无权编辑该账本")
    delete_media(row.cover_path)
    row.cover_path = await save_ledger_cover(file, ledger_id)
    db.commit()
    db.refresh(row)
    return ledger_out(row, user)


@app.delete("/api/v1/ledgers/{ledger_id}")
def remove_ledger(ledger_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "owner":
        raise HTTPException(403, "仅家长可删除账本")
    row = db.get(Ledger, ledger_id)
    if not row or row.household_id != user.household_id:
        raise HTTPException(404, "账本不存在")
    used = db.query(Transaction).filter(Transaction.ledger_id == ledger_id).first()
    if used:
        raise HTTPException(400, "账本仍有流水，请先删除或移走全部流水后再删账本")
    db.query(Budget).filter(Budget.ledger_id == ledger_id).delete(synchronize_session=False)
    linked_accounts = db.query(Account).filter(Account.ledger_id == ledger_id).all()
    for acc in linked_accounts:
        has_tx = db.query(Transaction).filter(Transaction.account_id == acc.id).first()
        if has_tx:
            acc.ledger_id = None
        else:
            db.delete(acc)
    delete_media(row.cover_path)
    db.delete(row)
    db.commit()
    return {"ok": True}


@app.get("/api/v1/accounts")
def accounts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """与流水可见范围对齐：能看生活账则看生活账户；能看经营账则看经营账户。"""
    rows = db.query(Account).filter(Account.household_id == user.household_id).all()
    can_life = bool(_life_ledger_ids(db, user))
    can_biz = bool(_visible_ledger_ids(db, user, "business"))
    visible_lids = set(_visible_ledger_ids(db, user, "all"))
    out = []
    for a in rows:
        if a.kind == "business":
            if not can_biz:
                continue
        else:
            if not can_life:
                # 无生活账可见时，仅自己的账户
                if a.owner_user_id not in (None, user.id):
                    continue
            elif a.ledger_id and a.ledger_id not in visible_lids:
                continue
        out.append(
            {
                "id": a.id,
                "name": a.name,
                "kind": a.kind,
                "opening_balance": a.opening_balance,
                "owner_user_id": a.owner_user_id,
                "ledger_id": a.ledger_id,
            }
        )
    return out


ALLOWED_ACCOUNT_KINDS = {"cash", "bank", "ewallet", "credit", "business"}


def _validate_account_kind(kind: str) -> str:
    if kind not in ALLOWED_ACCOUNT_KINDS:
        raise HTTPException(400, "账户类型无效")
    return kind


@app.post("/api/v1/accounts")
def create_account(body: AccountIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == "viewer":
        raise HTTPException(403, "只读成员不能管理资金账户")
    acc = Account(
        household_id=user.household_id,
        name=body.name.strip(),
        kind=_validate_account_kind(body.kind),
        opening_balance=body.opening_balance,
        owner_user_id=body.owner_user_id,
        ledger_id=body.ledger_id,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return {
        "id": acc.id,
        "name": acc.name,
        "kind": acc.kind,
        "opening_balance": acc.opening_balance,
        "owner_user_id": acc.owner_user_id,
        "ledger_id": acc.ledger_id,
    }


@app.patch("/api/v1/accounts/{account_id}")
def patch_account(
    account_id: int,
    body: AccountPatch,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role == "viewer":
        raise HTTPException(403, "只读")
    acc = db.get(Account, account_id)
    if not acc or acc.household_id != user.household_id:
        raise HTTPException(404, "账户不存在")
    if body.name is not None:
        acc.name = body.name.strip()
    if body.kind is not None:
        acc.kind = _validate_account_kind(body.kind)
    if body.opening_balance is not None:
        acc.opening_balance = body.opening_balance
    db.commit()
    db.refresh(acc)
    return {
        "id": acc.id,
        "name": acc.name,
        "kind": acc.kind,
        "opening_balance": acc.opening_balance,
        "owner_user_id": acc.owner_user_id,
        "ledger_id": acc.ledger_id,
    }


@app.delete("/api/v1/accounts/{account_id}")
def delete_account(
    account_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    if user.role != "owner":
        raise HTTPException(403, "只有家长可以删除资金账户")
    acc = db.get(Account, account_id)
    if not acc or acc.household_id != user.household_id:
        raise HTTPException(404, "账户不存在")
    used = db.query(Transaction).filter(Transaction.account_id == account_id).first()
    if used:
        raise HTTPException(400, "该账户已有流水，无法删除")
    db.delete(acc)
    db.commit()
    return {"ok": True}


@app.get("/api/v1/categories")
def categories(
    ledger_type: Optional[str] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Category).filter(Category.household_id == user.household_id)
    if ledger_type:
        q = q.filter(Category.ledger_type == ledger_type)
    return [
        {
            "id": c.id,
            "name": c.name,
            "icon": c.icon,
            "color": c.color,
            "kind": c.kind,
            "ledger_type": c.ledger_type,
        }
        for c in q.all()
    ]


@app.get("/api/v1/transactions")
def list_tx(
    ledger_id: Optional[int] = None,
    ledger_type: Optional[str] = None,
    user_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    day: Optional[int] = None,
    owner_user_id: Optional[int] = None,
    tx_type: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(Transaction.household_id == user.household_id)
    if year and month and day:
        start = datetime(year, month, day)
        end = start + timedelta(days=1)
        q = q.filter(Transaction.occurred_at >= start, Transaction.occurred_at < end)
    elif year and month:
        start, end = month_range(year, month)
        q = q.filter(Transaction.occurred_at >= start, Transaction.occurred_at < end)
    if ledger_id:
        q = q.filter(Transaction.ledger_id == ledger_id)
    if ledger_type in ("life", "living", "family_life"):
        q = q.filter(Transaction.ledger_id.in_(_life_ledger_ids(db, user) or [0]))
    elif ledger_type == "family":
        # 兼容旧参数：按生活账口径（计入家庭总览），不是仅 type=family
        q = q.filter(Transaction.ledger_id.in_(_life_ledger_ids(db, user) or [0]))
    elif ledger_type:
        ids = [
            l.id
            for l in db.query(Ledger).filter(
                Ledger.household_id == user.household_id, Ledger.type == ledger_type
            )
            if can_see_ledger(user, l)
        ]
        q = q.filter(Transaction.ledger_id.in_(ids or [0]))
    # user_id / owner_user_id：均按「记账人」过滤（日历按成员与此对齐）
    recorder_id = user_id if user_id is not None else owner_user_id
    if recorder_id is not None:
        _assert_same_household_member(db, user, recorder_id)
        q = q.filter(Transaction.user_id == recorder_id)
    if tx_type:
        q = q.filter(Transaction.type == tx_type)
    visible = [
        l.id
        for l in db.query(Ledger).filter(Ledger.household_id == user.household_id)
        if can_see_ledger(user, l)
    ]
    q = q.filter(Transaction.ledger_id.in_(visible or [0]))
    safe_limit = max(1, min(int(limit or 200), 500))
    safe_offset = max(0, int(offset or 0))
    rows = q.order_by(Transaction.occurred_at.desc()).offset(safe_offset).limit(safe_limit).all()
    return [tx_out(t, db) for t in rows]


@app.post("/api/v1/transactions")
def create_tx(body: TxIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not can_write(user):
        raise HTTPException(403, "只读成员不能记账")
    ledger = db.get(Ledger, body.ledger_id)
    if not ledger or ledger.household_id != user.household_id:
        raise HTTPException(404, "账本不存在")
    if not can_see_ledger(user, ledger):
        raise HTTPException(403, "无权写入该账本")
    tx = Transaction(
        household_id=user.household_id,
        ledger_id=body.ledger_id,
        user_id=user.id,
        account_id=body.account_id,
        category_id=body.category_id,
        type=body.type,
        amount=round(body.amount, 2),
        occurred_at=body.occurred_at or datetime.now(),
        note=body.note,
        source="manual",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx_out(tx, db)


@app.patch("/api/v1/transactions/{tx_id}")
def patch_tx(
    tx_id: int, body: TxPatch, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    if not can_write(user):
        raise HTTPException(403, "只读")
    tx = db.get(Transaction, tx_id)
    if not tx or tx.household_id != user.household_id:
        raise HTTPException(404, "流水不存在")
    if user.role != "owner" and tx.user_id != user.id:
        raise HTTPException(403, "只能改自己记的账")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(tx, k, v)
    db.commit()
    db.refresh(tx)
    return tx_out(tx, db)


@app.delete("/api/v1/transactions/{tx_id}")
def delete_tx(tx_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not can_write(user):
        raise HTTPException(403, "只读")
    tx = db.get(Transaction, tx_id)
    if not tx or tx.household_id != user.household_id:
        raise HTTPException(404, "流水不存在")
    if user.role != "owner" and tx.user_id != user.id:
        raise HTTPException(403, "只能删自己记的账")
    db.delete(tx)
    db.commit()
    return {"ok": True}


def _life_ledger_ids(db: Session, user: User) -> list[int]:
    """生活账统一口径：计入家庭总览、且非经营账。"""
    rows = db.query(Ledger).filter(Ledger.household_id == user.household_id).all()
    return [
        l.id
        for l in rows
        if l.include_in_family and l.type != "business" and can_see_ledger(user, l)
    ]


def _visible_ledger_ids(
    db: Session, user: User, scope: str = "all", owner_user_id: int | None = None
) -> list[int]:
    """
    返回可见账本 ID。
    owner_user_id 不再按「账本归属」裁剪，改由日历/流水按 Transaction.user_id（记账人）过滤。
    scope=family 与 dashboard 生活账口径一致（include_in_family）。
    """
    rows = db.query(Ledger).filter(Ledger.household_id == user.household_id).all()
    visible = [l for l in rows if can_see_ledger(user, l)]
    if owner_user_id is not None:
        target = db.get(User, owner_user_id)
        if not target or target.household_id != user.household_id:
            raise HTTPException(404, "成员不存在")
    if scope == "family":
        return [l.id for l in visible if l.include_in_family and l.type != "business"]
    if scope == "business":
        return [l.id for l in visible if l.type == "business"]
    return [l.id for l in visible]


def _assert_same_household_member(db: Session, user: User, member_id: int) -> User:
    target = db.get(User, member_id)
    if not target or target.household_id != user.household_id:
        raise HTTPException(404, "成员不存在")
    return target


def _calendar_person(db: Session, owner_user_id: int | None) -> dict | None:
    if not owner_user_id:
        return None
    who = db.get(User, owner_user_id)
    if not who:
        return None
    return {"id": who.id, "display_name": who.display_name, "avatar_color": who.avatar_color}


@app.get("/api/v1/calendar/month")
def calendar_month(
    year: Optional[int] = None,
    month: Optional[int] = None,
    scope: str = "all",
    owner_user_id: Optional[int] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """按日汇总：每月格子里看收入/支出/结余。"""
    now = datetime.now()
    year = year or now.year
    month = month or now.month
    if month < 1 or month > 12:
        raise HTTPException(400, "月份无效")
    start, end = month_range(year, month)
    lids = _visible_ledger_ids(db, user, scope)
    days_map: dict[str, dict] = {}
    if lids:
        q = db.query(Transaction).filter(
            Transaction.household_id == user.household_id,
            Transaction.ledger_id.in_(lids),
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        if owner_user_id is not None:
            _assert_same_household_member(db, user, owner_user_id)
            q = q.filter(Transaction.user_id == owner_user_id)
        rows = q.all()
        for tx in rows:
            key = tx.occurred_at.strftime("%Y-%m-%d")
            cell = days_map.setdefault(
                key, {"date": key, "income": 0.0, "expense": 0.0, "count": 0}
            )
            cell["count"] += 1
            if tx.type == "income":
                cell["income"] += float(tx.amount)
            else:
                cell["expense"] += float(tx.amount)
    days = []
    for key in sorted(days_map):
        cell = days_map[key]
        cell["income"] = round(cell["income"], 2)
        cell["expense"] = round(cell["expense"], 2)
        cell["balance"] = round(cell["income"] - cell["expense"], 2)
        days.append(cell)
    income = round(sum(d["income"] for d in days), 2)
    expense = round(sum(d["expense"] for d in days), 2)
    return {
        "year": year,
        "month": month,
        "scope": scope,
        "person": _calendar_person(db, owner_user_id),
        "summary": {
            "income": income,
            "expense": expense,
            "balance": round(income - expense, 2),
            "days_with_tx": len(days),
            "tx_count": sum(d["count"] for d in days),
        },
        "days": days,
    }


@app.get("/api/v1/calendar/year")
def calendar_year(
    year: Optional[int] = None,
    scope: str = "all",
    owner_user_id: Optional[int] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """按月汇总：一年里各月收支一眼看完。owner_user_id 按记账人过滤。"""
    now = datetime.now()
    year = year or now.year
    lids = _visible_ledger_ids(db, user, scope)
    if owner_user_id is not None:
        _assert_same_household_member(db, user, owner_user_id)
    months = []
    year_income = 0.0
    year_expense = 0.0
    hid = user.household_id
    for m in range(1, 13):
        s, e = month_range(year, m)
        if owner_user_id is not None:
            income = _sum_by_user(db, hid, lids, s, e, "income", owner_user_id)
            expense = _sum_by_user(db, hid, lids, s, e, "expense", owner_user_id)
        else:
            income = _sum(db, hid, lids, s, e, "income")
            expense = _sum(db, hid, lids, s, e, "expense")
        year_income += income
        year_expense += expense
        months.append(
            {
                "year": year,
                "month": m,
                "income": round(income, 2),
                "expense": round(expense, 2),
                "balance": round(income - expense, 2),
            }
        )
    return {
        "year": year,
        "scope": scope,
        "person": _calendar_person(db, owner_user_id),
        "summary": {
            "income": round(year_income, 2),
            "expense": round(year_expense, 2),
            "balance": round(year_income - year_expense, 2),
        },
        "months": months,
    }


def _sum(db: Session, hid: int, ledger_ids: list[int], start: datetime, end: datetime, tx_type: str):
    if not ledger_ids:
        return 0.0
    val = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.household_id == hid,
            Transaction.ledger_id.in_(ledger_ids),
            Transaction.type == tx_type,
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        .scalar()
    )
    return float(val)


def _sum_by_user(
    db: Session,
    hid: int,
    ledger_ids: list[int],
    start: datetime,
    end: datetime,
    tx_type: str,
    user_id: int,
):
    """按记账人汇总，口径与 _sum 的账本范围保持一致。"""
    if not ledger_ids:
        return 0.0
    val = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.household_id == hid,
            Transaction.ledger_id.in_(ledger_ids),
            Transaction.user_id == user_id,
            Transaction.type == tx_type,
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        .scalar()
    )
    return float(val)


@app.get("/api/v1/dashboard")
def dashboard(
    year: Optional[int] = None,
    month: Optional[int] = None,
    granularity: str = "month",
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    year = year or now.year
    month = month or now.month
    is_year = granularity == "year"
    hid = user.household_id
    if is_year:
        start, end = datetime(year, 1, 1), datetime(year + 1, 1, 1)
    else:
        start, end = month_range(year, month)
    all_ledgers = db.query(Ledger).filter(Ledger.household_id == hid).all()
    # 生活账统一口径：include_in_family 且非经营；成员侧再按 can_see 裁剪
    family_ids = [
        l.id
        for l in all_ledgers
        if l.include_in_family and l.type != "business" and can_see_ledger(user, l)
    ]
    biz_ids = [l.id for l in all_ledgers if l.type == "business" and can_see_ledger(user, l)]
    personal_mine = [l.id for l in all_ledgers if l.type == "personal" and l.owner_user_id == user.id]

    family_income = _sum(db, hid, family_ids, start, end, "income")
    family_expense = _sum(db, hid, family_ids, start, end, "expense")
    biz_income = _sum(db, hid, biz_ids, start, end, "income")
    biz_expense = _sum(db, hid, biz_ids, start, end, "expense")
    my_income = _sum(db, hid, personal_mine, start, end, "income")
    my_expense = _sum(db, hid, personal_mine, start, end, "expense")

    members = db.query(User).filter(User.household_id == hid).all()
    member_stats = []
    for m in members:
        # 与 family 总额同一账本范围，按「谁记的」拆分，避免家庭公共账对不上
        member_stats.append(
            {
                "user_id": m.id,
                "display_name": m.display_name,
                "avatar_color": m.avatar_color,
                "avatar_url": media_url(getattr(m, "avatar_path", "") or ""),
                "expense": _sum_by_user(db, hid, family_ids, start, end, "expense", m.id),
                "income": _sum_by_user(db, hid, family_ids, start, end, "income", m.id),
            }
        )

    def _category_breakdown(ledger_ids: list[int], tx_type: str):
        cat_rows = (
            db.query(
                Category.name,
                Category.icon,
                Category.color,
                func.sum(Transaction.amount),
                func.count(Transaction.id),
            )
            .join(Transaction, Transaction.category_id == Category.id)
            .filter(
                Transaction.household_id == hid,
                Transaction.ledger_id.in_(ledger_ids or [0]),
                Transaction.type == tx_type,
                Transaction.occurred_at >= start,
                Transaction.occurred_at < end,
            )
            .group_by(Category.id)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )
        return [
            {
                "name": n,
                "icon": i,
                "color": c,
                "value": float(v or 0),
                "count": int(cnt or 0),
            }
            for n, i, c, v, cnt in cat_rows
        ]

    # category pie: 生活/经营 × 支出/收入（月度/年度同一口径）
    by_category = _category_breakdown(family_ids, "expense")
    by_category_income = _category_breakdown(family_ids, "income")
    by_category_business = _category_breakdown(biz_ids, "expense")
    by_category_business_income = _category_breakdown(biz_ids, "income")

    trend = []
    if is_year:
        for mth in range(1, 13):
            s, e = month_range(year, mth)
            trend.append(
                {
                    "label": f"{mth}月",
                    "year": year,
                    "month": mth,
                    "income": _sum(db, hid, family_ids, s, e, "income"),
                    "expense": _sum(db, hid, family_ids, s, e, "expense"),
                }
            )
    else:
        base = year * 12 + (month - 1)
        for i in range(5, -1, -1):
            m_index = base - i
            y, mth = divmod(m_index, 12)
            mth += 1
            s, e = month_range(y, mth)
            trend.append(
                {
                    "label": f"{mth}月",
                    "year": y,
                    "month": mth,
                    "income": _sum(db, hid, family_ids, s, e, "income"),
                    "expense": _sum(db, hid, family_ids, s, e, "expense"),
                }
            )

    budgets = db.query(Budget).filter(Budget.household_id == hid, Budget.year == year, Budget.month == month).all()
    budget_out = []
    for b in budgets:
        lids = family_ids
        if b.ledger_id:
            lids = [b.ledger_id]
        spent_q = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
            Transaction.household_id == hid,
            Transaction.ledger_id.in_(lids or [0]),
            Transaction.type == "expense",
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        if b.category_id:
            spent_q = spent_q.filter(Transaction.category_id == b.category_id)
        spent = float(spent_q.scalar())
        cat = db.get(Category, b.category_id) if b.category_id else None
        budget_out.append(
            {
                "id": b.id,
                "amount": b.amount,
                "spent": spent,
                "category_name": cat.name if cat else "家庭总支出",
                "ratio": spent / b.amount if b.amount else 0,
            }
        )

    # 首页「最近入账」只展示生活账，避免经营流水混进家庭总览
    recent = (
        db.query(Transaction)
        .filter(Transaction.household_id == hid, Transaction.ledger_id.in_(family_ids or [0]))
        .order_by(Transaction.occurred_at.desc())
        .limit(8)
        .all()
    )
    recent_biz = (
        db.query(Transaction)
        .filter(Transaction.household_id == hid, Transaction.ledger_id.in_(biz_ids or [0]))
        .order_by(Transaction.occurred_at.desc())
        .limit(5)
        .all()
    )
    if user.role != "owner":
        vis = [l.id for l in all_ledgers if can_see_ledger(user, l)]
        recent = [t for t in recent if t.ledger_id in vis]
        recent_biz = [t for t in recent_biz if t.ledger_id in vis]

    accounts = db.query(Account).filter(Account.household_id == hid).all()
    life_opening = round(
        sum(float(a.opening_balance) for a in accounts if a.kind != "business"), 2
    )
    biz_opening = round(
        sum(float(a.opening_balance) for a in accounts if a.kind == "business"), 2
    )

    return {
        "period": {"year": year, "month": month, "granularity": "year" if is_year else "month"},
        "family": {
            "income": family_income,
            "expense": family_expense,
            "balance": family_income - family_expense,
            "opening_balance": life_opening,
        },
        "me": {"income": my_income, "expense": my_expense, "balance": my_income - my_expense},
        "business": {
            "income": biz_income,
            "expense": biz_expense,
            "profit": biz_income - biz_expense,
            "opening_balance": biz_opening,
        },
        "members": member_stats,
        "by_category": by_category,
        "by_category_income": by_category_income,
        "by_category_business": by_category_business,
        "by_category_business_income": by_category_business_income,
        "trend": trend,
        "budgets": budget_out,
        "recent": [tx_out(t, db) for t in recent],
        "recent_business": [tx_out(t, db) for t in recent_biz],
    }


def _prev_period(year: int, month: int, is_year: bool) -> tuple[int, int, datetime, datetime]:
    """返回上期 (year, month占位, start, end)。年粒度时 month 固定为 1。"""
    if is_year:
        return year - 1, 1, datetime(year - 1, 1, 1), datetime(year, 1, 1)
    if month == 1:
        return year - 1, 12, *month_range(year - 1, 12)
    return year, month - 1, *month_range(year, month - 1)


def _category_breakdown_range(
    db: Session,
    hid: int,
    ledger_ids: list[int],
    start: datetime,
    end: datetime,
    tx_type: str,
) -> list[dict]:
    cat_rows = (
        db.query(
            Category.id,
            Category.name,
            Category.icon,
            Category.color,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.household_id == hid,
            Transaction.ledger_id.in_(ledger_ids or [0]),
            Transaction.type == tx_type,
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    return [
        {
            "category_id": cid,
            "name": n,
            "icon": i,
            "color": c,
            "value": float(v or 0),
            "count": int(cnt or 0),
        }
        for cid, n, i, c, v, cnt in cat_rows
    ]


def _daily_expense_series(
    db: Session, hid: int, ledger_ids: list[int], start: datetime, end: datetime
) -> list[dict]:
    if not ledger_ids:
        return []
    rows = (
        db.query(func.date(Transaction.occurred_at), func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.household_id == hid,
            Transaction.ledger_id.in_(ledger_ids),
            Transaction.type == "expense",
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
        )
        .group_by(func.date(Transaction.occurred_at))
        .all()
    )
    out = []
    for d, v in rows:
        if hasattr(d, "isoformat"):
            date_s = d.isoformat()
        else:
            date_s = str(d)[:10]
        out.append({"date": date_s, "expense": float(v or 0)})
    out.sort(key=lambda x: x["date"])
    return out


def _large_tx_rows(
    db: Session,
    hid: int,
    ledger_ids: list[int],
    start: datetime,
    end: datetime,
    threshold: float,
    limit: int = 5,
) -> list[dict]:
    if not ledger_ids or threshold <= 0:
        return []
    rows = (
        db.query(Transaction)
        .filter(
            Transaction.household_id == hid,
            Transaction.ledger_id.in_(ledger_ids),
            Transaction.type == "expense",
            Transaction.occurred_at >= start,
            Transaction.occurred_at < end,
            Transaction.amount >= threshold,
        )
        .order_by(Transaction.amount.desc())
        .limit(limit)
        .all()
    )
    result = []
    for t in rows:
        cat = db.get(Category, t.category_id) if t.category_id else None
        result.append(
            {
                "id": t.id,
                "amount": float(t.amount),
                "note": t.note or "",
                "category_name": cat.name if cat else "",
                "occurred_at": t.occurred_at.isoformat() if t.occurred_at else "",
                "date": t.occurred_at.strftime("%Y-%m-%d") if t.occurred_at else "",
            }
        )
    return result


def _pct_delta(curr: float, prev: float) -> float | None:
    if prev == 0:
        return None if curr == 0 else 100.0
    return round((curr - prev) / abs(prev) * 100, 1)


def _mean_std(values: list[float]) -> tuple[float, float]:
    if not values:
        return 0.0, 0.0
    n = len(values)
    mean = sum(values) / n
    if n < 2:
        return mean, 0.0
    var = sum((x - mean) ** 2 for x in values) / n
    return mean, math.sqrt(var)


@app.get("/api/v1/insights")
def insights(
    year: Optional[int] = None,
    month: Optional[int] = None,
    granularity: str = "month",
    scope: str = "life",
    kind: str = "expense",
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """规则化智能分析：总结、环比、异常、节流建议。不调用大模型。"""
    now = datetime.now()
    year = year or now.year
    month = month or now.month
    is_year = granularity == "year"
    kind = "income" if kind == "income" else "expense"
    scope = "business" if scope in ("business", "biz") else "life"
    hid = user.household_id

    all_ledgers = db.query(Ledger).filter(Ledger.household_id == hid).all()
    family_ids = [
        l.id
        for l in all_ledgers
        if l.include_in_family and l.type != "business" and can_see_ledger(user, l)
    ]
    biz_ids = [l.id for l in all_ledgers if l.type == "business" and can_see_ledger(user, l)]
    ledger_ids = biz_ids if scope == "business" else family_ids

    if is_year:
        start, end = datetime(year, 1, 1), datetime(year + 1, 1, 1)
        period = {"year": year, "month": None, "granularity": "year", "label": f"{year}年"}
    else:
        start, end = month_range(year, month)
        period = {"year": year, "month": month, "granularity": "month", "label": f"{year}年{month}月"}

    py, pm, p_start, p_end = _prev_period(year, month, is_year)
    compare_period = {
        "year": py,
        "month": None if is_year else pm,
        "granularity": "year" if is_year else "month",
        "label": f"{py}年" if is_year else f"{py}年{pm}月",
    }

    income = _sum(db, hid, ledger_ids, start, end, "income")
    expense = _sum(db, hid, ledger_ids, start, end, "expense")
    prev_income = _sum(db, hid, ledger_ids, p_start, p_end, "income")
    prev_expense = _sum(db, hid, ledger_ids, p_start, p_end, "expense")
    focus_curr = income if kind == "income" else expense
    focus_prev = prev_income if kind == "income" else prev_expense
    balance = income - expense
    prev_balance = prev_income - prev_expense

    totals = {
        "income": round(income, 2),
        "expense": round(expense, 2),
        "balance": round(balance, 2),
        "focus": round(focus_curr, 2),
        "prev_income": round(prev_income, 2),
        "prev_expense": round(prev_expense, 2),
        "prev_balance": round(prev_balance, 2),
        "prev_focus": round(focus_prev, 2),
        "delta": round(focus_curr - focus_prev, 2),
        "delta_pct": _pct_delta(focus_curr, focus_prev),
        "income_delta": round(income - prev_income, 2),
        "income_delta_pct": _pct_delta(income, prev_income),
        "expense_delta": round(expense - prev_expense, 2),
        "expense_delta_pct": _pct_delta(expense, prev_expense),
        "balance_delta": round(balance - prev_balance, 2),
    }

    curr_cats = _category_breakdown_range(db, hid, ledger_ids, start, end, kind)
    prev_cats = _category_breakdown_range(db, hid, ledger_ids, p_start, p_end, kind)
    prev_map = {c["name"]: c for c in prev_cats}
    cat_total = sum(c["value"] for c in curr_cats) or 1.0
    categories = []
    for c in curr_cats[:8]:
        prev_v = float(prev_map.get(c["name"], {}).get("value") or 0)
        delta = c["value"] - prev_v
        categories.append(
            {
                **c,
                "pct": round(c["value"] / cat_total * 100, 1),
                "prev_value": round(prev_v, 2),
                "delta": round(delta, 2),
                "delta_pct": _pct_delta(c["value"], prev_v),
            }
        )

    members = []
    if scope == "life":
        for m in db.query(User).filter(User.household_id == hid).all():
            members.append(
                {
                    "user_id": m.id,
                    "display_name": m.display_name,
                    "value": _sum_by_user(db, hid, ledger_ids, start, end, kind, m.id),
                }
            )
        members.sort(key=lambda x: x["value"], reverse=True)

    anomalies: list[dict] = []
    daily = []
    avg_day = 0.0
    if not is_year and kind == "expense":
        daily = _daily_expense_series(db, hid, ledger_ids, start, end)
        values = [d["expense"] for d in daily]
        # 按日历天数补零更稳，但仅有流水的天也能算异常
        days_span = max((end - start).days, 1)
        # 若当前月未结束，只用到今天
        if year == now.year and month == now.month:
            days_span = max(now.day, 1)
        sum_days = sum(values)
        avg_day = sum_days / days_span if days_span else 0.0
        mean, std = _mean_std(values)
        spike_cut = max(avg_day * 2.5, mean + 2 * std, avg_day + 100) if avg_day or mean else 0
        for d in daily:
            if spike_cut > 0 and d["expense"] >= spike_cut and d["expense"] > 0:
                anomalies.append(
                    {
                        "type": "spike_day",
                        "severity": "warn" if d["expense"] < spike_cut * 1.5 else "high",
                        "title": f"{int(d['date'][-2:])}日支出偏高",
                        "detail": f"当日支出 ¥{d['expense']:.2f}，明显高于日均 ¥{avg_day:.2f}。",
                        "ref": {"date": d["date"], "amount": d["expense"]},
                    }
                )

        large_cut = max(avg_day * 5, 500.0)
        for t in _large_tx_rows(db, hid, ledger_ids, start, end, large_cut):
            label = t["note"] or t["category_name"] or "一笔支出"
            anomalies.append(
                {
                    "type": "large_tx",
                    "severity": "info",
                    "title": f"大额支出 ¥{t['amount']:.2f}",
                    "detail": f"「{label}」于 {t['date']}，超过本期大额阈值 ¥{large_cut:.0f}。",
                    "ref": t,
                }
            )

    # 分类环比暴增
    for c in categories:
        if (
            kind == "expense"
            and c["delta"] >= 200
            and c.get("delta_pct") is not None
            and c["delta_pct"] >= 50
        ):
            anomalies.append(
                {
                    "type": "category_surge",
                    "severity": "warn",
                    "title": f"「{c['name']}」明显增多",
                    "detail": (
                        f"本期 ¥{c['value']:.2f}，较{compare_period['label']} "
                        f"{'+' if c['delta'] >= 0 else ''}{c['delta']:.2f}"
                        f"（{c['delta_pct']:+.1f}%）。"
                    ),
                    "ref": {"name": c["name"], "delta": c["delta"], "delta_pct": c["delta_pct"]},
                }
            )

    # 预算
    budget_items = []
    if scope == "life" and not is_year and kind == "expense":
        budgets = (
            db.query(Budget)
            .filter(Budget.household_id == hid, Budget.year == year, Budget.month == month)
            .all()
        )
        for b in budgets:
            lids = ledger_ids
            if b.ledger_id:
                lids = [b.ledger_id]
            spent_q = db.query(func.coalesce(func.sum(Transaction.amount), 0.0)).filter(
                Transaction.household_id == hid,
                Transaction.ledger_id.in_(lids or [0]),
                Transaction.type == "expense",
                Transaction.occurred_at >= start,
                Transaction.occurred_at < end,
            )
            if b.category_id:
                spent_q = spent_q.filter(Transaction.category_id == b.category_id)
            spent = float(spent_q.scalar())
            ratio = spent / b.amount if b.amount else 0
            cat = db.get(Category, b.category_id) if b.category_id else None
            name = cat.name if cat else "家庭总支出"
            item = {
                "id": b.id,
                "category_name": name,
                "amount": float(b.amount),
                "spent": round(spent, 2),
                "ratio": round(ratio, 3),
                "remaining": round(float(b.amount) - spent, 2),
            }
            budget_items.append(item)
            if ratio >= 1:
                anomalies.append(
                    {
                        "type": "budget_over",
                        "severity": "high",
                        "title": f"「{name}」预算已超支",
                        "detail": f"已用 ¥{spent:.2f} / 预算 ¥{b.amount:.2f}（{ratio * 100:.0f}%）。",
                        "ref": item,
                    }
                )
            elif ratio >= 0.85:
                anomalies.append(
                    {
                        "type": "budget_warn",
                        "severity": "warn",
                        "title": f"「{name}」预算将尽",
                        "detail": f"已用 ¥{spent:.2f} / 预算 ¥{b.amount:.2f}（{ratio * 100:.0f}%），剩余 ¥{item['remaining']:.2f}。",
                        "ref": item,
                    }
                )

    # 节流建议
    savings_hints: list[dict] = []
    if kind == "expense" and categories:
        top = categories[0]
        if top["pct"] >= 45:
            compress = round(top["value"] * 0.1, 2)
            savings_hints.append(
                {
                    "code": "top_heavy",
                    "category_name": top["name"],
                    "title": f"「{top['name']}」占比偏高",
                    "detail": f"占本期支出 {top['pct']:.1f}%。若压缩约 10%，大约能省 ¥{compress:.2f}。",
                    "estimate_save": compress,
                }
            )
        elif top["pct"] >= 30:
            savings_hints.append(
                {
                    "code": "top_watch",
                    "category_name": top["name"],
                    "title": f"关注「{top['name']}」节奏",
                    "detail": f"占比 {top['pct']:.1f}%（¥{top['value']:.2f}），可按周复盘是否有可压缩空间。",
                    "estimate_save": round(top["value"] * 0.05, 2),
                }
            )
        for c in categories[1:4]:
            if c.get("delta_pct") is not None and c["delta_pct"] >= 40 and c["delta"] >= 150:
                savings_hints.append(
                    {
                        "code": "surge_cut",
                        "category_name": c["name"],
                        "title": f"「{c['name']}」增长较快",
                        "detail": f"较{compare_period['label']}增加 ¥{c['delta']:.2f}，建议先砍非必要项。",
                        "estimate_save": round(c["delta"] * 0.3, 2),
                    }
                )

    for b in budget_items:
        if b["ratio"] >= 0.85:
            savings_hints.append(
                {
                    "code": "budget_pace",
                    "category_name": b["category_name"],
                    "title": f"放慢「{b['category_name']}」支出",
                    "detail": f"预算进度 {b['ratio'] * 100:.0f}%，剩余 ¥{b['remaining']:.2f}。",
                    "estimate_save": max(0.0, -b["remaining"]) if b["ratio"] >= 1 else round(b["spent"] * 0.05, 2),
                }
            )

    biz_note = None
    if scope == "business":
        profit = income - expense
        margin = (profit / income) if income > 0 else None
        cost_ratio = (expense / income) if income > 0 else None
        biz_note = {
            "profit": round(profit, 2),
            "margin": round(margin * 100, 1) if margin is not None else None,
            "cost_ratio": round(cost_ratio * 100, 1) if cost_ratio is not None else None,
        }
        if profit < 0:
            savings_hints.append(
                {
                    "code": "biz_loss",
                    "category_name": "",
                    "title": "经营毛利为负",
                    "detail": "建议核对进货与订阅类固定成本，优先处理高费用项。",
                    "estimate_save": round(abs(profit) * 0.2, 2),
                }
            )
        elif cost_ratio is not None and cost_ratio > 0.85:
            savings_hints.append(
                {
                    "code": "biz_cost",
                    "category_name": "",
                    "title": "经营费用率偏高",
                    "detail": f"费用约占收入 {cost_ratio * 100:.0f}%，可梳理高频进货与固定订阅。",
                    "estimate_save": round(expense * 0.08, 2),
                }
            )
        elif margin is not None and margin < 0.15 and income > 0:
            savings_hints.append(
                {
                    "code": "biz_margin",
                    "category_name": "",
                    "title": "毛利率偏低",
                    "detail": f"当前毛利率约 {margin * 100:.1f}%，可检查定价或成本结构。",
                    "estimate_save": round(income * 0.05, 2),
                }
            )

    if kind == "expense" and not savings_hints and focus_curr > 0:
        savings_hints.append(
            {
                "code": "keep_going",
                "category_name": "",
                "title": "结构整体平稳",
                "detail": "继续保持分类记账，月底对照预算会更从容。",
                "estimate_save": 0,
            }
        )

    # 去重同类异常，最多各保留若干
    anomalies = anomalies[:12]
    # savings 去重同 code+category
    seen_hint = set()
    unique_hints = []
    for h in savings_hints:
        key = (h["code"], h.get("category_name") or "")
        if key in seen_hint:
            continue
        seen_hint.add(key)
        unique_hints.append(h)
    savings_hints = unique_hints[:8]

    summary_bits = []
    book_word = "经营" if scope == "business" else "生活"
    kind_word = "收入" if kind == "income" else "支出"
    summary_bits.append(
        f"{period['label']}{book_word}{kind_word}合计 ¥{focus_curr:.2f}"
        + (f"，结余 ¥{balance:.2f}" if scope == "life" else f"，毛利 ¥{balance:.2f}")
        + "。"
    )
    if categories:
        top = categories[0]
        summary_bits.append(
            f"「{top['name']}」占比最高（{top['pct']:.1f}% · ¥{top['value']:.2f}"
            + (f" · {top['count']} 笔" if top.get("count") else "")
            + "）。"
        )
        if len(categories) > 1:
            s = categories[1]
            summary_bits.append(f"其次是「{s['name']}」¥{s['value']:.2f}（{s['pct']:.1f}%）。")
    if members and members[0]["value"] > 0:
        summary_bits.append(f"记账人方面，{members[0]['display_name']} 本期{kind_word}最多。")
    if not is_year and kind == "expense" and avg_day > 0:
        summary_bits.append(f"日均支出约 ¥{avg_day:.2f}。")

    return {
        "period": period,
        "compare_period": compare_period,
        "scope": scope,
        "kind": kind,
        "totals": totals,
        "categories": categories,
        "members": members,
        "anomalies": anomalies,
        "savings_hints": savings_hints,
        "budget": {"items": budget_items},
        "daily": {"avg": round(avg_day, 2), "days": daily} if not is_year else None,
        "business": biz_note,
        "summary_text": "".join(summary_bits),
    }


@app.get("/api/v1/budgets")
def list_budgets(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now()
    year = year or now.year
    month = month or now.month
    rows = (
        db.query(Budget)
        .filter(Budget.household_id == user.household_id, Budget.year == year, Budget.month == month)
        .all()
    )
    return [
        {
            "id": b.id,
            "year": b.year,
            "month": b.month,
            "amount": b.amount,
            "category_id": b.category_id,
            "ledger_id": b.ledger_id,
        }
        for b in rows
    ]


@app.post("/api/v1/budgets")
def upsert_budget(body: BudgetIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role == "viewer":
        raise HTTPException(403, "只读")
    existing = (
        db.query(Budget)
        .filter(
            Budget.household_id == user.household_id,
            Budget.year == body.year,
            Budget.month == body.month,
            Budget.category_id == body.category_id,
            Budget.ledger_id == body.ledger_id,
        )
        .one_or_none()
    )
    if existing:
        existing.amount = body.amount
        db.commit()
        return {"id": existing.id, "amount": existing.amount}
    b = Budget(
        household_id=user.household_id,
        year=body.year,
        month=body.month,
        amount=body.amount,
        category_id=body.category_id,
        ledger_id=body.ledger_id,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"id": b.id, "amount": b.amount}


@app.post("/api/v1/tokens")
def create_token(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "owner":
        raise HTTPException(403, "只有家长可以签发 OpenClaw Token")
    raw = "ln_" + secrets.token_urlsafe(32)
    row = ApiToken(
        user_id=user.id,
        name="OpenClaw",
        token_hash=hash_api_token(raw),
        prefix=raw[:10],
    )
    db.add(row)
    db.commit()
    return {"token": raw, "prefix": row.prefix, "hint": "请立刻复制，服务器只保存哈希"}


@app.get("/api/v1/tokens")
def list_tokens(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.query(ApiToken).filter(ApiToken.user_id == user.id).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "prefix": r.prefix,
            "created_at": r.created_at.isoformat(),
            "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
        }
        for r in rows
    ]


def _resolve_member(db: Session, household_id: int, wechat_alias: str | None, username: str | None, fallback: User) -> User:
    if username:
        u = db.query(User).filter(User.household_id == household_id, User.username == username).one_or_none()
        if u:
            return u
    if wechat_alias:
        u = (
            db.query(User)
            .filter(User.household_id == household_id, User.wechat_alias == wechat_alias)
            .one_or_none()
        )
        if u:
            return u
        u = (
            db.query(User)
            .filter(User.household_id == household_id, User.display_name == wechat_alias)
            .one_or_none()
        )
        if u:
            return u
    return fallback


def _pick_ledger(db: Session, actor: User, hint: str | None) -> Ledger:
    hid = actor.household_id
    hint = hint or "personal"
    if hint == "family":
        return db.query(Ledger).filter(Ledger.household_id == hid, Ledger.type == "family").one()
    if hint == "business":
        row = (
            db.query(Ledger)
            .filter(Ledger.household_id == hid, Ledger.type == "business")
            .first()
        )
        if not row:
            raise HTTPException(400, "尚未创建经营账本")
        return row
    row = (
        db.query(Ledger)
        .filter(Ledger.household_id == hid, Ledger.type == "personal", Ledger.owner_user_id == actor.id)
        .one_or_none()
    )
    if not row:
        raise HTTPException(400, "该成员没有个人账本")
    return row


def _pick_account(db: Session, actor: User, ledger: Ledger) -> Account:
    if ledger.type == "business":
        acc = (
            db.query(Account)
            .filter(Account.household_id == actor.household_id, Account.kind == "business")
            .first()
        )
        if acc:
            return acc
    acc = (
        db.query(Account)
        .filter(Account.household_id == actor.household_id, Account.owner_user_id == actor.id)
        .first()
    )
    if acc:
        return acc
    return db.query(Account).filter(Account.household_id == actor.household_id).first()


def _write_parsed(
    db: Session,
    token_user: User,
    actor: User,
    item,
    source: str,
    raw_text: str,
) -> Transaction:
    ledger = _pick_ledger(db, actor, item.ledger_hint)
    cats = (
        db.query(Category)
        .filter(Category.household_id == actor.household_id, Category.ledger_type == ledger.type)
        .all()
    )
    cat = match_category(cats, item.category_hint or item.note, item.tx_type)
    acc = _pick_account(db, actor, ledger)
    tx = Transaction(
        household_id=actor.household_id,
        ledger_id=ledger.id,
        user_id=actor.id,
        account_id=acc.id,
        category_id=cat.id,
        type=item.tx_type,
        amount=round(item.amount, 2),
        occurred_at=item.occurred_at or datetime.now(),
        note=item.note,
        source=source,
        raw_text=raw_text,
    )
    db.add(tx)
    db.flush()
    return tx


@app.post("/api/v1/ai/ingest")
def ai_ingest(body: IngestIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    actor = _resolve_member(db, user.household_id, body.wechat_alias, body.member_username, user)
    parsed = parse_bookkeeping(body.text)
    log = AiLog(
        household_id=user.household_id,
        user_id=actor.id,
        raw_text=body.text,
        result_json=json.dumps(
            [
                {
                    "amount": i.amount,
                    "type": i.tx_type,
                    "ledger": i.ledger_hint,
                    "note": i.note,
                }
                for i in parsed.items
            ],
            ensure_ascii=False,
        ),
        status="dry_run" if body.dry_run else ("ok" if parsed.items else "unparsed"),
    )
    db.add(log)
    created = []
    if not body.dry_run:
        for item in parsed.items:
            created.append(_write_parsed(db, user, actor, item, "ai_wechat", body.text))
    db.commit()
    book_label = {"personal": "个人账本", "family": "家庭账本", "business": "经营账本"}
    replies = []
    for item in parsed.items:
        kind = "收入" if item.tx_type == "income" else "支出"
        book = book_label.get(item.ledger_hint or "personal", "个人账本")
        replies.append(f"已记{kind} ¥{item.amount:.2f} → {book}（{item.note}）")
    if not parsed.items:
        replies.append("没听清金额～可以再说一遍，例如「午餐花了 35」。")
    return {
        "ok": bool(parsed.items),
        "dry_run": body.dry_run,
        "member": actor.display_name,
        "warnings": parsed.warnings,
        "reply": "\n".join(replies),
        "items": [
            {
                "amount": i.amount,
                "type": i.tx_type,
                "ledger": i.ledger_hint or "personal",
                "note": i.note,
            }
            for i in parsed.items
        ],
        "transactions": [tx_out(t, db) for t in created],
    }


@app.post("/api/v1/ai/transactions")
def ai_structured(body: StructuredTxIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    actor = _resolve_member(db, user.household_id, body.wechat_alias, body.member_username, user)

    class Item:
        amount = body.amount
        note = body.note or body.category or "微信记账"
        tx_type = body.type
        ledger_hint = body.ledger
        category_hint = body.category or body.note
        occurred_at = body.occurred_at or datetime.now()

    tx = _write_parsed(db, user, actor, Item(), "ai_wechat", body.note)
    db.add(
        AiLog(
            household_id=user.household_id,
            user_id=actor.id,
            raw_text=body.note,
            result_json=json.dumps(body.model_dump(), ensure_ascii=False, default=str),
            status="ok",
        )
    )
    db.commit()
    db.refresh(tx)
    book = {"personal": "个人账本", "family": "家庭账本", "business": "经营账本"}[body.ledger]
    kind = "收入" if body.type == "income" else "支出"
    return {
        "ok": True,
        "reply": f"已记{kind} ¥{body.amount:.2f} → {book}（{Item.note}）",
        "transaction": tx_out(tx, db),
    }


def require_owner(user: User) -> User:
    if user.role != "owner":
        raise HTTPException(403, "仅家长可操作")
    return user


@app.get("/api/v1/backup-config")
def get_backup_config(user: User = Depends(current_user)):
    require_owner(user)
    return load_config()


@app.put("/api/v1/backup-config")
def put_backup_config(body: BackupConfigIn, user: User = Depends(current_user)):
    require_owner(user)
    if body.frequency not in ("daily", "weekly"):
        raise HTTPException(400, "frequency 只能是 daily 或 weekly")
    cfg = save_config(body.model_dump())
    refresh_backup_schedule()
    return cfg


@app.get("/api/v1/backups")
def get_backups(user: User = Depends(current_user)):
    require_owner(user)
    return {"items": list_backups(), "config": load_config()}


@app.post("/api/v1/backups")
def post_backup(user: User = Depends(current_user)):
    require_owner(user)
    item = create_backup(note="manual")
    return item


@app.get("/api/v1/backups/{filename}/download")
def download_backup(filename: str, user: User = Depends(current_user)):
    require_owner(user)
    try:
        path = backup_path(filename)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(404, str(e)) from e
    return FileResponse(path, filename=filename, media_type="application/zip")


@app.delete("/api/v1/backups/{filename}")
def remove_backup(filename: str, user: User = Depends(current_user)):
    require_owner(user)
    try:
        delete_backup(filename)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(404, str(e)) from e
    return {"ok": True}


@app.post("/api/v1/backups/{filename}/restore")
def restore_backup_api(filename: str, user: User = Depends(current_user)):
    require_owner(user)
    try:
        restore_backup(filename)
        dispose_engine()
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(400, str(e)) from e
    return {"ok": True, "hint": "数据已恢复，建议执行 docker compose restart luckynote 以确保连接刷新"}


@app.get("/api/v1/ai/logs")
def ai_logs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "owner":
        raise HTTPException(403, "仅家长可查看")
    rows = (
        db.query(AiLog)
        .filter(AiLog.household_id == user.household_id)
        .order_by(AiLog.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": r.id,
            "raw_text": r.raw_text,
            "result_json": r.result_json,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@app.get("/api/health")
def health():
    return {"ok": True, "name": "LuckyNote"}


from pathlib import Path

static_dir = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="ui")
