# Jakob Balkovec
# Fri Nov 28th
# config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    # MQTT
    MQTT_BROKER: str = "mqtt.loralab.org"
    MQTT_PORT: int = 1883
    MQTT_TOPIC: str = "application/soilmoisture/device/+/rx"

    # DB
    DATABASE_URL: str = "sqlite:///./mdr_api.db"

    # Calibration
    # WET: 10660, 10661, 10656, 10651, 10652 | avg = 10656
    # DRY: 12382, 12354, 12352, 12332, 12402 | avg = 12364
    DRY_VALUE: int = 12364
    WET_VALUE: int = 10656

    # WebSocket Authentication (dashboard)
    WS_API_KEY: str = "unauthorized"

    # Admin Key (for device CRUD – temporary during transition)
    ADMIN_API_KEY: str = "change-this-now"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    ADMIN_EMAILS: str = ""  # comma-separated string list

    # Future JWT support
    SECRET_KEY: str = "CHANGE_ME_NOW"
    TOKEN_EXPIRE_MINUTES: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")



@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()

# Export constants
MQTT_BROKER = settings.MQTT_BROKER
MQTT_PORT = settings.MQTT_PORT
MQTT_TOPIC = settings.MQTT_TOPIC

DATABASE_URL = settings.DATABASE_URL

DRY_VALUE = settings.DRY_VALUE
WET_VALUE = settings.WET_VALUE

WS_API_KEY = settings.WS_API_KEY
ADMIN_API_KEY = settings.ADMIN_API_KEY
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID

# Parse comma-separated admin list -> Python list
ADMIN_EMAILS = [
    e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()
]

def compute_moisture_pct(raw_value: int) -> float:
    if raw_value is None:
        return 0.0

    pct = (raw_value - DRY_VALUE) / (WET_VALUE - DRY_VALUE)
    pct = max(0.0, min(1.0, pct))
    return round(pct * 100, 2)
