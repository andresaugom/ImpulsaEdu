#!/usr/bin/env bash
# seed.sh — Seeds ImpulsaEdu with sample data via the REST API.
# Usage: ./scripts/seed.sh [AUTH_URL] [API_URL]
# Defaults: AUTH_URL=http://localhost:3000  API_URL=http://localhost:4000/api/v1

set -euo pipefail

AUTH_URL="${1:-http://localhost:3000}"
API_URL="${2:-http://localhost:4000/api/v1}"

# ─── helpers ────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

info()    { echo -e "${YELLOW}[seed]${RESET} $*"; }
success() { echo -e "${GREEN}[ok]${RESET}   $*"; }
die()     { echo -e "${RED}[err]${RESET}  $*" >&2; exit 1; }

# POST helper — prints response body on success; prints error and returns 1 on failure.
# Callers decide whether to die or handle the error gracefully.
post() {
  local url="$1"
  local body="$2"
  local token="${3:-}"
  local auth_header=()
  [[ -n "$token" ]] && auth_header=(-H "Authorization: Bearer ${token}")

  local response http_code body_out
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$url" \
    -H "Content-Type: application/json" \
    "${auth_header[@]}" \
    -d "$body")

  http_code=$(tail -n1 <<< "$response")
  body_out=$(head -n -1 <<< "$response")

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    echo -e "${RED}[err]${RESET}  POST $url → HTTP $http_code: $body_out" >&2
    return 1
  fi

  echo "$body_out"
}

# Extract a JSON field value (no jq dependency)
json_get() {
  local json="$1" key="$2"
  echo "$json" | grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
    | head -1 | sed 's/.*:[[:space:]]*"\(.*\)"/\1/'
}

# GET helper
get() {
  local url="$1" token="${2:-}"
  local auth_header=()
  [[ -n "$token" ]] && auth_header=(-H "Authorization: Bearer ${token}")
  curl -s -X GET "$url" "${auth_header[@]}"
}

# Create a user idempotently: try POST; on 409 find the existing record by email.
ensure_user() {
  local email="$1" payload="$2"
  local resp http_code body_out

  resp=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "$payload")
  http_code=$(tail -n1 <<< "$resp")
  body_out=$(head -n -1 <<< "$resp")

  if [[ "$http_code" == "201" ]]; then
    echo "$body_out"
    return 0
  elif [[ "$http_code" == "409" ]]; then
    # Already exists — find by email in the users list
    local list
    list=$(get "${API_URL}/users" "$TOKEN")
    # Extract the id that sits before the email match in the JSON item
    local id
    id=$(echo "$list" | grep -o '"id":"[^"]*","email":"'"$email"'"' | grep -o '"id":"[^"]*"' | sed 's/"id":"//;s/"//')
    [[ -z "$id" ]] && die "User ${email} already exists but could not find id in list"
    # Return a minimal JSON so the caller can extract the id
    echo "{\"id\":\"${id}\"}"
    return 0
  else
    echo -e "${RED}[err]${RESET}  POST ${API_URL}/users → HTTP $http_code: $body_out" >&2
    return 1
  fi
}

# ─── step 0: bootstrap admin account ────────────────────────────────────────

info "Registering bootstrap admin …"
admin_payload='{
  "email":     "admin@schoolfinder.org",
  "password":  "Admin1234!",
  "firstname": "Admin",
  "lastname":  "Bootstrap"
}'
if post "${AUTH_URL}/auth/register" "$admin_payload" > /dev/null; then
  success "Admin registered"
else
  info "Admin already exists — skipping registration"
fi

info "Logging in as admin …"
login_payload='{"email":"admin@schoolfinder.org","password":"Admin1234!"}'
login_resp=$(post "${AUTH_URL}/auth/login" "$login_payload") || die "Login failed"
TOKEN=$(json_get "$login_resp" "accessToken")
[[ -z "$TOKEN" ]] && die "Could not extract accessToken from login response"
success "Logged in — token obtained"

# ─── step 1: create users ───────────────────────────────────────────────────

info "Creating 2 users …"

user1=$(ensure_user "maria.garcia@example.com" '{
  "email":     "maria.garcia@example.com",
  "password":  "Staff1234!",
  "full_name": "María García",
  "role":      "staff"
}') || die "Failed to create/find user 1"
USER1_ID=$(json_get "$user1" "id")
success "User 1 — id=${USER1_ID}  (María García, staff)"

user2=$(ensure_user "carlos.reyes@example.com" '{
  "email":     "carlos.reyes@example.com",
  "password":  "Staff1234!",
  "full_name": "Carlos Reyes",
  "role":      "admin"
}') || die "Failed to create/find user 2"
USER2_ID=$(json_get "$user2" "id")
success "User 2 — id=${USER2_ID}  (Carlos Reyes, admin)"

# ─── step 2: create schools ─────────────────────────────────────────────────

info "Creating 5 schools …"

school1=$(post "${API_URL}/schools" '{
  "name":         "Escuela Primaria Benito Juárez",
  "region":       "Jalisco",
  "category":     "Infrastructure",
  "description":  "Necesita remodelación de aulas y sanitarios.",
  "funding_goal": 75000
}' "$TOKEN") || die "Failed to create school 1"
S1_ID=$(json_get "$school1" "id")
success "School 1 — id=${S1_ID}  (Benito Juárez, Jalisco)"

school2=$(post "${API_URL}/schools" '{
  "name":         "Escuela Secundaria Lázaro Cárdenas",
  "region":       "Michoacán",
  "category":     "Technology",
  "description":  "Requiere equipos de cómputo y conectividad.",
  "funding_goal": 120000
}' "$TOKEN") || die "Failed to create school 2"
S2_ID=$(json_get "$school2" "id")
success "School 2 — id=${S2_ID}  (Lázaro Cárdenas, Michoacán)"

school3=$(post "${API_URL}/schools" '{
  "name":         "Escuela Primaria Emiliano Zapata",
  "region":       "Oaxaca",
  "category":     "Supplies",
  "description":  "Carece de material didáctico básico.",
  "funding_goal": 35000
}' "$TOKEN") || die "Failed to create school 3"
S3_ID=$(json_get "$school3" "id")
success "School 3 — id=${S3_ID}  (Emiliano Zapata, Oaxaca)"

school4=$(post "${API_URL}/schools" '{
  "name":         "Colegio de Bachilleres del Sur",
  "region":       "Guerrero",
  "category":     "Infrastructure",
  "description":  "Construcción de laboratorio de ciencias.",
  "funding_goal": 200000
}' "$TOKEN") || die "Failed to create school 4"
S4_ID=$(json_get "$school4" "id")
success "School 4 — id=${S4_ID}  (Bachilleres del Sur, Guerrero)"

school5=$(post "${API_URL}/schools" '{
  "name":         "Escuela Telesecundaria Cuauhtémoc",
  "region":       "Chiapas",
  "category":     "Technology",
  "description":  "Necesita panel solar y equipo de transmisión.",
  "funding_goal": 90000
}' "$TOKEN") || die "Failed to create school 5"
S5_ID=$(json_get "$school5" "id")
success "School 5 — id=${S5_ID}  (Cuauhtémoc, Chiapas)"

# ─── step 3: create donors ──────────────────────────────────────────────────

info "Creating 5 donors …"

donor1=$(post "${API_URL}/donors" '{
  "full_name": "Ana Martínez López",
  "email":     "ana.martinez@gmail.com",
  "tax_id":    "MALA800101ABC",
  "phone":     "+52 33 1234 5678",
  "type":      "individual",
  "notes":     "Donante recurrente desde 2023."
}' "$TOKEN") || die "Failed to create donor 1"
D1_ID=$(json_get "$donor1" "id")
success "Donor 1 — id=${D1_ID}  (Ana Martínez, individual)"

donor2=$(post "${API_URL}/donors" '{
  "full_name":         "Fundación Educativa Visión",
  "email":             "contacto@fundacionvision.org",
  "tax_id":            "FEV990215XY3",
  "phone":             "+52 55 8765 4321",
  "type":              "corporate",
  "organization_name": "Fundación Educativa Visión A.C.",
  "notes":             "Interesados en proyectos de tecnología."
}' "$TOKEN") || die "Failed to create donor 2"
D2_ID=$(json_get "$donor2" "id")
success "Donor 2 — id=${D2_ID}  (Fundación Visión, corporate)"

donor3=$(post "${API_URL}/donors" '{
  "full_name": "Roberto Sánchez Fuentes",
  "email":     "rsanchez@empresa.mx",
  "tax_id":    "SAFR750320QR1",
  "phone":     "+52 81 2233 4455",
  "type":      "individual",
  "notes":     "Prefiere donaciones materiales."
}' "$TOKEN") || die "Failed to create donor 3"
D3_ID=$(json_get "$donor3" "id")
success "Donor 3 — id=${D3_ID}  (Roberto Sánchez, individual)"

donor4=$(post "${API_URL}/donors" '{
  "full_name":         "Grupo Industrial del Norte",
  "email":             "rse@grupoindustrial.com.mx",
  "tax_id":            "GIN850601ZZ9",
  "phone":             "+52 81 5566 7788",
  "type":              "corporate",
  "organization_name": "Grupo Industrial del Norte S.A. de C.V.",
  "notes":             "Programa RSE activo."
}' "$TOKEN") || die "Failed to create donor 4"
D4_ID=$(json_get "$donor4" "id")
success "Donor 4 — id=${D4_ID}  (Grupo Industrial del Norte, corporate)"

donor5=$(post "${API_URL}/donors" '{
  "full_name": "Lucía Flores Ramos",
  "email":     "lucia.flores@hotmail.com",
  "phone":     "+52 55 9988 7766",
  "type":      "individual",
  "notes":     "Contactada en evento de recaudación 2025."
}' "$TOKEN") || die "Failed to create donor 5"
D5_ID=$(json_get "$donor5" "id")
success "Donor 5 — id=${D5_ID}  (Lucía Flores, individual)"

# ─── summary ────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Seed complete.${RESET}"
echo ""
echo "  Admin     admin@schoolfinder.org / Admin1234!"
echo ""
echo "  Users"
echo "    ${USER1_ID}  María García (staff)   maria.garcia@example.com"
echo "    ${USER2_ID}  Carlos Reyes (admin)   carlos.reyes@example.com"
echo ""
echo "  Schools"
echo "    ${S1_ID}  Benito Juárez (Jalisco)"
echo "    ${S2_ID}  Lázaro Cárdenas (Michoacán)"
echo "    ${S3_ID}  Emiliano Zapata (Oaxaca)"
echo "    ${S4_ID}  Bachilleres del Sur (Guerrero)"
echo "    ${S5_ID}  Cuauhtémoc (Chiapas)"
echo ""
echo "  Donors"
echo "    ${D1_ID}  Ana Martínez López (individual)"
echo "    ${D2_ID}  Fundación Educativa Visión (corporate)"
echo "    ${D3_ID}  Roberto Sánchez Fuentes (individual)"
echo "    ${D4_ID}  Grupo Industrial del Norte (corporate)"
echo "    ${D5_ID}  Lucía Flores Ramos (individual)"
