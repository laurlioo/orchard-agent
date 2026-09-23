"""产量记录 + 品类 CRUD。"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_orchard
from app.core.security import require_admin
from app.models.user import User
from app.models.product import ProductCategory
from app.models.production_log import ProductionLog
from app.schemas.common import Page
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.schemas.production_log import (
    ProductionLogCreate,
    ProductionLogOut,
    ProductionLogUpdate,
)

cat_router = APIRouter(prefix="/products", tags=["products"])


@cat_router.get("", response_model=list[ProductOut])
def list_products(
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
):
    return db.query(ProductCategory).filter(ProductCategory.orchard == orchard).order_by(ProductCategory.id).all()


@cat_router.post("", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    data = payload.model_dump()
    data["orchard"] = orchard
    p = ProductCategory(**data)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@cat_router.patch("/{pid}", response_model=ProductOut)
def update_product(
    pid: int,
    payload: ProductUpdate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    p = db.query(ProductCategory).filter(ProductCategory.id == pid, ProductCategory.orchard == orchard).first()
    if not p:
        raise HTTPException(404, "品类不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@cat_router.delete("/{pid}", status_code=204)
def delete_product(
    pid: int,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    p = db.query(ProductCategory).filter(ProductCategory.id == pid, ProductCategory.orchard == orchard).first()
    if not p:
        raise HTTPException(404, "品类不存在")
    n = db.query(ProductionLog).filter(ProductionLog.category_id == pid).count()
    if n:
        raise HTTPException(400, f"该品类还有 {n} 条产量记录，无法删除")
    db.delete(p)
    db.commit()


log_router = APIRouter(prefix="/production-logs", tags=["production-logs"])


@log_router.get("", response_model=Page[ProductionLogOut])
def list_production_logs(
    start: date | None = Query(None),
    end: date | None = Query(None),
    category_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
):
    q = db.query(ProductionLog).options(joinedload(ProductionLog.category))
    q = q.filter(ProductionLog.orchard == orchard)
    if start:
        q = q.filter(ProductionLog.date >= start)
    if end:
        q = q.filter(ProductionLog.date <= end)
    if category_id:
        q = q.filter(ProductionLog.category_id == category_id)
    total = q.count()
    items = q.order_by(ProductionLog.date.desc(), ProductionLog.id).offset(offset).limit(limit).all()
    return Page(items=items, total=total, limit=limit, offset=offset)


@log_router.post("", response_model=ProductionLogOut, status_code=201)
def create_production_log(
    payload: ProductionLogCreate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    cat = db.query(ProductCategory).filter(
        ProductCategory.id == payload.category_id, ProductCategory.orchard == orchard
    ).first()
    if not cat:
        raise HTTPException(404, "品类不存在")
    exists = (
        db.query(ProductionLog)
        .filter(ProductionLog.category_id == payload.category_id, ProductionLog.date == payload.date)
        .first()
    )
    if exists:
        raise HTTPException(400, "该品类当日已有产量，请直接编辑原记录")
    data = payload.model_dump()
    if not data.get("unit_price"):
        data["unit_price"] = cat.unit_price
    data["orchard"] = orchard
    log = ProductionLog(**data)
    db.add(log)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "该品类当日已有产量，请直接编辑原记录")
    db.refresh(log)
    return log


@log_router.patch("/{log_id}", response_model=ProductionLogOut)
def update_production_log(
    log_id: int,
    payload: ProductionLogUpdate,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    log = db.query(ProductionLog).filter(ProductionLog.id == log_id, ProductionLog.orchard == orchard).first()
    if not log:
        raise HTTPException(404, "产量记录不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(log, k, v)
    db.commit()
    db.refresh(log)
    return log


@log_router.delete("/{log_id}", status_code=204)
def delete_production_log(
    log_id: int,
    orchard: str = Depends(get_orchard),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    log = db.query(ProductionLog).filter(ProductionLog.id == log_id, ProductionLog.orchard == orchard).first()
    if not log:
        raise HTTPException(404, "产量记录不存在")
    db.delete(log)
    db.commit()
