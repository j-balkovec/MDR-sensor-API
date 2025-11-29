# Backend Dockerfile placeholder
FROM python:3.11-slim
WORKDIR /app
COPY . /app
RUN pip install fastapi uvicorn sqlalchemy paho-mqtt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
