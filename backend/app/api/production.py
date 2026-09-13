"""产量记录 + 品类 CRUD。"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.product import ProductCategory
from app.models.production_log import ProductionLog
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.schemas.production_log import (
    ProductionLogCreate,
    ProductionLogOut,
    ProductionLogUpdate,
)

# ---- 品类 ----
cat_router = APIRouter(prefix="/products", tags=["products"])


@cat_router.get("", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(ProductCategory).order_by(ProductCategory.id).all()


@cat_router.post("", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    p = ProductCategory(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@cat_router.patch("/{pid}", response_model=ProductOut)
def update_product(pid: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    p = db.get(ProductCategory, pid)
    if not p:
        raise HTTPException(404, "product not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@cat_router.delete("/{pid}", status_code=204)
def delete_product(pid: int, db: Session = Depends(get_db)):
    p = db.get(ProductCategory, pid)
    if not p:
        raise HTTPException(404, "product not found")
    db.delete(p)
    db.commit()


# ---- 产量记录 ----
log_router = APIRouter(prefix="/production-logs", tags=["production-logs"])


@log_router.get("", response_model=list[ProductionLogOut])
def list_production_logs(
    start: date | None = Query(None),
    end: date | None = Query(None),
    category_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(ProductionLog)
    if start:
        q = q.filter(ProductionLog.date >= start)
    if end:
        q = q.filter(ProductionLog.date <= end)
    if category_id:
        q = q.filter(ProductionLog.category_id == category_id)
    return q.order_by(ProductionLog.date.desc(), ProductionLog.id).all()


@log_router.post("", response_model=ProductionLogOut, status_code=201)
def create_production_log(payload: ProductionLogCreate, db: Session = Depends(get_db)):
    log = ProductionLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@log_router.patch("/{log_id}", response_model=ProductionLogOut)
def update_production_log(log_id: int, payload: ProductionLogUpdate, db: Session = Depends(get_db)):
    log = db.get(ProductionLog, log_id)
    if not log:
        raise HTTPException(404, "production log not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return log


@log_router.delete("/{log_id}", status_code=204)
def delete_production_log(log_id: int, db: Session = Depends(get_db)):
    log = db.get(ProductionLog, log_id)
    if not log:
        raise HTTPException(404, "production log not found")
    db.delete(log)
    db.commit()
