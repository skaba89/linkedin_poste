#!/usr/bin/env bash
# =============================================================================
# health-check.sh — LinkedIn/Instagram Client Acquisition Automation Project
# Health monitoring script: checks all services, outputs JSON status report.
#
# Usage:
#   ./health-check.sh              # Run all checks, print JSON to stdout
#   ./health-check.sh --silent     # Suppress human-readable summary
#   ./health-check.sh --webhook    # Post results to DISCORD_WEBHOOK_URL
#
# Cron example (every 5 minutes):
#   */5 * * * * /path/to/scripts/health-check.sh --silent >> /var/log/health.log 2>&1
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load environment for webhook URLs
ENV_FILE="${PROJECT_ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/^/export /')
fi

# Service endpoints
N8N_HOST="${N8N_HOST:-localhost}"
N8N_PORT="${N8N_PORT:-5678}"
N8N_URL="http://${N8N_HOST}:${N8N_PORT}"

PLAYWRIGHT_HOST="${PLAYWRIGHT_HOST:-localhost}"
PLAYWRIGHT_PORT="${PLAYWRIGHT_PORT:-3100}"
PLAYWRIGHT_URL="http://${PLAYWRIGHT_HOST}:${PLAYWRIGHT_PORT}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-automation}"

# Thresholds
DISK_WARN_PCT="${DISK_WARN_PCT:-80}"
DISK_CRIT_PCT="${DISK_CRIT_PCT:-95}"

# CLI flags
SILENT=false
SEND_WEBHOOK=false
for arg in "$@"; do
    case "$arg" in
        --silent)    SILENT=true ;;
        --webhook)   SEND_WEBHOOK=true ;;
        --help|-h)
            echo "Usage: $0 [--silent] [--webhook]"
            exit 0
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Timestamp
# ---------------------------------------------------------------------------
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TIMESTAMP_READABLE=$(date +"%Y-%m-%d %H:%M:%S %Z")

# ---------------------------------------------------------------------------
# Result accumulator
# ---------------------------------------------------------------------------
# We build a JSON object manually for maximum portability (no jq required).
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0
JSON_CHECKS=""
JSON_FIRST=true

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Add a check result to the JSON array
add_check() {
    local name="$1"
    local status="$2"   # "healthy" | "degraded" | "unhealthy"
    local message="$3"
    local response_time_ms="${4:-null}"
    local extra="${5:-}"

    # Update counters
    case "$status" in
        healthy)  ((CHECKS_PASSED++)) ;;
        degraded) ((CHECKS_WARNED++)) ;;
        unhealthy) ((CHECKS_FAILED++)) ;;
    esac

    # Escape strings for JSON
    local esc_name esc_message esc_extra
    esc_name=$(printf '%s' "$name" | sed 's/"/\\"/g')
    esc_message=$(printf '%s' "$message" | sed 's/"/\\"/g')
    esc_extra=$(printf '%s' "$extra" | sed 's/"/\\"/g')

    # Build JSON entry
    local entry
    entry=$(cat <<ENTRY
  {
    "name": "${esc_name}",
    "status": "${status}",
    "message": "${esc_message}",
    "responseTimeMs": ${response_time_ms},
    "details": "${esc_extra}",
    "timestamp": "${TIMESTAMP}"
  }
ENTRY
)

    # Append to array
    if [[ "$JSON_FIRST" == "true" ]]; then
        JSON_CHECKS="$entry"
        JSON_FIRST=false
    else
        JSON_CHECKS="${JSON_CHECKS},
  ${entry}"
    fi
}

# Measure HTTP response time in milliseconds
http_response_time() {
    local url="$1"
    local start end

    start=$(date +%s%N 2>/dev/null || echo "0")
    local http_code
    http_code=$(curl -sf -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")
    end=$(date +%s%N 2>/dev/null || echo "0")

    if [[ "$start" == "0" || "$end" == "0" ]]; then
        echo "000 $http_code"
    else
        local elapsed_ms=$(( (end - start) / 1000000 ))
        echo "${elapsed_ms} ${http_code}"
    fi
}

# ---------------------------------------------------------------------------
# 1. n8n HTTP endpoint check
# ---------------------------------------------------------------------------
check_n8n() {
    local result
    result=$(http_response_time "${N8N_URL}/healthz" 2>/dev/null) || true

    local response_time_ms http_code
    response_time_ms=$(echo "$result" | awk '{print $1}')
    http_code=$(echo "$result" | awk '{print $2}')

    # n8n may not have /healthz — try the root
    if [[ "$http_code" == "000" ]]; then
        result=$(http_response_time "${N8N_URL}" 2>/dev/null) || true
        response_time_ms=$(echo "$result" | awk '{print $1}')
        http_code=$(echo "$result" | awk '{print $2}')
    fi

    if [[ "$http_code" =~ ^2 ]]; then
        add_check "n8n" "healthy" "n8n is responding (HTTP ${http_code})" "$response_time_ms"
    elif [[ "$http_code" =~ ^[45] ]]; then
        add_check "n8n" "degraded" "n8n returned HTTP ${http_code}" "$response_time_ms"
    else
        add_check "n8n" "unhealthy" "n8n is not reachable at ${N8N_URL}" "null"
    fi
}

# ---------------------------------------------------------------------------
# 2. PostgreSQL connection check
# ---------------------------------------------------------------------------
check_postgres() {
    local start end response_time_ms

    # Try docker exec first (preferred when running via compose)
    local pg_container
    pg_container=$(docker ps --filter "name=postgres" --format '{{.Names}}' | head -1 2>/dev/null || true)

    if [[ -n "$pg_container" ]]; then
        start=$(date +%s%N 2>/dev/null || echo "0")

        local pg_result
        pg_result=$(docker exec "$pg_container" pg_isready \
            -h localhost \
            -p 5432 \
            -U "$POSTGRES_USER" \
            2>/dev/null) || true

        end=$(date +%s%N 2>/dev/null || echo "0")
        response_time_ms=$(( (end - start) / 1000000 ))

        if echo "$pg_result" | grep -q "accepting connections"; then
            add_check "postgres" "healthy" "PostgreSQL is accepting connections" "$response_time_ms"
        else
            add_check "postgres" "unhealthy" "PostgreSQL status: ${pg_result:-not responding}" "$response_time_ms"
        fi
    elif command -v pg_isready &>/dev/null; then
        # Fall back to local pg_isready
        start=$(date +%s%N 2>/dev/null || echo "0")

        local pg_result
        pg_result=$(PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_isready \
            -h "$POSTGRES_HOST" \
            -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" \
            2>/dev/null) || true

        end=$(date +%s%N 2>/dev/null || echo "0")
        response_time_ms=$(( (end - start) / 1000000 ))

        if echo "$pg_result" | grep -q "accepting connections"; then
            add_check "postgres" "healthy" "PostgreSQL is accepting connections" "$response_time_ms"
        else
            add_check "postgres" "unhealthy" "PostgreSQL status: ${pg_result:-not responding}" "$response_time_ms"
        fi
    else
        # Final fallback: try nc (netcat)
        start=$(date +%s%N 2>/dev/null || echo "0")

        if (echo > "/dev/tcp/${POSTGRES_HOST}/${POSTGRES_PORT}") 2>/dev/null; then
            end=$(date +%s%N 2>/dev/null || echo "0")
            response_time_ms=$(( (end - start) / 1000000 ))
            add_check "postgres" "healthy" "PostgreSQL port ${POSTGRES_PORT} is open" "$response_time_ms"
        else
            end=$(date +%s%N 2>/dev/null || echo "0")
            response_time_ms=$(( (end - start) / 1000000 ))
            add_check "postgres" "unhealthy" "Cannot connect to PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}" "$response_time_ms"
        fi
    fi
}

# ---------------------------------------------------------------------------
# 3. Playwright server health check
# ---------------------------------------------------------------------------
check_playwright() {
    local result
    result=$(http_response_time "${PLAYWRIGHT_URL}/health" 2>/dev/null) || true

    local response_time_ms http_code
    response_time_ms=$(echo "$result" | awk '{print $1}')
    http_code=$(echo "$result" | awk '{print $2}')

    # Also try the root endpoint if /health doesn't exist
    if [[ "$http_code" == "000" ]]; then
        result=$(http_response_time "${PLAYWRIGHT_URL}" 2>/dev/null) || true
        response_time_ms=$(echo "$result" | awk '{print $1}')
        http_code=$(echo "$result" | awk '{print $2}')
    fi

    if [[ "$http_code" =~ ^2 ]]; then
        add_check "playwright" "healthy" "Playwright server is responding (HTTP ${http_code})" "$response_time_ms"
    elif [[ "$http_code" == "000" ]]; then
        add_check "playwright" "unhealthy" "Playwright server is not reachable at ${PLAYWRIGHT_URL}" "null"
    else
        add_check "playwright" "degraded" "Playwright server returned HTTP ${http_code}" "$response_time_ms"
    fi
}

# ---------------------------------------------------------------------------
# 4. Disk space check
# ---------------------------------------------------------------------------
check_disk() {
    local disk_info disk_pct disk_used disk_total disk_mount

    # Get the disk where the project lives (or / if not found)
    disk_info=$(df -h "${PROJECT_ROOT}" 2>/dev/null | awk 'NR==2 {print $5, $3, $2, $6}' || \
                df -h / 2>/dev/null | awk 'NR==2 {print $5, $3, $2, $6}')

    if [[ -z "$disk_info" ]]; then
        add_check "disk" "unhealthy" "Unable to check disk space" "null"
        return
    fi

    disk_pct=$(echo "$disk_info" | awk '{print $1}' | tr -d '%')
    disk_used=$(echo "$disk_info" | awk '{print $2}')
    disk_total=$(echo "$disk_info" | awk '{print $3}')
    disk_mount=$(echo "$disk_info" | awk '{print $4}')

    if (( disk_pct >= DISK_CRIT_PCT )); then
        add_check "disk" "unhealthy" \
            "Disk usage CRITICAL: ${disk_pct}% used (${disk_used} / ${disk_total}) on ${disk_mount}" \
            "null" "threshold: ${DISK_WARN_PCT}% warn, ${DISK_CRIT_PCT}% critical"
    elif (( disk_pct >= DISK_WARN_PCT )); then
        add_check "disk" "degraded" \
            "Disk usage WARNING: ${disk_pct}% used (${disk_used} / ${disk_total}) on ${disk_mount}" \
            "null" "threshold: ${DISK_WARN_PCT}% warn, ${DISK_CRIT_PCT}% critical"
    else
        add_check "disk" "healthy" \
            "Disk usage OK: ${disk_pct}% used (${disk_used} / ${disk_total}) on ${disk_mount}" \
            "null" "threshold: ${DISK_WARN_PCT}% warn, ${DISK_CRIT_PCT}% critical"
    fi
}

# ---------------------------------------------------------------------------
# 5. Docker container status check
# ---------------------------------------------------------------------------
check_docker_containers() {
    if ! command -v docker &>/dev/null; then
        add_check "docker_containers" "unhealthy" "Docker command not found" "null"
        return
    fi

    # Ensure Docker daemon is running
    if ! docker info &>/dev/null; then
        add_check "docker_containers" "unhealthy" "Docker daemon is not running" "null"
        return
    fi

    local containers
    containers=$(docker ps --format '{{.Names}}|{{.State}}|{{.Status}}' 2>/dev/null || true)

    if [[ -z "$containers" ]]; then
        add_check "docker_containers" "degraded" "No running containers found" "null"
        return
    fi

    local total=0 running=0 unhealthy_list=""

    while IFS='|' read -r name state status; do
        ((total++))
        if [[ "$state" == "running" ]]; then
            ((running++))
            # Check if the container is in an unhealthy state (healthcheck)
            if echo "$status" | grep -qi "unhealthy"; then
                unhealthy_list="${unhealthy_list}  • ${name} (${status})\n"
            fi
        fi
    done <<< "$containers"

    if [[ -n "$unhealthy_list" ]]; then
        add_check "docker_containers" "degraded" \
            "${running}/${total} containers running. Unhealthy detected:" \
            "null" "$(echo -e "$unhealthy_list" | sed 's/"/\\"/g' | tr '\n' ' ')"
    elif (( running == total )); then
        add_check "docker_containers" "healthy" \
            "All ${total} containers are running" "null" \
            "$(echo "$containers" | sed 's/"/\\"/g' | tr '\n' ', ')"
    else
        add_check "docker_containers" "degraded" \
            "${running}/${total} containers running" "null"
    fi
}

# ---------------------------------------------------------------------------
# 6. Memory usage check (bonus)
# ---------------------------------------------------------------------------
check_memory() {
    local mem_info
    mem_info=$(free -m 2>/dev/null | awk 'NR==2 {print $2, $3, $4, $6, $7}' || true)

    if [[ -z "$mem_info" ]]; then
        # macOS fallback
        mem_info=$(vm_stat 2>/dev/null | head -5 || true)
        if [[ -z "$mem_info" ]]; then
            add_check "memory" "degraded" "Unable to check memory usage" "null"
            return
        fi
        add_check "memory" "healthy" "Memory check skipped (non-Linux system)" "null"
        return
    fi

    local total used free buffers cached
    read -r total used free buffers cached <<< "$mem_info"
    local used_pct=$(( used * 100 / total ))

    if (( used_pct >= 90 )); then
        add_check "memory" "unhealthy" \
            "Memory usage CRITICAL: ${used_pct}% (${used}MB / ${total}MB used)" "null"
    elif (( used_pct >= 80 )); then
        add_check "memory" "degraded" \
            "Memory usage WARNING: ${used_pct}% (${used}MB / ${total}MB used)" "null"
    else
        add_check "memory" "healthy" \
            "Memory usage OK: ${used_pct}% (${used}MB / ${total}MB used)" "null"
    fi
}

# ===========================================================================
# Run all checks
# ===========================================================================

check_n8n
check_postgres
check_playwright
check_disk
check_docker_containers
check_memory

# ---------------------------------------------------------------------------
# Determine overall status
# ---------------------------------------------------------------------------
if (( CHECKS_FAILED > 0 )); then
    OVERALL_STATUS="unhealthy"
elif (( CHECKS_WARNED > 0 )); then
    OVERALL_STATUS="degraded"
else
    OVERALL_STATUS="healthy"
fi

# ---------------------------------------------------------------------------
# Build final JSON report
# ---------------------------------------------------------------------------
HOSTNAME=$(hostname 2>/dev/null || echo "unknown")

JSON_REPORT=$(cat <<EOF
{
  "status": "${OVERALL_STATUS}",
  "hostname": "${HOSTNAME}",
  "timestamp": "${TIMESTAMP}",
  "timestampReadable": "${TIMESTAMP_READABLE}",
  "summary": {
    "total": $((CHECKS_PASSED + CHECKS_WARNED + CHECKS_FAILED)),
    "healthy": ${CHECKS_PASSED},
    "degraded": ${CHECKS_WARNED},
    "unhealthy": ${CHECKS_FAILED}
  },
  "checks": [
${JSON_CHECKS}
  ]
}
EOF
)

# Print JSON to stdout
echo "$JSON_REPORT"

# ---------------------------------------------------------------------------
# Human-readable summary (unless --silent)
# ---------------------------------------------------------------------------
if [[ "$SILENT" == "false" ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  Health Check — ${TIMESTAMP_READABLE}"
    echo "═══════════════════════════════════════════════════════════════"

    case "$OVERALL_STATUS" in
        healthy)  echo "  Overall: ✅ HEALTHY" ;;
        degraded) echo "  Overall: ⚠️  DEGRADED" ;;
        unhealthy) echo "  Overall: ❌ UNHEALTHY" ;;
    esac

    echo ""
    echo "  Checks: ${CHECKS_PASSED} healthy, ${CHECKS_WARNED} warnings, ${CHECKS_FAILED} failures"
    echo "  Host:   ${HOSTNAME}"
    echo ""

    # Show details for non-healthy checks
    if (( CHECKS_WARNED > 0 || CHECKS_FAILED > 0 )); then
        echo "  ⚠️  Attention needed:"
        echo "$JSON_CHECKS" | \
            python3 -c "
import sys, json
checks = json.loads('[${sys.stdin.read().replace(\"\\n  \", \",\")}]' if sys.stdin.read().strip() else '[]')
" 2>/dev/null || \
        echo "  (See JSON output above for details)"
    fi

    echo "═══════════════════════════════════════════════════════════════"
    echo ""
fi

# ---------------------------------------------------------------------------
# Optional: Send to Discord webhook
# ---------------------------------------------------------------------------
if [[ "$SEND_WEBHOOK" == "true" && -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
    # Extract summary for Discord
    EMOJI="✅"
    case "$OVERALL_STATUS" in
        degraded)  EMOJI="⚠️" ;;
        unhealthy) EMOJI="🚨" ;;
    esac

    SUMMARY_MSG="${EMOJI} **Health Check** — ${OVERALL_STATUS^^}
${CHECKS_PASSED} healthy · ${CHECKS_WARNED} warnings · ${CHECKS_FAILED} failures
Host: \`${HOSTNAME}\` · ${TIMESTAMP_READABLE}"

    curl -sf -X POST "$DISCORD_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "$(jq -n --arg content "$SUMMARY_MSG" '{content: $content}' 2>/dev/null || \
            printf '{"content":"%s"}' "$(echo "$SUMMARY_MSG" | sed 's/"/\\"/g')")" \
        &>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Exit code
# ---------------------------------------------------------------------------
case "$OVERALL_STATUS" in
    healthy)  exit 0 ;;
    degraded) exit 1 ;;
    unhealthy) exit 2 ;;
esac
