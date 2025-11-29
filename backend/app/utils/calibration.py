# Jakob Balkovec
# Fri Nov 28th
# calibration.py

from app.config import DRY_VALUE, WET_VALUE

def convert_to_percentage(raw: int) -> float:
    pct = (DRY_VALUE - raw) / (DRY_VALUE - WET_VALUE)
    pct = max(0.0, min(1.0, pct))  # clamp into [0, 1]
    return pct * 100.0
