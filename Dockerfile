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
COPY app.py ./

# ── Runtime config ─────────────────────────────────────────────────────────────
# PORT=7860 for Hugging Face Spaces; override with -e PORT=5001 for local use.
ENV PYTHONUNBUFFERED=1 \
    PORT=7860

EXPOSE 7860

CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT} --timeout 300 --workers 1"]
