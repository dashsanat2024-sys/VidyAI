# ── VidyAI / Parvidya — Production Dockerfile ─────────────────────────────────
# Supports: Google Cloud Run (PORT=8080), HF Spaces (PORT=7860), local (PORT=5001)
#
# Build:   docker build -t parvidya .
# Run:     docker run -p 8080:8080 --env-file .env parvidya

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
COPY dist ./dist
COPY tools ./tools

# ── Runtime config ─────────────────────────────────────────────────────────────
# Cloud Run injects PORT=8080; HF Spaces uses 7860; local can override.
# RENDER must NOT be hardcoded here — it switches the app to /tmp (serverless mode).
# Set RENDER=true only when actually deploying to Render.com via that platform's env.
ENV PYTHONUNBUFFERED=1 \
    PORT=8080

EXPOSE 8080

# Use a fixed high timeout. Do NOT set GUNICORN_TIMEOUT=300 on Cloud Run — it overrides
# Dockerfile defaults and was causing bulk-eval workers to be SIGKILL'd → HTTP 502.
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT} --timeout 3600 --workers 1"]
