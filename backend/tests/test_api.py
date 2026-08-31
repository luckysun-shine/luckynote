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
