import zipfile

import pytest

from backend.app import backup


@pytest.fixture(autouse=True)
def isolated_backup(tmp_path, monkeypatch):
    monkeypatch.setattr(backup, "DATA_DIR", tmp_path)
    monkeypatch.setattr(backup, "DB_PATH", tmp_path / "luckynote.db")
    monkeypatch.setattr(backup, "BACKUP_DIR", tmp_path / "backups")
    monkeypatch.setattr(backup, "CONFIG_PATH", tmp_path / "backup-config.json")
    tmp_path.mkdir(parents=True, exist_ok=True)
    (tmp_path / "luckynote.db").write_bytes(b"sqlite-test-data")
    yield


def test_create_and_list_backup():
    item = backup.create_backup(note="test")
    assert item["filename"].endswith(".zip")
    items = backup.list_backups()
    assert len(items) == 1
    with zipfile.ZipFile(backup.BACKUP_DIR / item["filename"]) as zf:
        assert "luckynote.db" in zf.namelist()


def test_config_and_prune():
    backup.save_config({"enabled": True, "keep_count": 2})
    for _ in range(3):
        backup.create_backup(note="x")
    assert len(backup.list_backups()) == 2


def test_restore():
    created = backup.create_backup()
    (backup.DB_PATH).write_bytes(b"corrupted")
    backup.restore_backup(created["filename"])
    assert backup.DB_PATH.read_bytes() == b"sqlite-test-data"
