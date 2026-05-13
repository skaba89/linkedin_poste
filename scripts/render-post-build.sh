#!/bin/sh
# ── Render Post-Build Script ──
# Creates the SQLite directory + runs Prisma migrations if needed

echo "=== Render Post-Build ==="

# Ensure DB directory exists
mkdir -p /app/db

# Generate Prisma client (in case it wasn't done during build)
npx prisma generate

# Push schema to DB (creates tables if not exists)
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push

echo "=== Post-Build Complete ==="
