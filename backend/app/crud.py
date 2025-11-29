# Jakob Balkovec
# Fri Nov 28th
# crud.py

# Jakob Balkovec
# Updated Device CRUD (metadata support)
# crud.py

from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.models import SensorReading, Device, DeviceStatus
from app.db.device_schema import DeviceCreate

# -----------------------------
#   SENSOR READING FUNCTIONS
# -----------------------------
def store_sensor_reading(
    db: Session,
    *,
    dev_eui: str,
    timestamp,
    raw_value: int,
    moisture_pct: float,
    latitude: float = None,
    longitude: float = None,
):
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


# -----------------------------
#   DEVICE FUNCTIONS
# -----------------------------
def create_device(db: Session, payload: dict):
    dev_eui = payload.get("dev_eui")
    if not dev_eui:
        return None

    exists = db.query(Device).filter(Device.dev_eui == dev_eui).first()
    if exists:
        return exists

    dev = Device(
        dev_eui=dev_eui,
        nickname=payload.get("nickname") or dev_eui,
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
        installation_date=payload.get("installation_date"),
        status=payload.get("status") or DeviceStatus.active,
        notes=payload.get("notes"),
    )

    db.add(dev)
    db.commit()
    db.refresh(dev)
    return dev


def get_device_by_eui(db: Session, dev_eui: str):
    return db.query(Device).filter(Device.dev_eui == dev_eui).first()


def delete_device_by_eui(db: Session, dev_eui: str):
    dev = get_device_by_eui(db, dev_eui)
    if not dev:
        return False
    db.delete(dev)
    db.commit()
    return True


def create_device_if_missing(db: Session, dev_eui: str):
    dev = get_device_by_eui(db, dev_eui)
    if dev:
        return dev

    dev = Device(
        dev_eui=dev_eui,
        nickname=dev_eui,
        status=DeviceStatus.active
    )

    db.add(dev)
    db.commit()
    db.refresh(dev)
    print(f"[DEVICE] Auto-registered device {dev_eui}")
    return dev


def create_device(db: Session, device: DeviceCreate):
    payload = device.model_dump()

    dev = Device(
        dev_eui=payload["dev_eui"],
        nickname=payload.get("nickname") or payload["dev_eui"],
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
        installation_date=payload.get("installation_date"),

        status=DeviceStatus(payload.get("status") or "active"),
        notes=payload.get("notes"),
    )

    db.add(dev)
    db.commit()
    db.refresh(dev)
    return dev



def update_device(db: Session, dev_eui: str, data: dict):
    dev = db.query(Device).filter(Device.dev_eui == dev_eui).first()
    if not dev:
        return None

    for key, value in data.items():
        setattr(dev, key, value)

    db.commit()
    db.refresh(dev)
    return dev


def delete_device(db: Session, dev_eui: str):
    dev = db.query(Device).filter(Device.dev_eui == dev_eui).first()
    if not dev:
        return False

    db.delete(dev)
    db.commit()
    return True


def list_registered_devices(db: Session):
    return [d.dev_eui for d in db.query(Device).all()]


def list_all_devices(db: Session):
    devices = db.query(Device).all()
    return [
        {
            "dev_eui": d.dev_eui,
            "nickname": d.nickname,
            "latitude": d.latitude,
            "longitude": d.longitude,
            "status": d.status.value if d.status else "active",
            "notes": d.notes,
        }
        for d in devices
    ]


def ensure_device(db: Session, dev_eui: str):
    device = db.query(Device).filter(Device.dev_eui == dev_eui).first()
    if device:
        return device

    device = Device(
        dev_eui=dev_eui,
        nickname=dev_eui,
        status=DeviceStatus.active,
        installation_date=datetime.utcnow(),
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    print(f"[DEVICE] Auto-registered {dev_eui}")
    return device



