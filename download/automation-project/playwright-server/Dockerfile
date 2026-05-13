# ══════════════════════════════════════════════════════════════
# Étape 1 — Build : installation des dépendances et navigateurs
# ══════════════════════════════════════════════════════════════
FROM node:20-bookworm AS builder

WORKDIR /app

# Install git (required by some playwright dependencies)
RUN apt-get update && apt-get install -y git --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

# Copy application source
COPY playwright-server.js ./

# Install Playwright browsers (Chromium, Firefox, WebKit)
RUN npx playwright install --with-deps chromium

# ══════════════════════════════════════════════════════════════
# Étape 2 — Production : image allégée pour l'exécution
# ══════════════════════════════════════════════════════════════
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies needed by Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    curl \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Copy node_modules and source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/playwright-server.js ./

# Create logs directory
RUN mkdir -p /app/logs

# Create non-root user for security
RUN groupadd -r playwright && useradd -r -g playwright -G audio,video playwright \
  && chown -R playwright:playwright /app
USER playwright

# Expose API port
EXPOSE 3000

# Health check — vérifie que le serveur répond
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the Playwright automation server
CMD ["node", "playwright-server.js"]
