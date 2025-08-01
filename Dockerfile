# This is a redirect Dockerfile that points to the backend
# Railway should use this instead of auto-detecting Node.js

# Use Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Copy entire project first
COPY . .

# Change to backend directory and install dependencies
WORKDIR /app/backend

# Set UV to use system python instead of creating venv in mounted directory
ENV UV_SYSTEM_PYTHON=1
RUN uv sync --frozen --no-cache

# Expose port
EXPOSE 8000

# Default command (Railway will override this with startCommand)
CMD ["uv", "run", "fastapi", "run", "api/index.py", "--host", "0.0.0.0", "--port", "8000"]