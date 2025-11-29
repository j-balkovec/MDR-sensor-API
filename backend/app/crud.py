# Jakob Balkovec
# Fri Nov 28th
# crud.py

from sqlalchemy.orm import Session
from app.db.models import SensorReading

def store_sensor_reading(db: Session, *, dev_eui: str, timestamp, raw_value: int,
                         moisture_pct: float, latitude: float = None, longitude: float = None):

    reading = SensorReading(
        dev_eui=dev_eui,
        timestamp=timestamp,
        raw_value=raw_value,
        moisture_pct=moisture_pct,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


def get_latest_reading(db: Session, dev_eui: str):
    return (
        db.query(SensorReading)
        .filter(SensorReading.dev_eui == dev_eui)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )


def get_recent_readings(db: Session, dev_eui: str, limit: int = 100):
    return (
        db.query(SensorReading)
        .filter(SensorReading.dev_eui == dev_eui)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )


def list_devices(db: Session):
    devs = db.query(SensorReading.dev_eui).distinct().all()
    return [d[0] for d in devs if d[0]]
