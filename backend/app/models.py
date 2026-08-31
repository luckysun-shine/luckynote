from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Role(str, Enum):
    owner = "owner"
    member = "member"
    viewer = "viewer"


class LedgerType(str, Enum):
    personal = "personal"
    family = "family"
    business = "business"


class TxType(str, Enum):
    income = "income"
    expense = "expense"


class AccountKind(str, Enum):
    cash = "cash"
    bank = "bank"
    ewallet = "ewallet"
    credit = "credit"
    business = "business"


class Household(Base):
    __tablename__ = "households"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), default="暖窝一家")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="household")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(40))
    role: Mapped[str] = mapped_column(String(16), default=Role.member.value)
    avatar_color: Mapped[str] = mapped_column(String(16), default="#E07A5F")
    avatar_path: Mapped[str] = mapped_column(String(255), default="")
    wechat_alias: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    household: Mapped[Household] = relationship(back_populates="users")


class Ledger(Base):
    __tablename__ = "ledgers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(80))
    include_in_family: Mapped[bool] = mapped_column(Boolean, default=True)
    icon: Mapped[str] = mapped_column(String(32), default="📒")
    cover_path: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str] = mapped_column(String(200), default="")


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    owner_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(16), default=AccountKind.cash.value)
    opening_balance: Mapped[float] = mapped_column(Float, default=0)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    ledger_type: Mapped[str] = mapped_column(String(16), default=LedgerType.personal.value)
    kind: Mapped[str] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(40))
    icon: Mapped[str] = mapped_column(String(8), default="✨")
    color: Mapped[str] = mapped_column(String(16), default="#81B29A")
    aliases: Mapped[str] = mapped_column(String(255), default="")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    ledger_id: Mapped[int] = mapped_column(ForeignKey("ledgers.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    type: Mapped[str] = mapped_column(String(16))
    amount: Mapped[float] = mapped_column(Float)
    occurred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    note: Mapped[str] = mapped_column(String(200), default="")
    source: Mapped[str] = mapped_column(String(24), default="manual")
    raw_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    amount: Mapped[float] = mapped_column(Float)

    __table_args__ = (
        UniqueConstraint(
            "household_id", "ledger_id", "category_id", "year", "month", name="uq_budget"
        ),
    )


class ApiToken(Base):
    __tablename__ = "api_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(80), default="OpenClaw")
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    prefix: Mapped[str] = mapped_column(String(12))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AiLog(Base):
    __tablename__ = "ai_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text)
    result_json: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(24), default="ok")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
