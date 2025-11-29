# Jakob Balkovec
# devices router with admin protection

from fastapi import APIRouter, Depends, HTTPException, status
from app.security import require_admin
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.db.models import Device
from app.db.device_schema import DeviceCreate, DeviceOut
from app.crud import create_device, delete_device_by_eui, get_device_by_eui

router = APIRouter(prefix="/api", tags=["Devices"])


@router.post("/device", response_model=DeviceOut, dependencies=[Depends(require_admin)])
def add_device(device: DeviceCreate, db: Session = Depends(get_db)):

    existing = get_device_by_eui(db, device.dev_eui)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device already exists"
        )

    new_dev = create_device(db, device)
    return new_dev


@router.delete("/device/{dev_eui}", status_code=204, dependencies=[Depends(require_admin)])
def delete_device(dev_eui: str, db: Session = Depends(get_db)):

    deleted = delete_device_by_eui(db, dev_eui)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    return None
