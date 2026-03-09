# ImpulsaEdu – API Contracts

> All requests and responses use `Content-Type: application/json`.  
> Protected endpoints require `Authorization: Bearer <access_token>` header.  
> Auth is role-based:  `staff` — any logged-in user |  `admin` — only users with role `admin`.

---

## auth-service  (`/auth`)

### POST /auth/login

Authenticates a user and returns a JWT access token plus a refresh token.

**Auth required**: No

**Request body**
```json
{
  "email": "staff@impulsaedu.org",
  "password": "secret123"
}
```

**Response `200 OK`**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<opaque_token>",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "staff@impulsaedu.org",
    "full_name": "Ana García",
    "role": "staff"
  }
}
```

**Errors**
| Code | Message |
|---|---|
| `401` | `invalid credentials` |
| `403` | `account is inactive` |

---

### POST /auth/refresh

Issues a new access token using a valid refresh token.

**Auth required**: No (refresh token in body)

**Request body**
```json
{ "refresh_token": "<opaque_token>" }
```

**Response `200 OK`**
```json
{
  "access_token": "<jwt>",
  "expires_in": 900
}
```

**Errors**: `401` if token is expired or revoked.

---

### POST /auth/logout

Revokes the refresh token.

**Auth required**: `staff`

**Request body**
```json
{ "refresh_token": "<opaque_token>" }
```

**Response `204 No Content`**

---

### GET /auth/me

Returns the profile of the authenticated user.

**Auth required**: `staff`

**Response `200 OK`**
```json
{
  "id": "uuid",
  "email": "staff@impulsaedu.org",
  "full_name": "Ana García",
  "role": "staff",
  "is_active": true
}
```

---

## api-service — Users  (`/api/v1/users`)

### GET /api/v1/users

List all users.

**Auth required**: `admin`

**Query params**: `?role=staff|admin` `?is_active=true|false`

**Response `200 OK`**
```json
{
  "items": [
    { "id": "uuid", "email": "...", "full_name": "...", "role": "admin", "is_active": true }
  ],
  "total": 5
}
```

---

### POST /api/v1/users

Create a new NGO user.

**Auth required**: `admin`

**Request body**
```json
{
  "email": "newstaff@impulsaedu.org",
  "password": "initialPass123",
  "full_name": "Carlos López",
  "role": "staff"
}
```

**Response `201 Created`** — returns created user object (no password).

**Errors**: `409` if email already exists.

---

### PUT /api/v1/users/:id

Update a user (admin) or own profile (staff with own ID).

**Auth required**: `admin` (any user) or `staff` (own profile only)

**Request body** (all fields optional)
```json
{
  "full_name": "Carlos López Jr.",
  "password": "newPassword456"
}
```

**Response `200 OK`** — updated user object.

---

### PATCH /api/v1/users/:id/deactivate

Deactivate a user (soft delete).

**Auth required**: `admin`

**Response `200 OK`**

---

## api-service — Schools  (`/api/v1/schools`)

### GET /api/v1/schools

List schools with optional filters. **Public endpoint** — no auth required.

**Query params**
| Param | Type | Description |
|---|---|---|
| `region` | string | Filter by region (exact match) |
| `category` | string | Filter by category of need (exact match) |
| `status` | `active\|archived` | Default: `active` |
| `page` | int | Pagination (default: 1) |
| `per_page` | int | Items per page (default: 20, max: 100) |

**Response `200 OK`**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Escuela Primaria Juárez",
      "region": "Jalisco",
      "category": "Infrastructure",
      "description": "...",
      "funding_goal": 50000.00,
      "confirmed_value": 22500.00,
      "progress_pct": 45.00,
      "status": "active"
    }
  ],
  "total": 12,
  "page": 1,
  "per_page": 20
}
```

---

### GET /api/v1/schools/:id

Get a single school with its progress bar values.

**Auth required**: No

**Response `200 OK`** — single school object (same shape as list item).

**Errors**: `404` if not found.

---

### POST /api/v1/schools

Create a school.

**Auth required**: `staff`

**Request body**
```json
{
  "name": "Escuela Primaria Juárez",
  "region": "Jalisco",
  "category": "Infrastructure",
  "description": "Needs new bathrooms and a library.",
  "funding_goal": 50000.00
}
```

**Response `201 Created`** — created school object.

**Errors**: `409` if a school with the same name already exists in that region.

---

### PUT /api/v1/schools/:id

Update a school.

**Auth required**: `staff`

**Request body** — same fields as POST, all optional.

**Response `200 OK`**

**Errors**: `404`, `409` (name/region conflict).

---

### PATCH /api/v1/schools/:id/archive

Archive a school (soft delete — sets `status = 'archived'`).

**Auth required**: `staff`

**Response `200 OK`**

---

## api-service — Donors  (`/api/v1/donors`)

### GET /api/v1/donors

List donors.

**Auth required**: `staff`

**Query params**: `?type=individual|corporate` `?name=<partial>` `?is_active=true|false`

**Response `200 OK`**
```json
{
  "items": [
    {
      "id": "uuid",
      "full_name": "Empresa XYZ S.A.",
      "email": "contacto@xyz.com",
      "tax_id": "XYZ890101AAA",
      "phone": "+52 33 1234 5678",
      "type": "corporate",
      "organization_name": "Empresa XYZ S.A.",
      "notes": "...",
      "is_active": true,
      "donation_count": 3
    }
  ],
  "total": 8,
  "page": 1,
  "per_page": 20
}
```

---

### GET /api/v1/donors/:id

Get a donor with their donation history.

**Auth required**: `staff`

**Response `200 OK`**
```json
{
  "id": "uuid",
  "full_name": "...",
  "type": "corporate",
  "donations": [
    {
      "id": "uuid",
      "school_name": "Escuela Primaria Juárez",
      "type": "monetary",
      "amount": 10000.00,
      "state": "completed",
      "registered_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/v1/donors

Create a donor.

**Auth required**: `staff`

**Request body**
```json
{
  "full_name": "Juan Pérez",
  "email": "juan@example.com",
  "tax_id": null,
  "phone": "+52 33 9876 5432",
  "type": "individual",
  "organization_name": null,
  "notes": "Met at conference"
}
```

**Response `201 Created`**

**Errors**: `409` if email or tax_id already exists.

---

### PUT /api/v1/donors/:id

Update a donor.

**Auth required**: `staff`

**Request body** — same fields as POST, all optional.

**Response `200 OK`**

---

### PATCH /api/v1/donors/:id/deactivate

Soft-archive a donor.

**Auth required**: `staff`

**Response `200 OK`**

---

## api-service — Donations  (`/api/v1/donations`)

### GET /api/v1/donations

List donations.

**Auth required**: `staff`

**Query params**
| Param | Type |
|---|---|
| `school_id` | UUID |
| `donor_id` | UUID |
| `state` | `registered\|approved\|in_delivery\|delivered\|completed\|cancelled` |
| `type` | `material\|monetary` |
| `page` / `per_page` | int |

**Response `200 OK`**
```json
{
  "items": [
    {
      "id": "uuid",
      "donor": { "id": "uuid", "full_name": "Juan Pérez" },
      "school": { "id": "uuid", "name": "Escuela Primaria Juárez" },
      "type": "monetary",
      "amount": 10000.00,
      "estimated_value": null,
      "state": "approved",
      "delivery_mode": "donor_to_ngo",
      "registered_at": "2026-02-01T09:00:00Z"
    }
  ],
  "total": 25
}
```

---

### GET /api/v1/donations/:id

Get a single donation with full delivery and timeline info.

**Auth required**: `staff`

**Response `200 OK`**
```json
{
  "id": "uuid",
  "donor": { "id": "uuid", "full_name": "Juan Pérez", "type": "individual" },
  "school": { "id": "uuid", "name": "Escuela Primaria Juárez", "region": "Jalisco" },
  "type": "material",
  "description": "20 laptops",
  "amount": null,
  "estimated_value": 60000.00,
  "state": "in_delivery",
  "observations": "Donor will package and ship",
  "delivery": {
    "mode": "donor_to_school",
    "shipping_address": "Av. Universidad 1234, Guadalajara",
    "tracking_info": "DHL 123456",
    "notes": null
  },
  "timeline": {
    "registered_at": "2026-02-01T09:00:00Z",
    "approved_at": "2026-02-03T14:30:00Z",
    "in_delivery_at": "2026-02-10T08:00:00Z",
    "delivered_at": null,
    "completed_at": null,
    "cancelled_at": null
  }
}
```

---

### POST /api/v1/donations

Create a donation record.

**Auth required**: `staff`

**Request body**
```json
{
  "donor_id": "uuid",
  "school_id": "uuid",
  "type": "material",
  "description": "20 laptops donated by Empresa XYZ",
  "amount": null,
  "estimated_value": 60000.00,
  "observations": "Donor will package",
  "delivery": {
    "mode": "donor_to_school",
    "shipping_address": "Av. Universidad 1234, Guadalajara",
    "tracking_info": null,
    "notes": null
  }
}
```

**Response `201 Created`** — full donation object.

**Errors**
| Code | Reason |
|---|---|
| `400` | Missing required field (e.g. `amount` for monetary, `estimated_value` for material) |
| `404` | `donor_id` or `school_id` not found |
| `422` | School is archived |

---

### PUT /api/v1/donations/:id

Update editable fields (description, observations, delivery details). Does **not** change state.

**Auth required**: `staff`

**Response `200 OK`**

---

### PATCH /api/v1/donations/:id/state

Advance or cancel a donation's workflow state.

**Auth required**: `staff`

**Request body**
```json
{
  "state": "approved",
  "observations": "Reviewed and approved by coordinator"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "state": "approved",
  "approved_at": "2026-02-03T14:30:00Z"
}
```

**Errors**
| Code | Reason |
|---|---|
| `422` | Transition not allowed (e.g., `completed` → `in_delivery`) |

---

## api-service — Reports  (`/api/v1/reports`)

All report endpoints are **admin** only.

---

### GET /api/v1/reports/donations-by-school

Donation summary grouped by school.

**Auth required**: `admin`

**Query params**: `?school_id=<uuid>` (optional — omit to get all schools)

**Response `200 OK`**
```json
[
  {
    "school_id": "uuid",
    "school_name": "Escuela Primaria Juárez",
    "total_monetary": 30000.00,
    "total_material_value": 60000.00,
    "total_donations": 5,
    "pending": 2,
    "completed": 3
  }
]
```

---

### GET /api/v1/reports/donations-by-donor

Donation summary grouped by donor.

**Auth required**: `admin`

**Query params**: `?donor_id=<uuid>` (optional)

**Response `200 OK`**
```json
[
  {
    "donor_id": "uuid",
    "donor_name": "Empresa XYZ S.A.",
    "total_donations": 3,
    "total_value": 70000.00,
    "schools_supported": 2
  }
]
```

---

### GET /api/v1/reports/pending-deliveries

All donations currently in state `approved` or `in_delivery`.

**Auth required**: `admin`

**Response `200 OK`** — list of donation objects (same shape as `GET /api/v1/donations`).

---

### GET /api/v1/reports/completed

All donations in state `completed`.

**Auth required**: `admin`

**Response `200 OK`** — list of donation objects.

---

### GET /api/v1/reports/export

Export report data as CSV.

**Auth required**: `admin`

**Query params**
| Param | Values | Required |
|---|---|---|
| `report` | `donations-by-school`, `donations-by-donor`, `pending-deliveries`, `completed` | Yes |

**Response `200 OK`**  
`Content-Type: text/csv`  
`Content-Disposition: attachment; filename="report-<date>.csv"`

---

## Error Response Format

All errors return a consistent envelope:

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot transition from 'completed' to 'in_delivery'",
    "details": null
  }
}
```

| HTTP Status | When to use |
|---|---|
| `400 Bad Request` | Missing or malformed input |
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | Valid JWT but insufficient role |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate entity (school, donor) |
| `422 Unprocessable Entity` | Business rule violation (state transition, archived school) |
| `500 Internal Server Error` | Unexpected server fault |
