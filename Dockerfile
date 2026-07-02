FROM python:3.11-slim AS base

LABEL maintainer="CEDX Pipeline Team"
LABEL description="CEDX Multi-Agent Data Governance Pipeline — Phase 1"

# Prevent bytecode files and enable unbuffered stdout/stderr for logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (layer caching)
COPY pyproject.toml ./
RUN pip install --no-cache-dir . 2>/dev/null || true

# Copy application source
COPY cedx_pipeline/ ./cedx_pipeline/

# Install the package itself
RUN pip install --no-cache-dir .

# Default seed directory inside the container
ENV SEED_DIR=/app/seed

ENTRYPOINT ["python", "-m", "cedx_pipeline.main"]
