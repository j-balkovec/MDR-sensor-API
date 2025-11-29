from pydantic import BaseModel
from typing import Optional

class DeviceBase(BaseModel):
    dev_eui: str
    nickname: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "active"
    notes: Optional[str] = None

class DeviceCreate(DeviceBase):
    pass

class DeviceOut(DeviceBase):
    class Config:
        orm_mode = True
