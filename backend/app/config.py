# Jakob Balkovec
# Fri Nov 28th
# config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # MQTT
    MQTT_BROKER: str = "127.0.0.1" # mqtt.loralab.org
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "sensor/moisture" # "application/soilmoisture/device/+/rx"

    # DB
    DATABASE_URL: str = "sqlite:///./mdr_api.db"

    # Calibration
    DRY_VALUE: int = 4000
    WET_VALUE: int = 8000

    # WebSocket Authentication
    WS_API_KEY: str = "unauthorized"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

MQTT_BROKER = settings.MQTT_BROKER
MQTT_PORT = settings.MQTT_PORT
MQTT_TOPIC = settings.MQTT_TOPIC
DATABASE_URL = settings.DATABASE_URL

DRY_VALUE = settings.DRY_VALUE
WET_VALUE = settings.WET_VALUE

WS_API_KEY = settings.WS_API_KEY


def compute_moisture_pct(raw_value: int) -> float:
    if raw_value is None:
        return 0.0

    pct = (raw_value - DRY_VALUE) / (WET_VALUE - DRY_VALUE)
    pct = max(0.0, min(1.0, pct))  # clamp to [0, 1]
    return round(pct * 100, 2)
