#!/usr/bin/env bash
# =============================================================================
# deploy.sh — LinkedIn/Instagram Client Acquisition Automation Project
# Deploy script: checks prerequisites, sets up .env, builds & starts services
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()    { echo -e "\n${BLUE}${BOLD}==> $*${NC}"; }
log_success() { echo -e "${GREEN}${BOLD}  ✓ $*${NC}"; }

# ---------------------------------------------------------------------------
# Script directory & project root
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"

# ---------------------------------------------------------------------------
# 1. Prerequisite checks
# ---------------------------------------------------------------------------
log_step "Step 1/6 — Checking prerequisites"

check_command() {
    local cmd="$1"
    local min_version="${2:-}"
    local version_flag="${3:---version}"

    if ! command -v "$cmd" &>/dev/null; then
        log_error "'${cmd}' is not installed. Please install it before continuing."
        exit 1
    fi

    if [[ -n "$min_version" ]]; then
        local installed_version
        installed_version=$("$cmd" "$version_flag" 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
        if [[ -n "$installed_version" ]]; then
            local min_major min_inst
            min_major=$(echo "$min_version" | awk -F. '{print $1}')
            min_inst=$(echo "$installed_version" | awk -F. '{print $1}')
            if (( min_inst < min_major )); then
                log_error "${cmd} version ${installed_version} found, but >= ${min_version} is required."
                exit 1
            fi
            log_success "${cmd} v${installed_version} detected (>= ${min_version} ✓)"
        else
            log_warn "Could not determine ${cmd} version, continuing anyway."
        fi
    else
        log_success "${cmd} is installed"
    fi
}

check_command "docker"
check_command "docker-compose" "" "--version"
check_command "node" "18" "--version"
check_command "npm" "" "--version"

# Verify Docker daemon is running
if ! docker info &>/dev/null; then
    log_error "Docker daemon is not running. Start it with: sudo systemctl start docker"
    exit 1
fi
log_success "Docker daemon is running"

# ---------------------------------------------------------------------------
# 2. Create .env from .env.example
# ---------------------------------------------------------------------------
log_step "Step 2/6 — Configuring environment"

generate_random_string() {
    local length="${1:-32}"
    openssl rand -hex "$((length / 2))" 2>/dev/null || \
        tr -dc A-Za-z0-9 </dev/urandom 2>/dev/null | head -c "$length"
}

generate_password() {
    local length="${1:-24}"
    # Ensure at least one special character
    local base
    base=$(tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null | head -c "$((length - 4))")
    local special
    special=$(tr -dc '!@#$%^&*_+-=' </dev/urandom 2>/dev/null | head -c 4)
    echo "${base}${special}"
}

set_env_value() {
    local key="$1"
    local value="$2"
    local file="$3"

    if grep -q "^${key}=" "$file" 2>/dev/null; then
        # Replace existing value (portable sed)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
        else
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        fi
    else
        echo "${key}=${value}" >> "$file"
    fi
}

ensure_env_value() {
    local key="$1"
    local generator="${2:-generate_random_string}"
    local description="$3"

    local current_value
    current_value=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || true)

    if [[ -z "$current_value" || "$current_value" == *"CHANGE_ME"* || "$current_value" == *"your_"* ]]; then
        local new_value
        new_value=$($generator)
        set_env_value "$key" "$new_value" "$ENV_FILE"
        log_info "Generated ${description}: ${key}"
    else
        log_success "${description} already set: ${key}"
    fi
}

if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ENV_EXAMPLE" ]]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        log_info "Created .env from .env.example"
    else
        touch "$ENV_FILE"
        log_warn "No .env.example found — created empty .env"
    fi
else
    log_success ".env already exists"
fi

# Generate secrets for any unset / placeholder values
ensure_env_value "POSTGRES_PASSWORD" "generate_password" "PostgreSQL password"
ensure_env_value "N8N_ENCRYPTION_KEY" "generate_random_string 32" "n8n encryption key"
ensure_env_value "JWT_SECRET" "generate_random_string 64" "JWT secret"
ensure_env_value "DISCORD_WEBHOOK_URL" "echo ''" "Discord webhook (set manually)"
ensure_env_value "SLACK_WEBHOOK_URL" "echo ''" "Slack webhook (set manually)"
ensure_env_value "LINKEDIN_API_KEY" "generate_random_string 40" "LinkedIn API key"
ensure_env_value "INSTAGRAM_API_KEY" "generate_random_string 40" "Instagram API key"

log_success "Environment configuration complete"

# ---------------------------------------------------------------------------
# 3. Build Docker images
# ---------------------------------------------------------------------------
log_step "Step 3/6 — Building Docker images"

if [[ ! -f "$COMPOSE_FILE" ]]; then
    log_error "docker-compose.yml not found at ${COMPOSE_FILE}"
    exit 1
fi

docker-compose build 2>&1 | while IFS= read -r line; do
    echo "  ${line}"
done

log_success "Docker images built successfully"

# ---------------------------------------------------------------------------
# 4. Start services
# ---------------------------------------------------------------------------
log_step "Step 4/6 — Starting services (detached)"

docker-compose up -d 2>&1

log_success "Services started in detached mode"

# ---------------------------------------------------------------------------
# 5. Health check — wait for containers to become healthy
# ---------------------------------------------------------------------------
log_step "Step 5/6 — Waiting for services to become healthy"

HEALTHY_SERVICES=()
UNHEALTHY_SERVICES=()

# Get list of services from compose
mapfile -t SERVICES < <(docker-compose config --services 2>/dev/null)

if [[ ${#SERVICES[@]} -eq 0 ]]; then
    log_warn "No services defined in docker-compose.yml"
else
    MAX_WAIT=120  # seconds
    ELAPSED=0
    INTERVAL=5

    while (( ELAPSED < MAX_WAIT )); do
        ALL_HEALTHY=true
        HEALTHY_SERVICES=()
        UNHEALTHY_SERVICES=()

        for svc in "${SERVICES[@]}"; do
            local health
            health=$(docker inspect --format='{{.State.Health.Status}}' \
                "$(docker-compose ps -q "$svc" 2>/dev/null)" 2>/dev/null || echo "unknown")

            case "$health" in
                healthy)
                    HEALTHY_SERVICES+=("$svc")
                    ;;
                unhealthy|starting)
                    ALL_HEALTHY=false
                    UNHEALTHY_SERVICES+=("$svc (${health})")
                    ;;
                *)
                    # Containers without healthcheck are considered running
                    local running
                    running=$(docker inspect --format='{{.State.Running}}' \
                        "$(docker-compose ps -q "$svc" 2>/dev/null)" 2>/dev/null || echo "false")
                    if [[ "$running" == "true" ]]; then
                        HEALTHY_SERVICES+=("$svc (no healthcheck)")
                    else
                        ALL_HEALTHY=false
                        UNHEALTHY_SERVICES+=("$svc (not running)")
                    fi
                    ;;
            esac
        done

        if $ALL_HEALTHY; then
            break
        fi

        echo -ne "  Waiting... (${ELAPSED}s / ${MAX_WAIT}s) — ${#HEALTHY_SERVICES[@]}/${#SERVICES[@]} healthy\r"
        sleep "$INTERVAL"
        (( ELAPSED += INTERVAL ))
    done
    echo "" # newline after progress
fi

# Report results
for svc in "${HEALTHY_SERVICES[@]+"${HEALTHY_SERVICES[@]}"}"; do
    log_success "${svc}"
done

if [[ ${#UNHEALTHY_SERVICES[@]} -gt 0 ]]; then
    log_warn "The following services did not become healthy in time:"
    for svc in "${UNHEALTHY_SERVICES[@]+"${UNHEALTHY_SERVICES[@]}"}"; do
        log_warn "  • ${svc}"
    done
    log_warn "Check logs with: docker-compose logs <service>"
fi

# ---------------------------------------------------------------------------
# 6. Print status and access URLs
# ---------------------------------------------------------------------------
log_step "Step 6/6 — Deployment summary"

echo ""
echo -e "${CYAN}${BOLD}┌─────────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}${BOLD}│  🚀  Deployment Complete                                     │${NC}"
echo -e "${CYAN}${BOLD}├─────────────────────────────────────────────────────────────┤${NC}"

# Determine host
HOST="${HOSTNAME:-localhost}"

# Attempt to detect external IP
EXTERNAL_IP=$(curl -sf --max-time 3 ifconfig.me 2>/dev/null || echo "${HOST}")

# Read ports from .env or defaults
N8N_PORT="${N8N_PORT:-5678}"
PLAYWRIGHT_PORT="${PLAYWRIGHT_PORT:-3100}"

echo -e "${CYAN}${BOLD}│${NC}"
echo -e "${CYAN}${BOLD}│${NC}  ${BOLD}Services:${NC}"
echo -e "${CYAN}${BOLD}│${NC}    • n8n Workflow Editor : ${GREEN}http://${EXTERNAL_IP}:${N8N_PORT}${NC}"
echo -e "${CYAN}${BOLD}│${NC}    • Playwright Server   : ${GREEN}http://${EXTERNAL_IP}:${PLAYWRIGHT_PORT}${NC}"
echo -e "${CYAN}${BOLD}│${NC}    • PostgreSQL          : ${GREEN}localhost:5432${NC}"
echo -e "${CYAN}${BOLD}│${NC}"
echo -e "${CYAN}${BOLD}│${NC}  ${BOLD}Container Status:${NC}"

# Show container status
docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Ports}}" 2>/dev/null \
    | sed 's/^/│  /' | sed 's/$/│/'

echo -e "${CYAN}${BOLD}│${NC}"
echo -e "${CYAN}${BOLD}│${NC}  ${BOLD}Useful Commands:${NC}"
echo -e "${CYAN}${BOLD}│${NC}    docker-compose logs -f        # Tail logs"
echo -e "${CYAN}${BOLD}│${NC}    docker-compose restart <svc>  # Restart a service"
echo -e "${CYAN}${BOLD}│${NC}    ./scripts/health-check.sh     # Health monitoring"
echo -e "${CYAN}${BOLD}│${NC}    ./scripts/backup.sh           # Create backup"
echo -e "${CYAN}${BOLD}│${NC}"
echo -e "${CYAN}${BOLD}└─────────────────────────────────────────────────────────────┘${NC}"
echo ""
log_success "Done! Your automation environment is ready."
