# Multi-stage build for optimized image size
# Stage 1: Builder stage
FROM python:3.13-slim as builder

# Install system dependencies needed for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set working directory
WORKDIR /app/backend

# Copy only backend dependency files first (for better caching)
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies with cleanup
RUN uv sync --frozen --no-cache --no-dev && \
    find /app/backend/.venv -name "*.pyc" -delete && \
    find /app/backend/.venv -name "__pycache__" -type d -exec rm -rf {} + || true

# Stage 2: Runtime stage
FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Set working directory
WORKDIR /app/backend

# Copy installed dependencies from builder stage
COPY --from=builder /app/backend/.venv /app/backend/.venv

# Copy only necessary backend application files
COPY backend/ ./

# Set environment variables
ENV UV_SYSTEM_PYTHON=1
ENV PATH="/app/backend/.venv/bin:$PATH"
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["uv", "run", "python", "-m", "fastapi", "run", "api/index.py", "--host", "0.0.0.0", "--port", "8000"]