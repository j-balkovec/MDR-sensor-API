# app/routers/devices.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.security import require_admin
from app.db.session import get_db
from app.crud import (
    create_device,
    delete_device,
    ensure_device,
    list_all_devices,
    get_recent_readings,
)
from app.db.device_schema import DeviceCreate, DeviceOut

router = APIRouter(prefix="/api", tags=["Devices"])


@router.post("/device", response_model=DeviceOut, dependencies=[Depends(require_admin)])
def add_device(device: DeviceCreate, db: Session = Depends(get_db)):
    new_dev = create_device(db, device.model_dump())
    return new_dev


@router.delete("/device/{dev_eui}", status_code=204, dependencies=[Depends(require_admin)])
def remove_device(dev_eui: str, db: Session = Depends(get_db)):
    ok = delete_device(db, dev_eui)
    if not ok:
        raise HTTPException(status_code=404, detail="Device not found")


@router.get("/devices", response_model=list[DeviceOut])
def list_devices(db: Session = Depends(get_db)):
    return list_all_devices(db)
