# Jakob Balkovec
# Fri Nov 28th
# schemas.py

from pydantic import BaseModel

class SensorIn(BaseModel):
    dev_eui: str
    timestamp: int
    latitude: float | None = None
    longitude: float | None = None
    raw_value: int
    moisture_pct: float
