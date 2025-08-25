# Multi-stage build for production (optimized for size)
# Stage 1: Builder stage
FROM python:3.13-slim as builder

# Install system dependencies needed for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set working directory for building
WORKDIR /app/backend

# Copy only backend dependency files first (for better caching)
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies (production only, no dev dependencies)
RUN uv sync --frozen --no-cache --no-dev

# Stage 2: Runtime stage
FROM python:3.13-slim

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y \
    bash \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install uv (lightweight runtime only)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set working directory to app root (not backend)
WORKDIR /app

# Copy installed dependencies from builder stage
COPY --from=builder /app/backend/.venv /app/backend/.venv

# Copy backend files to preserve directory structure
COPY backend/ ./backend/

# Set environment variables
ENV UV_SYSTEM_PYTHON=1
ENV PATH="/app/backend/.venv/bin:$PATH"
ENV PYTHONPATH=/app:/app/backend

# Expose port
EXPOSE $PORT

# Production command with concurrency tuning for ~20+ simultaneous streams
CMD cd backend && uv run uvicorn api.index:app --host 0.0.0.0 --port 8000 --workers 4 --worker-class uvicorn.workers.UvicornWorker --limit-concurrency 1000 --limit-max-requests 1000 --timeout-keep-alive 5