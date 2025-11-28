# Soil Moisture Sensor API Specification

## On-Campus LoRaWAN Gateway

Sensor data is streamed through an MQTT broker.

Broker:

- Host: mqtt.loralab.org
- Port: 1883

MQTT Topic Format: `application/soilmoisture/device/{Device EUI}/rx`

Example Active Topic: `application/soilmoisture/device/ce9c49e5db72508d/rx`

This device currently publishes every 5 minutes.

---

### Example MQTT Payload

```json
{
  "applicationID": "2",
  "applicationName": "soilmoisture",
  "devEUI": "ce9c49e5db72508d",
  "deviceName": "deployment_prototype_moisture_1",
  "timestamp": 1764202708,
  "fCnt": 2,
  "fPort": 2,
  "data": "MGw=",
  "data_encode": "base64",
  "adr": true,
  "rxInfo": [
    {
      "gatewayID": "ac1f09fffe1e9117",
      "loRaSNR": 13.2,
      "rssi": -82,
      "location": {
        "latitude": 47.60984,
        "longitude": -122.3185,
        "altitude": 114
      }
    }
  ],
  "txInfo": { "frequency": 902500000, "dr": 3 }
}
```

---

### Payload Interpretation

data is Base64 encoding of a hex value.

Example:

- Data: `MGw=`
- Base64 decode -> `306c` (hex)
- Hex decode -> `12396` (decimal)

Raw integer represents the soil moisture sensor output.

Calibration:

- Define dry reference value
- Define wet reference value
- Convert raw signal to soil moisture percentage

---

### API Notes

Backend should:

- Secure access (auth recommended)
- Support real-time display (web dashboard ideal)

Future payloads:

- May include multiple sensor values such as battery voltage
- API must be flexible for parsing different payload structures

---

### Helium Network (TBD)

Using Helium:

- Payloads arrive via `HTTP POST`
- Need a `POST` endpoint to receive uplinks

---

### Data Flow

```
MQTT Broker (SU Gateway)
        ↓
backend/app/mqtt.py  → decode.py → PostgreSQL → REST API + WebSockets → **Live Dashboard**
```

Later:

```
Helium Network → HTTP POST → backend/app/helium.py → same pipeline
```

---

### Security and Credentials

Short-term: local dev only
Future: add Google SSO
Also add role-based access (admin vs viewer)
