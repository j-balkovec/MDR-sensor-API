# Jakob Balkovec
# Fri Nov 28th
# models.py

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.session import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    dev_eui = Column(String, index=True)  # Device EUI
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    raw_value = Column(Integer, nullable=False)
    moisture_pct = Column(Float, nullable=False)
