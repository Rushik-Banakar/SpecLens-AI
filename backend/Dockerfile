FROM python:3.11-slim

WORKDIR /app

# Copy requirements from the backend folder
COPY backend/requirements.txt .

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ .

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]