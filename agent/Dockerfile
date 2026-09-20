# ============================================================================
# Agent Dockerfile — LiveKit Cloud deployment
# ============================================================================
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY agent.py .
COPY config.py .
COPY ai/ ai/
COPY banking/ banking/
COPY conversation/ conversation/
COPY prompts/ prompts/

# Create non-root user
RUN groupadd -r agentuser && useradd -r -g agentuser -d /app -s /sbin/nologin agentuser
RUN chown -R agentuser:agentuser /app
USER agentuser

# LiveKit agent startup — 'start' runs in production mode
# LiveKit Cloud injects LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
CMD ["python", "agent.py", "start"]
