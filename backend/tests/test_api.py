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
