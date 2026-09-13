"""工人 CRUD。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.worker import Worker
from app.schemas.worker import WorkerCreate, WorkerUpdate, WorkerOut

router = APIRouter(prefix="/workers", tags=["workers"])


@router.get("", response_model=list[WorkerOut])
def list_workers(active_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Worker)
    if active_only:
        q = q.filter(Worker.active == True)
    return q.order_by(Worker.id).all()


@router.post("", response_model=WorkerOut, status_code=201)
def create_worker(payload: WorkerCreate, db: Session = Depends(get_db)):
    w = Worker(**payload.model_dump())
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.patch("/{worker_id}", response_model=WorkerOut)
def update_worker(worker_id: int, payload: WorkerUpdate, db: Session = Depends(get_db)):
    w = db.get(Worker, worker_id)
    if not w:
        raise HTTPException(404, "worker not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(w, k, v)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/{worker_id}", status_code=204)
def delete_worker(worker_id: int, db: Session = Depends(get_db)):
    w = db.get(Worker, worker_id)
    if not w:
        raise HTTPException(404, "worker not found")
    db.delete(w)
    db.commit()
