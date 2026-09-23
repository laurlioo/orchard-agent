"""工时记录 CRUD，支持按日期范围查询。"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_orchard
from app.core.security import require_admin
from app.models.user import User
from app.models.work_log import WorkLog
from app.models.worker import Worker
from app.schemas.common import Page
from app.schemas.work_log import WorkLogCreate, WorkLogUpdate, WorkLogOut

router = APIRouter(prefix="/worklogs", tags=["worklogs"])


@router.get("", response_model=Page[WorkLogOut])
def list_worklogs(
    request: Request,
    start: date | None = Query(None),
    end: date | None = Query(None),
    worker_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
):
    q = db.query(WorkLog).options(joinedload(WorkLog.worker))
    if getattr(request.state, "user_role", "") == "worker":
        worker_id = request.state.user_id
    else:
        q = q.filter(WorkLog.orchard == orchard)
    if start:
        q = q.filter(WorkLog.date >= start)
    if end:
        q = q.filter(WorkLog.date <= end)
    if worker_id:
        q = q.filter(WorkLog.worker_id == worker_id)
    total = q.count()
    items = q.order_by(WorkLog.date.desc(), WorkLog.id).offset(offset).limit(limit).all()
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=WorkLogOut, status_code=201)
def create_worklog(
    payload: WorkLogCreate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    worker = db.get(Worker, payload.worker_id)
    if not worker:
        raise HTTPException(404, "工人不存在")
    if worker.orchard != orchard:
        raise HTTPException(404, "工人不存在")
    exists = (
        db.query(WorkLog)
        .filter(WorkLog.worker_id == payload.worker_id, WorkLog.date == payload.date)
        .first()
    )
    if exists:
        raise HTTPException(400, "该工人当日已有工时，请直接编辑原记录")
    data = payload.model_dump()
    data["hourly_rate"] = worker.hourly_rate
    data["overtime_rate"] = worker.overtime_rate
    data["orchard"] = orchard
    log = WorkLog(**data)
    db.add(log)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "该工人当日已有工时，请直接编辑原记录")
    db.refresh(log)
    return log


@router.patch("/{log_id}", response_model=WorkLogOut)
def update_worklog(
    log_id: int,
    payload: WorkLogUpdate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    log = db.query(WorkLog).filter(WorkLog.id == log_id, WorkLog.orchard == orchard).first()
    if not log:
        raise HTTPException(404, "工时记录不存在")
    updates = payload.model_dump(exclude_unset=True)
    hours = updates.get("hours", log.hours)
    ot = updates.get("overtime_hours", log.overtime_hours)
    total = (hours or 0) + (ot or 0)
    if total <= 0:
        raise HTTPException(400, "正常工时和加班工时不能都为 0")
    if total > 24:
        raise HTTPException(400, "正常工时和加班工时合计不能超过 24 小时")
    for k, v in updates.items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_worklog(
    log_id: int,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    log = db.query(WorkLog).filter(WorkLog.id == log_id, WorkLog.orchard == orchard).first()
    if not log:
        raise HTTPException(404, "工时记录不存在")
    db.delete(log)
    db.commit()
