import os

os.environ.setdefault("LUCKYNOTE_DATA_DIR", "/tmp/luckynote-test")

from fastapi.testclient import TestClient

from backend.app.database import Base, engine
from backend.app.main import app


def setup_module():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_login_and_family_dashboard():
    with TestClient(app) as client:
        bad = client.post("/api/v1/auth/login", json={"username": "lin", "password": "nope"})
        assert bad.status_code == 400
        res = client.post("/api/v1/auth/login", json={"username": "lin", "password": "luckynote"})
        assert res.status_code == 200
        token = res.json()["token"]
        dash = client.get("/api/v1/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert dash.status_code == 200
        body = dash.json()
        assert body["family"]["income"] > 0
        assert "profit" in body["business"]
        ingest = client.post(
            "/api/v1/ai/ingest",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": "午餐花了 35，记我账上"},
        )
        assert ingest.status_code == 200
        assert ingest.json()["ok"] is True
        assert ingest.json()["items"][0]["amount"] == 35

        me_patch = client.patch(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"display_name": "小林测试"},
        )
        assert me_patch.status_code == 200
        assert me_patch.json()["display_name"] == "小林测试"

        pwd = client.post(
            "/api/v1/me/password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "luckynote", "new_password": "luckynote2"},
        )
        assert pwd.status_code == 200

        acc = client.post(
            "/api/v1/accounts",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "测试钱包", "kind": "cash", "opening_balance": 100},
        )
        assert acc.status_code == 200
        acc_id = acc.json()["id"]

        client.delete(f"/api/v1/accounts/{acc_id}", headers={"Authorization": f"Bearer {token}"})

        bk = client.post("/api/v1/backups", headers={"Authorization": f"Bearer {token}"})
        assert bk.status_code == 200
        assert bk.json()["filename"].endswith(".zip")

        cfg = client.put(
            "/api/v1/backup-config",
            headers={"Authorization": f"Bearer {token}"},
            json={"enabled": True, "frequency": "daily", "hour": 4, "minute": 0, "keep_count": 5},
        )
        assert cfg.status_code == 200

        lst = client.get("/api/v1/backups", headers={"Authorization": f"Bearer {token}"})
        assert lst.status_code == 200
        assert len(lst.json()["items"]) >= 1


def test_ledgers_and_avatar_upload():
    from io import BytesIO

    with TestClient(app) as client:
        res = client.post("/api/v1/auth/login", json={"username": "lin", "password": "luckynote"})
        if res.status_code != 200:
            res = client.post("/api/v1/auth/login", json={"username": "lin", "password": "luckynote2"})
        token = res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        ledgers = client.get("/api/v1/ledgers", headers=headers)
        assert ledgers.status_code == 200
        before = len(ledgers.json())

        created = client.post(
            "/api/v1/ledgers",
            headers=headers,
            json={
                "name": "测试账本",
                "type": "personal",
                "icon": "🎁",
                "description": "单元测试",
                "include_in_family": False,
            },
        )
        assert created.status_code == 200
        lid = created.json()["id"]
        assert created.json()["description"] == "单元测试"

        patched = client.patch(
            f"/api/v1/ledgers/{lid}",
            headers=headers,
            json={"name": "测试账本改", "description": "已改"},
        )
        assert patched.status_code == 200
        assert patched.json()["name"] == "测试账本改"

        png = BytesIO(
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
            b"\x00\x00\x00\x0cIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        cover = client.post(
            f"/api/v1/ledgers/{lid}/cover",
            headers=headers,
            files={"file": ("cover.png", png, "image/png")},
        )
        assert cover.status_code == 200
        assert cover.json()["cover_url"]

        avatar = client.post(
            "/api/v1/me/avatar",
            headers=headers,
            files={"file": ("avatar.png", png, "image/png")},
        )
        assert avatar.status_code == 200
        assert avatar.json()["avatar_url"]

        media = client.get(avatar.json()["avatar_url"])
        assert media.status_code == 200

        deleted = client.delete(f"/api/v1/ledgers/{lid}", headers=headers)
        assert deleted.status_code == 200

        # 清空流水后应能删除带关联资金账户的经营账本
        biz = next(l for l in client.get("/api/v1/ledgers", headers=headers).json() if l["type"] == "business")
        biz_id = biz["id"]
        biz_txs = client.get(f"/api/v1/transactions?ledger_id={biz_id}", headers=headers).json()
        for t in biz_txs:
            client.delete(f"/api/v1/transactions/{t['id']}", headers=headers)
        del_biz = client.delete(f"/api/v1/ledgers/{biz_id}", headers=headers)
        assert del_biz.status_code == 200, del_biz.text

        after = client.get("/api/v1/ledgers", headers=headers)
        assert len(after.json()) == before - 1  # 额外删除了种子经营账本


def test_transaction_patch_and_delete():
    with TestClient(app) as client:
        res = client.post("/api/v1/auth/login", json={"username": "lin", "password": "luckynote"})
        if res.status_code != 200:
            res = client.post("/api/v1/auth/login", json={"username": "lin", "password": "luckynote2"})
        token = res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        txs = client.get("/api/v1/transactions?limit=1", headers=headers)
        assert txs.status_code == 200
        tx = txs.json()[0]
        tx_id = tx["id"]

        patched = client.patch(
            f"/api/v1/transactions/{tx_id}",
            headers=headers,
            json={"amount": tx["amount"] + 1, "note": "测试改备注"},
        )
        assert patched.status_code == 200
        assert patched.json()["note"] == "测试改备注"

        username_patch = client.patch(
            "/api/v1/me",
            headers=headers,
            json={"username": "lin_edited"},
        )
        assert username_patch.status_code == 200
        assert username_patch.json()["username"] == "lin_edited"
        client.patch("/api/v1/me", headers=headers, json={"username": "lin"})

        created = client.post(
            "/api/v1/transactions",
            headers=headers,
            json={
                "ledger_id": tx["ledger_id"],
                "account_id": tx["account_id"],
                "category_id": tx["category_id"],
                "type": "expense",
                "amount": 1.23,
                "note": "待删除",
            },
        )
        assert created.status_code == 200
        del_id = created.json()["id"]

        deleted = client.delete(f"/api/v1/transactions/{del_id}", headers=headers)
        assert deleted.status_code == 200

        yuan = client.post("/api/v1/auth/login", json={"username": "yuan", "password": "luckynote"})
        yuan_headers = {"Authorization": f"Bearer {yuan.json()["token"]}"}
        forbidden = client.patch(
            f"/api/v1/transactions/{tx_id}",
            headers=yuan_headers,
            json={"note": "越权"},
        )
        assert forbidden.status_code == 403
