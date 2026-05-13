#!/bin/sh
# Compile workers from TypeScript to JavaScript using esbuild
# esbuild handles @/ path aliases and bundles everything into single files

set -e

echo "🔨 Compiling TypeScript workers..."

mkdir -p dist/workers

for WORKER in worker-scheduled-publish.ts worker-auto-reply.ts worker-mission-scout.ts worker-all-agents.ts; do
  OUTFILE="dist/workers/${WORKER%.ts}.js"
  echo "  → $WORKER → $OUTFILE"
  npx esbuild "$WORKER" \
    --bundle \
    --platform=node \
    --format=cjs \
    --target=node20 \
    --outfile="$OUTFILE" \
    --external:@prisma/client \
    --external:prisma \
    --external:better-sqlite3
done

echo "✅ All workers compiled successfully"
ls -la dist/workers/
