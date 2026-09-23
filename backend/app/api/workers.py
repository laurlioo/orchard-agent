"""工人 CRUD。"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_orchard
from app.core.security import require_admin
from app.models.user import User
from app.models.work_log import WorkLog
from app.models.worker import Worker
from app.schemas.common import Page
from app.schemas.worker import WorkerCreate, WorkerUpdate, WorkerOut

router = APIRouter(prefix="/workers", tags=["workers"])


@router.get("", response_model=Page[WorkerOut])
def list_workers(
    active_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
):
    q = db.query(Worker)
    q = q.filter(Worker.orchard == orchard)
    if active_only:
        q = q.filter(Worker.active == True)
    total = q.count()
    items = q.order_by(Worker.id).offset(offset).limit(limit).all()
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=WorkerOut, status_code=201)
def create_worker(
    payload: WorkerCreate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    data = payload.model_dump()
    data["orchard"] = orchard
    w = Worker(**data)
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.patch("/{worker_id}", response_model=WorkerOut)
def update_worker(
    worker_id: int,
    payload: WorkerUpdate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    w = db.query(Worker).filter(Worker.id == worker_id, Worker.orchard == orchard).first()
    if not w:
        raise HTTPException(404, "工人不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(w, k, v)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{worker_id}", status_code=204)
def delete_worker(
    worker_id: int,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    w = db.query(Worker).filter(Worker.id == worker_id, Worker.orchard == orchard).first()
    if not w:
        raise HTTPException(404, "工人不存在")
    n = db.query(WorkLog).filter(WorkLog.worker_id == worker_id).count()
    if n:
        raise HTTPException(400, f"该工人还有 {n} 条工时记录，请先删除或改为停用")
    db.delete(w)
    db.commit()
