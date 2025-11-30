# app/routers/devices.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.security import require_admin
from app.db.session import get_db
from app.crud import (
    create_device,
    delete_device_by_eui,
    get_device_by_eui,
    list_all_devices,
)
from app.db.device_schema import DeviceCreate, DeviceOut

router = APIRouter(prefix="/api", tags=["Devices"])


# Create Device (admin only)
@router.post(
    "/device",
    response_model=DeviceOut,
    dependencies=[Depends(require_admin)]
)
def add_device(device: DeviceCreate, db: Session = Depends(get_db)):
    existing = get_device_by_eui(db, device.dev_eui)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device already exists",
        )

    return create_device(db, device.dict())


# Delete Device (admin only)
@router.delete(
    "/device/{dev_eui}",
    status_code=204,
    dependencies=[Depends(require_admin)]
)
def remove_device(dev_eui: str, db: Session = Depends(get_db)):
    ok = delete_device_by_eui(db, dev_eui)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )
    return None


# List Devices (public)
@router.get("/devices", response_model=list[DeviceOut])
def list_devices(db: Session = Depends(get_db)):
    return list_all_devices(db)
