#!/usr/bin/env bash
# =============================================================================
# backup.sh — LinkedIn/Instagram Client Acquisition Automation Project
# Backup script: dumps DB, copies volumes, compresses, rotates old backups
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()    { echo -e "\n${BLUE}${BOLD}==> $*${NC}"; }
log_success() { echo -e "${GREEN}${BOLD}  ✓ $*${NC}"; }

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Load environment
ENV_FILE="${PROJECT_ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
    set +a
fi

# Defaults (override via .env)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-automation}"
N8N_DATA_VOLUME="${N8N_DATA_VOLUME:-n8n_data}"
PLAYWRIGHT_SESSIONS_DIR="${PLAYWRIGHT_SESSIONS_DIR:-${PROJECT_ROOT}/playwright-sessions}"

# Retention
KEEP_BACKUPS="${KEEP_BACKUPS:-7}"

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
log_step "Step 1/5 — Pre-flight checks"

if ! command -v docker &>/dev/null; then
    log_error "Docker is required but not installed."
    exit 1
fi

if ! command -v pg_dump &>/dev/null && ! docker compose version &>/dev/null; then
    log_warn "pg_dump not found locally — will use Docker container for dump."
    USE_DOCKER_DUMP=true
else
    USE_DOCKER_DUMP=false
fi
log_success "Pre-flight checks passed"

# ---------------------------------------------------------------------------
# Create backup directory
# ---------------------------------------------------------------------------
log_step "Step 2/5 — Creating backup directory"

mkdir -p "$BACKUP_PATH"/{database,n8n-data,playwright-sessions}
log_success "Backup directory: ${BACKUP_PATH}"

# ---------------------------------------------------------------------------
# Dump PostgreSQL database
# ---------------------------------------------------------------------------
log_step "Step 3/5 — Dumping PostgreSQL database"

DB_DUMP_FILE="${BACKUP_PATH}/database/${POSTGRES_DB}_${TIMESTAMP}.sql"

# Try to find the PostgreSQL container
PG_CONTAINER=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -1 2>/dev/null || true)

if [[ -n "$PG_CONTAINER" ]]; then
    log_info "Found PostgreSQL container: ${PG_CONTAINER}"
    if docker exec "$PG_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --format=plain \
        --no-owner \
        --no-privileges \
        > "$DB_DUMP_FILE" 2>/dev/null; then
        DB_SIZE=$(du -sh "$DB_DUMP_FILE" | cut -f1)
        log_success "Database dumped (${DB_SIZE})"
    else
        log_error "pg_dump failed inside container. Trying with PGPASSWORD..."
        if PGPASSWORD="${POSTGRES_PASSWORD:-}" docker exec "$PG_CONTAINER" pg_dump \
            -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" \
            --format=plain \
            --no-owner \
            --no-privileges \
            > "$DB_DUMP_FILE" 2>/dev/null; then
            DB_SIZE=$(du -sh "$DB_DUMP_FILE" | cut -f1)
            log_success "Database dumped with password auth (${DB_SIZE})"
        else
            log_error "Failed to dump database. Continuing with partial backup..."
            echo "-- DATABASE DUMP FAILED at ${TIMESTAMP}" > "$DB_DUMP_FILE"
        fi
    fi
elif [[ "$USE_DOCKER_DUMP" == "false" ]] && command -v pg_dump &>/dev/null; then
    log_info "Using local pg_dump..."
    PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
        -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --format=plain \
        --no-owner \
        --no-privileges \
        > "$DB_DUMP_FILE" 2>/dev/null && {
        DB_SIZE=$(du -sh "$DB_DUMP_FILE" | cut -f1)
        log_success "Database dumped via local pg_dump (${DB_SIZE})"
    } || {
        log_error "Local pg_dump failed. Continuing with partial backup..."
        echo "-- DATABASE DUMP FAILED at ${TIMESTAMP}" > "$DB_DUMP_FILE"
    }
else
    log_warn "No PostgreSQL container or local pg_dump found. Skipping database dump."
    echo "-- NO DATABASE DUMP AVAILABLE at ${TIMESTAMP}" > "$DB_DUMP_FILE"
fi

# ---------------------------------------------------------------------------
# Copy n8n data volume
# ---------------------------------------------------------------------------
log_step "Step 4a/5 — Backing up n8n data"

N8N_CONTAINER=$(docker ps --filter "name=n8n" --format '{{.Names}}' | head -1 2>/dev/null || true)

if [[ -n "$N8N_CONTAINER" ]]; then
    # Copy n8n data from the container's /data directory
    if docker cp "${N8N_CONTAINER}:/home/node/.n8n" "${BACKUP_PATH}/n8n-data/" 2>/dev/null; then
        N8N_SIZE=$(du -sh "${BACKUP_PATH}/n8n-data" | cut -f1)
        log_success "n8n data backed up (${N8N_SIZE})"
    else
        log_warn "Could not copy n8n data (volume may be empty)."
    fi
else
    # Try to copy from a Docker volume directly
    if docker volume inspect "$N8N_DATA_VOLUME" &>/dev/null; then
        log_info "Copying from Docker volume: ${N8N_DATA_VOLUME}"
        TEMP_CONTAINER="backup_copy_$$"
        docker create --name "$TEMP_CONTAINER" -v "${N8N_DATA_VOLUME}:/source:ro" alpine:latest /bin/true 2>/dev/null || true
        docker cp "${TEMP_CONTAINER}:/source/." "${BACKUP_PATH}/n8n-data/" 2>/dev/null || true
        docker rm "$TEMP_CONTAINER" &>/dev/null || true
        N8N_SIZE=$(du -sh "${BACKUP_PATH}/n8n-data" 2>/dev/null | cut -f1)
        log_success "n8n data backed up from volume (${N8N_SIZE:-0K})"
    else
        log_warn "No n8n container or volume found. Skipping n8n data backup."
    fi
fi

# ---------------------------------------------------------------------------
# Copy Playwright sessions
# ---------------------------------------------------------------------------
log_step "Step 4b/5 — Backing up Playwright sessions"

if [[ -d "$PLAYWRIGHT_SESSIONS_DIR" ]]; then
    if cp -r "${PLAYWRIGHT_SESSIONS_DIR}/." "${BACKUP_PATH}/playwright-sessions/" 2>/dev/null; then
        PW_SIZE=$(du -sh "${BACKUP_PATH}/playwright-sessions" | cut -f1)
        log_success "Playwright sessions backed up (${PW_SIZE})"
    else
        log_warn "Failed to copy Playwright sessions."
    fi
else
    # Check inside a Playwright container
    PW_CONTAINER=$(docker ps --filter "name=playwright" --format '{{.Names}}' | head -1 2>/dev/null || true)
    if [[ -n "$PW_CONTAINER" ]]; then
        if docker cp "${PW_CONTAINER}:/app/sessions" "${BACKUP_PATH}/playwright-sessions/" 2>/dev/null; then
            PW_SIZE=$(du -sh "${BACKUP_PATH}/playwright-sessions" | cut -f1)
            log_success "Playwright sessions backed up from container (${PW_SIZE})"
        else
            log_warn "Could not copy Playwright sessions from container."
        fi
    else
        log_warn "No Playwright sessions directory or container found. Skipping."
    fi
fi

# ---------------------------------------------------------------------------
# Compress and rotate
# ---------------------------------------------------------------------------
log_step "Step 5/5 — Compressing backup and rotating old backups"

ARCHIVE_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Compress (use pigz if available for parallel gzip, else gzip)
if command -v pigz &>/dev/null; then
    log_info "Compressing with pigz (parallel)..."
    tar -cf - -C "$BACKUP_DIR" "$BACKUP_NAME" | pigz -6 > "$ARCHIVE_FILE"
else
    log_info "Compressing with gzip..."
    tar -czf "$ARCHIVE_FILE" -C "$BACKUP_DIR" "$BACKUP_NAME"
fi

ARCHIVE_SIZE=$(du -sh "$ARCHIVE_FILE" | cut -f1)
log_success "Archive created: ${ARCHIVE_FILE} (${ARCHIVE_SIZE})"

# Remove uncompressed backup directory
rm -rf "$BACKUP_PATH"

# ---------------------------------------------------------------------------
# Rotate old backups (keep last N)
# ---------------------------------------------------------------------------
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "backup_*.tar.gz" -type f | wc -l)

if (( BACKUP_COUNT > KEEP_BACKUPS )); then
    REMOVE_COUNT=$((BACKUP_COUNT - KEEP_BACKUPS))
    log_info "Rotating backups: removing ${REMOVE_COUNT} old backup(s) (keeping last ${KEEP_BACKUPS})"

    find "$BACKUP_DIR" -maxdepth 1 -name "backup_*.tar.gz" -type f -printf '%T@ %p\n' \
        | sort -n \
        | head -n "$REMOVE_COUNT" \
        | awk '{print $2}' \
        | while IFS= read -r old_backup; do
            log_info "Removing old backup: $(basename "$old_backup")"
            rm -f "$old_backup"
        done

    log_success "Backup rotation complete"
else
    log_success "No rotation needed (${BACKUP_COUNT}/${KEEP_BACKUPS} backups)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  ✅  Backup Complete                                      ║${NC}"
echo -e "${GREEN}${BOLD}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Archive   : ${ARCHIVE_FILE}"
echo -e "${GREEN}${BOLD}║${NC}  Size      : ${ARCHIVE_SIZE}"
echo -e "${GREEN}${BOLD}║${NC}  Database  : ${POSTGRES_DB}"
echo -e "${GREEN}${BOLD}║${NC}  Timestamp : ${TIMESTAMP}"
echo -e "${GREEN}${BOLD}║${NC}  Retained  : ${KEEP_BACKUPS} most recent backups"
echo -e "${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  Restore:  tar -xzf ${BACKUP_NAME}.tar.gz"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
