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
RUN uv sync --frozen --no-cache

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["uv", "run", "python", "-m", "fasta", "api.index:app", "--host", "0.0.0.0", "--port", "8000"]