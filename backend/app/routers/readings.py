# app/routers/readings.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import get_recent_readings

router = APIRouter(prefix="/api", tags=["Readings"])


@router.get("/readings/{dev_eui}")
def recent_readings(dev_eui: str, limit: int = 100, db: Session = Depends(get_db)):
    rows = get_recent_readings(db, dev_eui, limit)
    return rows
