from __future__ import annotations

import logging
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .backup import create_backup, load_config, save_config

logger = logging.getLogger("luckynote.scheduler")

_scheduler: BackgroundScheduler | None = None


def _run_scheduled_backup() -> None:
    cfg = load_config()
    if not cfg.get("enabled"):
        return
    try:
        create_backup(note="scheduled")
        logger.info("scheduled backup completed")
    except Exception:
        logger.exception("scheduled backup failed")


def _build_trigger(cfg: dict[str, Any]) -> CronTrigger:
    hour = int(cfg.get("hour", 3))
    minute = int(cfg.get("minute", 0))
    if cfg.get("frequency") == "weekly":
        return CronTrigger(day_of_week=int(cfg.get("weekday", 0)), hour=hour, minute=minute)
    return CronTrigger(hour=hour, minute=minute)


def start_backup_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler
    _scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
    _scheduler.start()
    refresh_backup_schedule()
    return _scheduler


def refresh_backup_schedule() -> None:
    global _scheduler
    if not _scheduler or not _scheduler.running:
        return
    try:
        _scheduler.remove_job("luckynote_backup")
    except Exception:
        pass
    cfg = load_config()
    if not cfg.get("enabled"):
        return
    trigger = _build_trigger(cfg)
    _scheduler.add_job(_run_scheduled_backup, trigger=trigger, id="luckynote_backup", replace_existing=True)
    logger.info("backup schedule refreshed: %s %02d:%02d", cfg.get("frequency"), cfg.get("hour"), cfg.get("minute"))


def stop_backup_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
    _scheduler = None
