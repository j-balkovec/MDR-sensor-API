# app/routers/readings.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import get_recent_readings

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv
from io import StringIO

router = APIRouter(prefix="/api", tags=["Readings"])


@router.get("/readings/{dev_eui}")
def recent_readings(dev_eui: str, limit: int = 100, db: Session = Depends(get_db)):
    rows = get_recent_readings(db, dev_eui, limit)
    return rows

@router.get("/api/export/{dev_eui}")
async def export_csv(dev_eui: str, db: Session = Depends(get_db)):
    rows = db.execute("""
        SELECT timestamp, moisture_pct, raw_value
        FROM readings
        WHERE dev_eui = :dev
        ORDER BY timestamp ASC
    """, {"dev": dev_eui}).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "moisture_pct", "raw_value"])
    for r in rows:
        writer.writerow([r.timestamp, r.moisture_pct, r.raw_value])

    output.seek(0)
    filename = f"{dev_eui}_readings.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
