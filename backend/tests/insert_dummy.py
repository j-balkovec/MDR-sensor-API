from app.db.session import get_db
from app.crud import store_sensor_reading
import datetime

db = next(get_db())

store_sensor_reading(
    db=db,
    dev_eui="f0a1b2c3d4e5f678",
    timestamp=datetime.datetime.utcnow(),
    latitude=None,
    longitude=None,
    raw_value=5000,
    moisture_pct=60.0,
)

db.close()
print("Inserted dummy device.")
