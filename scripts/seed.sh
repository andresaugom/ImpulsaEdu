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
  "email":     "admin@impulsaedu.org",
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
login_payload='{"email":"admin@impulsaedu.org","password":"Admin1234!"}'
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
  "region":      "Jalisco",
  "school":      "Plantel 01",
  "name":        "Escuela Primaria Benito Juárez",
  "employees":   8,
  "students":    120,
  "level":       "Primaria",
  "cct":         "14EPR0001A",
  "mode":        "SEP-General",
  "shift":       "Matutino",
  "address":     "Calle Hidalgo 45, Col. Centro",
  "location":    "Guadalajara",
  "category":    "Federal",
  "description": "Necesita remodelación de aulas y sanitarios.",
  "goal":        75000
}' "$TOKEN") || die "Failed to create school 1"
S1_ID=$(json_get "$school1" "id")
success "School 1 — id=${S1_ID}  (Benito Juárez, Jalisco)"

school2=$(post "${API_URL}/schools" '{
  "region":      "Michoacán",
  "school":      "Plantel 02",
  "name":        "Escuela Secundaria Lázaro Cárdenas",
  "employees":   15,
  "students":    280,
  "level":       "Secundaria",
  "cct":         "16ESU0002B",
  "mode":        "SEP-General",
  "shift":       "Matutino",
  "address":     "Av. Morelos 200, Col. Juárez",
  "location":    "Morelia",
  "category":    "Estatal",
  "description": "Requiere equipos de cómputo y conectividad.",
  "goal":        120000
}' "$TOKEN") || die "Failed to create school 2"
S2_ID=$(json_get "$school2" "id")
success "School 2 — id=${S2_ID}  (Lázaro Cárdenas, Michoacán)"

school3=$(post "${API_URL}/schools" '{
  "region":      "Oaxaca",
  "school":      "Plantel 03",
  "name":        "Escuela Primaria Emiliano Zapata",
  "employees":   4,
  "students":    65,
  "level":       "Primaria",
  "cct":         "20EPR0003C",
  "mode":        "CONAFE",
  "shift":       "Matutino",
  "address":     "Camino Real s/n, Comunidad La Sierra",
  "location":    "San Juan Mixtepec",
  "category":    "Federalizado",
  "description": "Carece de material didáctico básico.",
  "goal":        35000
}' "$TOKEN") || die "Failed to create school 3"
S3_ID=$(json_get "$school3" "id")
success "School 3 — id=${S3_ID}  (Emiliano Zapata, Oaxaca)"

school4=$(post "${API_URL}/schools" '{
  "region":      "Guerrero",
  "school":      "Plantel 04",
  "name":        "Colegio de Bachilleres del Sur",
  "employees":   30,
  "students":    450,
  "level":       "Preparatoria",
  "cct":         "12EBH0004D",
  "mode":        "SEP-General",
  "shift":       "Vespertino",
  "address":     "Blvd. de las Naciones 1000",
  "location":    "Acapulco",
  "category":    "Estatal",
  "description": "Construcción de laboratorio de ciencias.",
  "goal":        200000
}' "$TOKEN") || die "Failed to create school 4"
S4_ID=$(json_get "$school4" "id")
success "School 4 — id=${S4_ID}  (Bachilleres del Sur, Guerrero)"

school5=$(post "${API_URL}/schools" '{
  "region":      "Chiapas",
  "school":      "Plantel 05",
  "name":        "Escuela Telesecundaria Cuauhtémoc",
  "employees":   3,
  "students":    48,
  "level":       "Secundaria",
  "cct":         "07ETV0005E",
  "mode":        "CONAFE",
  "shift":       "Matutino",
  "address":     "Calle Principal s/n, Ejido Nuevo",
  "location":    "Ocosingo",
  "category":    "Federal",
  "description": "Necesita panel solar y equipo de transmisión.",
  "goal":        90000
}' "$TOKEN") || die "Failed to create school 5"
S5_ID=$(json_get "$school5" "id")
success "School 5 — id=${S5_ID}  (Cuauhtémoc, Chiapas)"

# ─── step 3: create donors ──────────────────────────────────────────────────

info "Creating 5 donors …"

donor1=$(post "${API_URL}/donors" '{
  "name":        "Ana Martínez López",
  "region":      "Jalisco",
  "donor_type":  "Fisica",
  "description": "Donante recurrente desde 2023.",
  "email":       "ana.martinez@gmail.com",
  "phone":       "+52 33 1234 5678"
}' "$TOKEN") || die "Failed to create donor 1"
D1_ID=$(json_get "$donor1" "id")
success "Donor 1 — id=${D1_ID}  (Ana Martínez, Fisica)"

donor2=$(post "${API_URL}/donors" '{
  "name":        "Fundación Educativa Visión A.C.",
  "region":      "Ciudad de México",
  "donor_type":  "Moral",
  "description": "Interesados en proyectos de tecnología.",
  "email":       "contacto@fundacionvision.org",
  "phone":       "+52 55 8765 4321"
}' "$TOKEN") || die "Failed to create donor 2"
D2_ID=$(json_get "$donor2" "id")
success "Donor 2 — id=${D2_ID}  (Fundación Visión, Moral)"

donor3=$(post "${API_URL}/donors" '{
  "name":        "Roberto Sánchez Fuentes",
  "region":      "Nuevo León",
  "donor_type":  "Fisica",
  "description": "Prefiere donaciones materiales.",
  "email":       "rsanchez@empresa.mx",
  "phone":       "+52 81 2233 4455"
}' "$TOKEN") || die "Failed to create donor 3"
D3_ID=$(json_get "$donor3" "id")
success "Donor 3 — id=${D3_ID}  (Roberto Sánchez, Fisica)"

donor4=$(post "${API_URL}/donors" '{
  "name":        "Grupo Industrial del Norte S.A. de C.V.",
  "region":      "Nuevo León",
  "donor_type":  "Moral",
  "description": "Programa RSE activo.",
  "email":       "rse@grupoindustrial.com.mx",
  "phone":       "+52 81 5566 7788"
}' "$TOKEN") || die "Failed to create donor 4"
D4_ID=$(json_get "$donor4" "id")
success "Donor 4 — id=${D4_ID}  (Grupo Industrial del Norte, Moral)"

donor5=$(post "${API_URL}/donors" '{
  "name":        "Lucía Flores Ramos",
  "region":      "Ciudad de México",
  "donor_type":  "Fisica",
  "description": "Contactada en evento de recaudación 2025.",
  "email":       "lucia.flores@hotmail.com",
  "phone":       "+52 55 9988 7766"
}' "$TOKEN") || die "Failed to create donor 5"
D5_ID=$(json_get "$donor5" "id")
success "Donor 5 — id=${D5_ID}  (Lucía Flores, Fisica)"

# ─── step 4: create donations ───────────────────────────────────────────────

info "Creating 3 donations …"

donation1=$(post "${API_URL}/donations" "{
  \"donor_id\":      \"${D1_ID}\",
  \"school_id\":     \"${S1_ID}\",
  \"donation_type\": \"Monetaria\",
  \"amount\":        50000,
  \"description\":   \"Apoyo para remodelación de aulas\"
}" "$TOKEN") || die "Failed to create donation 1"
DN1_ID=$(json_get "$donation1" "id")
success "Donation 1 — id=${DN1_ID}  (Ana Martínez → Benito Juárez, Monetaria \$50,000)"

donation2=$(post "${API_URL}/donations" "{
  \"donor_id\":      \"${D2_ID}\",
  \"school_id\":     \"${S2_ID}\",
  \"donation_type\": \"Material\",
  \"amount\":        0,
  \"description\":   \"Equipos de cómputo y accesorios\",
  \"items\": [
    {\"item_name\": \"Laptop\",         \"quantity\": 20, \"amount\": 60000},
    {\"item_name\": \"Router WiFi\",    \"quantity\": 2,  \"amount\": 4000},
    {\"item_name\": \"Proyector\",      \"quantity\": 1,  \"amount\": 8000}
  ]
}" "$TOKEN") || die "Failed to create donation 2"
DN2_ID=$(json_get "$donation2" "id")
success "Donation 2 — id=${DN2_ID}  (Fundación Visión → Lázaro Cárdenas, Material)"

donation3=$(post "${API_URL}/donations" "{
  \"donor_id\":      \"${D3_ID}\",
  \"school_id\":     \"${S3_ID}\",
  \"donation_type\": \"Monetaria\",
  \"amount\":        20000,
  \"description\":   \"Compra de material didáctico\"
}" "$TOKEN") || die "Failed to create donation 3"
DN3_ID=$(json_get "$donation3" "id")
success "Donation 3 — id=${DN3_ID}  (Roberto Sánchez → Emiliano Zapata, Monetaria \$20,000)"

# ─── summary ────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}Seed complete.${RESET}"
echo ""
echo "  Admin     admin@impulsaedu.org / Admin1234!"
echo ""
echo "  Users"
echo "    ${USER1_ID}  María García (staff)   maria.garcia@example.com"
echo "    ${USER2_ID}  Carlos Reyes (admin)   carlos.reyes@example.com"
echo ""
echo "  Schools"
echo "    ${S1_ID}  Benito Juárez (Jalisco, Federal, Primaria)"
echo "    ${S2_ID}  Lázaro Cárdenas (Michoacán, Estatal, Secundaria)"
echo "    ${S3_ID}  Emiliano Zapata (Oaxaca, Federalizado, Primaria)"
echo "    ${S4_ID}  Bachilleres del Sur (Guerrero, Estatal, Preparatoria)"
echo "    ${S5_ID}  Cuauhtémoc (Chiapas, Federal, Secundaria)"
echo ""
echo "  Donors"
echo "    ${D1_ID}  Ana Martínez López (Fisica, Jalisco)"
echo "    ${D2_ID}  Fundación Educativa Visión A.C. (Moral, CDMX)"
echo "    ${D3_ID}  Roberto Sánchez Fuentes (Fisica, Nuevo León)"
echo "    ${D4_ID}  Grupo Industrial del Norte S.A. de C.V. (Moral, Nuevo León)"
echo "    ${D5_ID}  Lucía Flores Ramos (Fisica, CDMX)"
echo ""
echo "  Donations"
echo "    ${DN1_ID}  Ana Martínez → Benito Juárez         Monetaria  \$50,000"
echo "    ${DN2_ID}  Fundación Visión → Lázaro Cárdenas   Material   (3 items)"
echo "    ${DN3_ID}  Roberto Sánchez → Emiliano Zapata    Monetaria  \$20,000"
