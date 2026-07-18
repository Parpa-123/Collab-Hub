# ---- Build Stage ----
FROM python:3.13-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install build dependencies
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies using uv with BuildKit cache
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system --no-cache -r requirements.txt

# ---- Runtime Stage ----
FROM python:3.13-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install only runtime system packages; build headers stay in the builder stage.
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Copy installed python packages from builder
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy application code
COPY --chown=appuser:appgroup . .

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh

# Change ownership of the sqlite database directory
RUN mkdir -p /app/db_data && chown -R appuser:appgroup /app/db_data

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["./entrypoint.sh"]
