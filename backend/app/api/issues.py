"""问题工单 CRUD。"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.user import User
from app.models.issue import Issue
from app.schemas.common import Page
from app.schemas.issue import IssueCreate, IssueOut, IssueUpdate

router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=Page[IssueOut])
def list_issues(
    status: str | None = Query(None),
    category: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(Issue)
    if status:
        q = q.filter(Issue.status == status)
    if category:
        q = q.filter(Issue.category == category)
    total = q.count()
    items = q.order_by(Issue.created_at.desc()).offset(offset).limit(limit).all()
    return Page(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=IssueOut, status_code=201)
def create_issue(
    payload: IssueCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    issue = Issue(**payload.model_dump())
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


@router.patch("/{issue_id}", response_model=IssueOut)
def update_issue(
    issue_id: int,
    payload: IssueUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "工单不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(issue, k, v)
    if payload.status == "closed" and issue.resolved_at is None:
        issue.resolved_at = datetime.now()
    elif payload.status == "open":
        issue.resolved_at = None
    db.commit()
    db.refresh(issue)
    return issue


@router.delete("/{issue_id}", status_code=204)
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise HTTPException(404, "工单不存在")
    db.delete(issue)
    db.commit()
