"""工资快照与报表聚合单测。"""
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.product import ProductCategory
from app.models.production_log import ProductionLog
from app.models.work_log import WorkLog
from app.models.worker import Worker
from app.services.report_builder import build_report
from app.services.wage_calculator import calc_wages, calc_total_wages


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_wages_use_snapshot_not_current_rate():
    db = _session()
    w = Worker(name="张三", role="采摘", hourly_rate=20, overtime_rate=1.5, active=True)
    db.add(w)
    db.commit()
    db.refresh(w)

    day = date(2026, 9, 1)
    db.add(
        WorkLog(
            worker_id=w.id,
            date=day,
            hours=8,
            overtime_hours=2,
            hourly_rate=20,
            overtime_rate=1.5,
        )
    )
    db.commit()

    w.hourly_rate = 40
    db.commit()

    rows = calc_wages(db, day, day)
    assert len(rows) == 1
    row = rows[0]
    assert row.hours == 8
    assert row.overtime_hours == 2
    assert row.regular_wage == 160  # 8 * 20，不是 8 * 40
    assert row.overtime_wage == 60  # 2 * 20 * 1.5
    assert row.wage == 220
    assert calc_total_wages(db, day, day) == 220


def test_build_report_aggregates_quantity_and_profit():
    db = _session()
    apple = ProductCategory(name="苹果", unit="斤", unit_price=10, cost_per_unit=4)
    db.add(apple)
    db.commit()
    db.refresh(apple)

    d1 = date(2026, 9, 1)
    d2 = date(2026, 9, 2)
    db.add_all(
        [
            ProductionLog(category_id=apple.id, date=d1, quantity=10, notes=""),
            ProductionLog(category_id=apple.id, date=d2, quantity=5, notes=""),
        ]
    )
    worker = Worker(name="李四", role="分拣", hourly_rate=15, overtime_rate=2, active=True)
    db.add(worker)
    db.commit()
    db.refresh(worker)
    db.add(
        WorkLog(
            worker_id=worker.id,
            date=d1,
            hours=4,
            overtime_hours=1,
            hourly_rate=15,
            overtime_rate=2,
        )
    )
    db.commit()

    report = build_report(db, d1, d2)
    assert report.total_quantity == 15
    assert report.total_revenue == 150
    assert report.total_cost == 60
    assert report.total_gross_profit == 90
    assert report.total_hours == 4
    assert report.total_overtime_hours == 1
    assert report.total_wages == 90  # 4*15 + 1*15*2
    assert report.categories[0].name == "苹果"
