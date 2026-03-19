# ── VidyAI / Parvidya — Production Dockerfile ─────────────────────────────────
# Includes: Flask API + Celery workers + poppler (for pdf2image OCR pipeline)
#
# Build:   docker build -t parvidya .
# Run API: docker run -p 5001:5001 --env-file .env parvidya
# Workers: docker run --env-file .env parvidya celery -A celery_worker worker --loglevel=info

FROM python:3.11-slim

# ── System dependencies ────────────────────────────────────────────────────────
# poppler-utils: required by pdf2image for PDF→image conversion (OCR pipeline)
# libgl1:        required by some Pillow operations
RUN apt-get update && apt-get install -y --no-install-recommends \
        poppler-utils \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ──────────────────────────────────────────────────────────
WORKDIR /app

# ── Python dependencies ────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application code ───────────────────────────────────────────────────────────
COPY app.py celery_worker.py ./

# Copy React build if it exists (for SPA serving)
COPY vidyai-react/dist/ ./dist/ 2>/dev/null || true

# ── Runtime config ─────────────────────────────────────────────────────────────
ENV PYTHONUNBUFFERED=1 \
    PORT=5001

EXPOSE 5001

# Default: run the Flask API
# Override for Celery worker:
#   docker run ... parvidya celery -A celery_worker worker --loglevel=info
CMD ["python", "app.py"]
