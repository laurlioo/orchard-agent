"""工时记录 CRUD，支持按日期范围查询。"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.work_log import WorkLog
from app.schemas.work_log import WorkLogCreate, WorkLogUpdate, WorkLogOut

router = APIRouter(prefix="/worklogs", tags=["worklogs"])


@router.get("", response_model=list[WorkLogOut])
def list_worklogs(
    start: date | None = Query(None),
    end: date | None = Query(None),
    worker_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(WorkLog)
    if start:
        q = q.filter(WorkLog.date >= start)
    if end:
        q = q.filter(WorkLog.date <= end)
    if worker_id:
        q = q.filter(WorkLog.worker_id == worker_id)
    return q.order_by(WorkLog.date.desc(), WorkLog.id).all()


@router.post("", response_model=WorkLogOut, status_code=201)
def create_worklog(payload: WorkLogCreate, db: Session = Depends(get_db)):
    log = WorkLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.patch("/{log_id}", response_model=WorkLogOut)
def update_worklog(log_id: int, payload: WorkLogUpdate, db: Session = Depends(get_db)):
    log = db.get(WorkLog, log_id)
    if not log:
        raise HTTPException(404, "worklog not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_worklog(log_id: int, db: Session = Depends(get_db)):
    log = db.get(WorkLog, log_id)
    if not log:
        raise HTTPException(404, "worklog not found")
    db.delete(log)
    db.commit()
