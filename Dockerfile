# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript workers to JavaScript using esbuild
RUN mkdir -p dist/workers && \
    npx esbuild worker-scheduled-publish.ts --bundle --platform=node --format=cjs --target=node20 --outfile=dist/workers/worker-scheduled-publish.js --external:@prisma/client --external:prisma && \
    npx esbuild worker-auto-reply.ts --bundle --platform=node --format=cjs --target=node20 --outfile=dist/workers/worker-auto-reply.js --external:@prisma/client --external:prisma && \
    npx esbuild worker-mission-scout.ts --bundle --platform=node --format=cjs --target=node20 --outfile=dist/workers/worker-mission-scout.js --external:@prisma/client --external:prisma && \
    npx esbuild worker-all-agents.ts --bundle --platform=node --format=cjs --target=node20 --outfile=dist/workers/worker-all-agents.js --external:@prisma/client --external:prisma

# Build Next.js (force webpack — Turbopack cannot handle lucide-react)
RUN npx next build --webpack

# ── Stage 2: Production ────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

# Install PM2 globally + pg for Neon SSL
RUN npm install -g pm2 && \
    npm install pg

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/ecosystem.config.js ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

# Generate Prisma client in production
RUN npx prisma generate

EXPOSE 10000

# Start: push schema to DB then launch PM2
CMD sh -c "npx prisma db push --accept-data-loss 2>&1 && exec pm2-runtime start ecosystem.config.js"
