# Jakob Balkovec
# Fri Nov 28th
# decode.py

import base64

def decode_base64_to_decimal(b64_data: str) -> int:
    try:
        if not isinstance(b64_data, str) or len(b64_data) == 0:
            raise ValueError("Base64 payload must be a non-empty string")

        decoded_bytes = base64.b64decode(b64_data)
        raw_hex = decoded_bytes.hex()
        raw_value = int(raw_hex, 16)

        return raw_value

    except Exception as e:
        raise ValueError(f"Failed to decode base64 payload: {e}")
