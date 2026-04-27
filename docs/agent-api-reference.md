# ImpulsaEdu – AI Agent API Reference

> **Audience**: AI coding agents implementing [issue #50](https://github.com/andresaugom/ImpulsaEdu/issues/50) —
> frontend service layer integration for all backend endpoints.

---

## Architecture Overview

Two independent backend services run behind different ports and are accessed
via environment variables in the frontend:

| Service   | Env var                    | Default                       | Base path    |
|-----------|----------------------------|-------------------------------|--------------|
| `auth`    | `NEXT_PUBLIC_AUTH_API_URL` | `http://localhost:3000`       | `/auth`      |
| `app_api` | `NEXT_PUBLIC_APP_API_URL`  | `http://localhost:4000`       | `/api/v1`    |

The frontend already defines these constants in `frontend/src/lib/apiClient.ts`:

```typescript
export const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL ?? 'http://localhost:3000';
export const APP_BASE  = `${process.env.NEXT_PUBLIC_APP_API_URL ?? 'http://localhost:4000'}/api/v1`;
```

---

## Authentication Flow

JWT-based auth with short-lived access tokens (15 min) and long-lived refresh tokens (7 days).

1. `POST /auth/login` → receive `{ accessToken, refreshToken }`
2. Attach `Authorization: Bearer <accessToken>` to protected requests
3. On 401, `POST /auth/refresh` with `{ refreshToken }` → new token pair (rotation)
4. `POST /auth/logout` revokes the refresh token

**Token storage**: `localStorage` keys `accessToken` and `refreshToken`.

**Role model**: Two roles exist — `staff` (any authenticated user) and `admin`.

---

## Implementation Status

### ✅ Already implemented — `frontend/src/lib/`

| File              | Covers                                                           |
|-------------------|------------------------------------------------------------------|
| `apiClient.ts`    | Base fetch wrapper, token helpers, auto-refresh on 401, `ApiError` |
| `authService.ts`  | `login`, `logout`, `getMe`, `isAuthenticated`                   |
| `donorsService.ts`| `fetchDonors`, `createDonor`, `updateDonor`, `deactivateDonor` |
| `schoolsService.ts` | `fetchSchools`, `createSchool`, `updateSchool`, `archiveSchool` |

### ❌ Missing — needs to be created

| File                 | Endpoints to cover                                               |
|----------------------|------------------------------------------------------------------|
| `usersService.ts`    | `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `PATCH /users/:id/deactivate` |
| `donationsService.ts`| `GET /donations`, `GET /donations/:id`, `POST /donations`, `PUT /donations/:id`, `PATCH /donations/:id/state` |
| `reportsService.ts`  | `GET /reports/donations-by-school`, `GET /reports/donations-by-donor`, `GET /reports/pending-deliveries`, `GET /reports/completed`, `GET /reports/export` |
| `xlsxService.ts`     | `POST /xlsx/upload`, `GET /xlsx/download`                        |

Also missing from `authService.ts`:
- `POST /auth/register` (admin/seeding use case)

---

## Service File Conventions

Every service file follows the same pattern established by existing files:

```typescript
// 1. Import APP_BASE / AUTH_BASE and apiRequest from apiClient
import { APP_BASE, apiRequest } from './apiClient';

// 2. Declare backend response interfaces (prefix with `Api`)
interface ApiResource { ... }

// 3. Declare frontend/component-facing interfaces or re-export ApiResource directly
export interface ResourceFilters { ... }
export interface CreateResourcePayload { ... }

// 4. Adapter function if field names differ between backend and frontend
function toFrontend(r: ApiResource): Resource { ... }

// 5. Exported async functions — one per endpoint
export async function fetchResources(filters: ResourceFilters): Promise<...> { ... }
```

**Error handling**: `apiRequest` throws `ApiError` on non-2xx. Callers may catch
`ApiError` and inspect `.status` and `.code`. Do **not** add try/catch inside
service functions unless you need to transform or rethrow the error.

---

## Error Response Format

All `app_api` errors return:

```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable message",
    "details": null
  }
}
```

`auth` service errors return a flat object: `{ "error": "error_code_string" }`.

`apiRequest` in `apiClient.ts` already handles extraction — it reads `body.code ?? body.error`.

### HTTP status meanings

| Status | Meaning                                                          |
|--------|------------------------------------------------------------------|
| `400`  | Missing or invalid input fields                                  |
| `401`  | Missing or expired JWT                                           |
| `403`  | Valid JWT but insufficient role                                  |
| `404`  | Resource does not exist                                          |
| `409`  | Unique constraint violation (duplicate email, name+region, etc.) |
| `422`  | Business rule violation (invalid state transition, archived school) |
| `500`  | Unexpected server fault                                          |

---

## AUTH SERVICE  (`/auth`)  — port 3000

### POST /auth/register

Creates a new user. Role is auto-assigned: emails ending in `@schoolfinder.org`
get `admin`; all others get `staff`.

**Auth required**: No

**Request body**

```json
{
  "email": "staff@impulsaedu.org",
  "password": "secret123",
  "firstname": "Ana",
  "lastname": "García"
}
```

**Response `201 Created`**

```json
{
  "message": "Usuario creado",
  "user": {
    "id": "uuid",
    "role": "staff"
  }
}
```

**Error codes**

| Code           | HTTP | Meaning                              |
|----------------|------|--------------------------------------|
| `missing_fields` | 400 | email, password, firstname, or lastname missing |
| `user_exists`  | 400  | Email already registered             |
| `db_error`     | 500  | Database failure                     |

---

### POST /auth/login

**Auth required**: No

**Request body**

```json
{
  "email": "staff@impulsaedu.org",
  "password": "secret123"
}
```

**Response `200 OK`**

> ⚠️ Fields are **camelCase** — `accessToken` / `refreshToken`, not snake_case.

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque_hex_token>"
}
```

JWT payload: `{ sub: userId, email, role, iat, exp }`

**Error codes**

| Code                  | HTTP | Meaning                     |
|-----------------------|------|-----------------------------|
| `invalid_credentials` | 401  | Wrong email or password     |
| `db_error`            | 500  | Database failure            |

---

### POST /auth/refresh

Exchanges a refresh token for a new token pair (rotation: old token is deleted).

**Auth required**: No

**Request body**

```json
{
  "refreshToken": "<opaque_hex_token>"
}
```

**Response `200 OK`**

```json
{
  "accessToken": "<new_jwt>",
  "refreshToken": "<new_opaque_hex_token>"
}
```

**Error codes**

| Code                    | HTTP | Meaning                              |
|-------------------------|------|--------------------------------------|
| `refresh_token_required` | 400 | Body missing `refreshToken`         |
| `invalid_token`         | 401  | Token expired, revoked, or not found |
| `refresh_error`         | 500  | Database failure                     |

---

### GET /auth/me

Returns the authenticated user's profile.

**Auth required**: `staff` — `Authorization: Bearer <accessToken>`

**Response `200 OK`**

```json
{
  "id": "uuid",
  "firstname": "Ana",
  "lastname": "García",
  "email": "staff@impulsaedu.org",
  "role": "staff",
  "created_at": "2026-01-10T08:00:00.000Z"
}
```

> ⚠️ Returns `firstname` and `lastname` separately, **not** `full_name`.
> Existing `AuthUser` interface in `authService.ts` already reflects this.

**Error codes**

| Code             | HTTP | Meaning                              |
|------------------|------|--------------------------------------|
| `token_required` | 401  | No token                             |
| `invalid_access_token` | 403 | Bad or expired token            |
| `user_not_found` | 404  | Token valid but user deleted         |
| `db_error`       | 500  | Database failure                     |

---

### POST /auth/logout

Revokes the refresh token. The access token is not blocklisted (short TTL).

**Auth required**: No (token is in body)

**Request body**

```json
{
  "refreshToken": "<opaque_hex_token>"
}
```

**Response `200 OK`**

```json
{ "message": "Sesión cerrada exitosamente" }
```

**Error codes**

| Code           | HTTP | Meaning                       |
|----------------|------|-------------------------------|
| `token_required` | 400 | Body missing `refreshToken`  |
| `logout_error` | 500  | Database failure              |

---

## APP API — Users  (`/api/v1/users`)  — port 4000

All user endpoints require `admin` role **except** `GET /users/:id` and
`PUT /users/:id`, which staff can use on their **own** `id`.

### TypeScript Interfaces

```typescript
// Backend response shape
interface ApiUser {
  id: string;
  email: string;
  full_name: string;       // formatted as "firstname lastname"
  role: 'admin' | 'staff';
  is_active: boolean;      // true when deleted_at IS NULL
}

interface ApiUsersListResponse {
  items: ApiUser[];
  total: number;
}

// Request payloads
interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'staff';
}

interface UpdateUserPayload {
  full_name?: string;
  password?: string;
}

interface UserFilters {
  role?: 'admin' | 'staff';
  is_active?: boolean;
}
```

---

### GET /api/v1/users  (admin only)

**Auth required**: `admin`

**Query params**

| Param       | Type             | Description              |
|-------------|------------------|--------------------------|
| `role`      | `admin \| staff` | Filter by role           |
| `is_active` | `true \| false`  | Filter by active status  |

**Response `200 OK`**

```json
{
  "items": [
    {
      "id": "uuid",
      "email": "staff@impulsaedu.org",
      "full_name": "Ana García",
      "role": "staff",
      "is_active": true
    }
  ],
  "total": 5
}
```

---

### GET /api/v1/users/:id

**Auth required**: `admin` (any user) or `staff` (own `id` only)

Returns `403` if staff tries to read another user's profile.
Returns `404` if user not found or soft-deleted.

**Response `200 OK`** — single `ApiUser` object.

---

### POST /api/v1/users  (admin only)

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

**Response `201 Created`** — created `ApiUser` object (no password).

**Error codes**

| Code             | HTTP | Meaning                             |
|------------------|------|-------------------------------------|
| `MISSING_FIELDS` | 400  | email, password, full_name, or role missing |
| `INVALID_ROLE`   | 400  | role not `staff` or `admin`         |
| `EMAIL_CONFLICT` | 409  | Email already in use                |

---

### PUT /api/v1/users/:id

**Auth required**: `admin` (any user) or `staff` (own id only)

At least one of `full_name` or `password` must be provided.

**Request body**

```json
{
  "full_name": "Carlos López Jr.",
  "password": "newPassword456"
}
```

**Response `200 OK`** — updated `ApiUser` object.

---

### PATCH /api/v1/users/:id/deactivate  (admin only)

Soft-deletes a user (sets `deleted_at = NOW()`).

**Auth required**: `admin`

**Response `200 OK`**

```json
{ "message": "User deactivated" }
```

---

## APP API — Schools  (`/api/v1/schools`)

Schools GET endpoints are **public** (no auth required).
All write endpoints require `staff` or `admin`.

### TypeScript Interfaces

Already defined in `frontend/src/lib/schoolsService.ts`:

```typescript
export interface ApiSchool {
  id: string;
  name: string;
  region: string;
  category: string;
  description: string | null;
  funding_goal: number;
  confirmed_value: number;  // sum of active donations
  progress_pct: number;     // Math.round(confirmed_value/funding_goal * 10000) / 100
  status: 'active' | 'archived';
}

export interface SchoolFilters {
  region?: string;
  category?: string;
  status?: 'active' | 'archived';  // default: 'active'
  page?: number;                    // default: 1
  per_page?: number;                // default: 20, max: 100
}

export interface SchoolPayload {
  name: string;
  region: string;
  category: string;
  description?: string;
  funding_goal: number;
}
```

---

### GET /api/v1/schools  (public)

**Response `200 OK`**

```json
{
  "items": [ /* ApiSchool[] */ ],
  "total": 12,
  "page": 1,
  "per_page": 20
}
```

---

### GET /api/v1/schools/:id  (public)

**Response `200 OK`** — single `ApiSchool`.
**Error**: `404 NOT_FOUND`

---

### POST /api/v1/schools  (staff+)

Required fields: `name`, `region`, `category`, `funding_goal`.
Optional: `description`.

**Error codes**: `MISSING_FIELDS (400)`, `CONFLICT (409)`

---

### PUT /api/v1/schools/:id  (staff+)

Partial update — all fields optional, but at least one required.

**Error codes**: `MISSING_FIELDS (400)`, `NOT_FOUND (404)`, `CONFLICT (409)`

---

### PATCH /api/v1/schools/:id/archive  (staff+)

Sets `status = 'archived'`. Archived schools cannot receive new donations.

**Response `200 OK`**: `{ "message": "School archived" }`

---

## APP API — Donors  (`/api/v1/donors`)

All donor endpoints require `staff` or `admin`.

### TypeScript Interfaces

Already partially defined in `donorsService.ts`. Full shape:

```typescript
// Backend response shape — list item
interface ApiDonor {
  id: string;
  full_name: string;
  email: string;
  tax_id: string | null;
  phone: string | null;
  type: 'individual' | 'corporate';
  organization_name: string | null;
  notes: string | null;
  is_active: boolean;
  donation_count: number;
}

// Backend response shape — detail (GET /donors/:id)
interface ApiDonorDetail extends ApiDonor {
  donations: Array<{
    id: string;
    school_name: string;
    type: 'monetary' | 'material';
    amount: number | null;
    state: DonationState;
    registered_at: string;
  }>;
}

interface ApiDonorsListResponse {
  items: ApiDonor[];
  total: number;
  page: number;
  per_page: number;
}

export interface DonorFilters {
  type?: 'individual' | 'corporate';
  name?: string;           // partial match (ILIKE)
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateDonorPayload {
  full_name: string;
  email: string;
  type: 'individual' | 'corporate';
  tax_id?: string;
  phone?: string;
  organization_name?: string;
  notes?: string;
}
```

---

### GET /api/v1/donors  (staff+)

**Response `200 OK`** — paginated `ApiDonor[]`.

---

### GET /api/v1/donors/:id  (staff+)

**Response `200 OK`** — `ApiDonorDetail` (includes donation history).
**Error**: `404 NOT_FOUND`

---

### POST /api/v1/donors  (staff+)

Required: `full_name`, `email`, `type`.

**Error codes**: `MISSING_FIELDS (400)`, `INVALID_TYPE (400)`, `CONFLICT (409)` (email or tax_id duplicate)

---

### PUT /api/v1/donors/:id  (staff+)

Partial update of any donor field.

**Error codes**: `MISSING_FIELDS (400)`, `NOT_FOUND (404)`, `CONFLICT (409)`

---

### PATCH /api/v1/donors/:id/deactivate  (staff+)

Sets `is_active = FALSE`. Soft delete.

**Response `200 OK`**: `{ "message": "Donor deactivated" }`

---

## APP API — Donations  (`/api/v1/donations`)

All donation endpoints require `staff` or `admin`.

### Donation State Machine

```
registered ──► approved ──► in_delivery ──► delivered ──► completed
     │               │              │
     ▼               ▼              ▼
  cancelled       cancelled      cancelled
```

| From         | Allowed transitions          |
|--------------|------------------------------|
| `registered` | `approved`, `cancelled`      |
| `approved`   | `in_delivery`, `cancelled`   |
| `in_delivery`| `delivered`, `cancelled`     |
| `delivered`  | `completed`                  |
| `completed`  | *(terminal)*                 |
| `cancelled`  | *(terminal)*                 |

### TypeScript Interfaces

```typescript
type DonationState =
  | 'registered'
  | 'approved'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

type DonationType = 'monetary' | 'material';

// Summary shape (list endpoint)
interface ApiDonationSummary {
  id: string;
  donor: { id: string; full_name: string };
  school: { id: string; name: string };
  type: DonationType;
  amount: number | null;
  estimated_value: number | null;
  state: DonationState;
  delivery_mode: string | null;
  registered_at: string;
}

// Detail shape (single endpoint)
interface ApiDonationDetail {
  id: string;
  donor: { id: string; full_name: string; type: 'individual' | 'corporate' };
  school: { id: string; name: string; region: string };
  type: DonationType;
  description: string | null;
  amount: number | null;
  estimated_value: number | null;
  state: DonationState;
  observations: string | null;
  delivery: {
    mode: string | null;
    shipping_address: string | null;
    tracking_info: string | null;
    notes: string | null;
  };
  timeline: {
    registered_at: string | null;
    approved_at: string | null;
    in_delivery_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
  };
}

interface ApiDonationsListResponse {
  items: ApiDonationSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface DonationFilters {
  school_id?: string;
  donor_id?: string;
  state?: DonationState;
  type?: DonationType;
  page?: number;
  per_page?: number;
}

export interface CreateDonationPayload {
  donor_id: string;
  school_id: string;
  type: DonationType;
  description?: string;
  amount?: number;          // required when type === 'monetary'
  estimated_value?: number; // required when type === 'material'
  observations?: string;
  delivery: {
    mode?: string;
    shipping_address?: string;
    tracking_info?: string;
    notes?: string;
  };
}

export interface UpdateDonationPayload {
  description?: string;
  observations?: string;
  delivery?: {
    mode?: string;
    shipping_address?: string;
    tracking_info?: string;
    notes?: string;
  };
}

export interface UpdateDonationStatePayload {
  state: DonationState;
  observations?: string;
}
```

---

### GET /api/v1/donations  (staff+)

**Response `200 OK`** — paginated `ApiDonationSummary[]`.

---

### GET /api/v1/donations/:id  (staff+)

**Response `200 OK`** — `ApiDonationDetail`.
**Error**: `404 NOT_FOUND`

---

### POST /api/v1/donations  (staff+)

Required: `donor_id`, `school_id`, `type`, `delivery`.
- `amount` required when `type === 'monetary'`
- `estimated_value` required when `type === 'material'`

**Request body**

```json
{
  "donor_id": "uuid",
  "school_id": "uuid",
  "type": "material",
  "description": "20 laptops",
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

**Response `201 Created`** — `ApiDonationDetail`.

**Error codes**

| Code                     | HTTP | Meaning                                       |
|--------------------------|------|-----------------------------------------------|
| `MISSING_FIELDS`         | 400  | Required fields absent                        |
| `MISSING_AMOUNT`         | 400  | `amount` missing for monetary donation        |
| `MISSING_ESTIMATED_VALUE`| 400  | `estimated_value` missing for material donation |
| `NOT_FOUND`              | 404  | `donor_id` or `school_id` not found           |
| `SCHOOL_ARCHIVED`        | 422  | School is archived, cannot receive donations  |

---

### PUT /api/v1/donations/:id  (staff+)

Updates description, observations, and/or delivery details only.
**Does not** change `state`, `type`, `amount`, or `estimated_value`.

**Response `200 OK`** — `ApiDonationDetail`.

---

### PATCH /api/v1/donations/:id/state  (staff+)

Advances or cancels the donation workflow state.

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
  "approved_at": "2026-02-03T14:30:00.000Z"
}
```

> ⚠️ The response only returns `id`, `state`, and `approved_at` — **not** the full detail object.

**Error codes**

| Code                      | HTTP | Meaning                                      |
|---------------------------|------|----------------------------------------------|
| `MISSING_FIELDS`          | 400  | `state` missing from body                   |
| `NOT_FOUND`               | 404  | Donation not found                           |
| `INVALID_STATE_TRANSITION`| 422  | Transition not permitted by state machine   |

---

## APP API — Reports  (`/api/v1/reports`)

All report endpoints require **`admin`** role.

### TypeScript Interfaces

```typescript
interface DonationsBySchoolRow {
  school_id: string;
  school_name: string;
  total_monetary: number;
  total_material_value: number;
  total_donations: number;
  pending: number;
  completed: number;
}

interface DonationsByDonorRow {
  donor_id: string;
  donor_name: string;
  total_donations: number;
  total_value: number;
  schools_supported: number;
}

type ReportType =
  | 'donations-by-school'
  | 'donations-by-donor'
  | 'pending-deliveries'
  | 'completed';
```

---

### GET /api/v1/reports/donations-by-school  (admin)

**Query params**: `school_id` (UUID, optional — omit for all schools)

**Response `200 OK`** — `DonationsBySchoolRow[]`

---

### GET /api/v1/reports/donations-by-donor  (admin)

**Query params**: `donor_id` (UUID, optional)

**Response `200 OK`** — `DonationsByDonorRow[]`

---

### GET /api/v1/reports/pending-deliveries  (admin)

Returns all donations with state `approved` or `in_delivery`.

**Response `200 OK`** — `ApiDonationSummary[]` (same shape as GET /donations list items)

---

### GET /api/v1/reports/completed  (admin)

Returns all donations with state `completed`.

**Response `200 OK`** — `ApiDonationSummary[]`

---

### GET /api/v1/reports/export  (admin)

Exports a report as a CSV file download.

**Query params**

| Param    | Values                                                                        | Required |
|----------|-------------------------------------------------------------------------------|----------|
| `report` | `donations-by-school`, `donations-by-donor`, `pending-deliveries`, `completed` | Yes      |

**Response `200 OK`**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="report-YYYY-MM-DD.csv"`
- Body: raw CSV string

> ⚠️ This endpoint returns CSV, not JSON. Use `apiFetch` (not `apiRequest`) and call `res.text()` instead of `res.json()`.

**Error codes**

| Code             | HTTP | Meaning               |
|------------------|------|-----------------------|
| `INVALID_REPORT` | 400  | `report` param invalid or missing |

---

## APP API — XLSX  (`/api/v1/xlsx`)

Both endpoints require **`admin`** role.

### TypeScript Interfaces

```typescript
interface XlsxUploadResult {
  message: string;
  result: unknown; // syncExcelToDB return value — opaque
}
```

---

### POST /api/v1/xlsx/upload  (admin)

Uploads an Excel file and syncs its data to the database.

> ⚠️ This endpoint uses **multipart/form-data**, not JSON.
> Use `apiFetch` directly (do **not** pass `Content-Type: application/json`).
> Field name must be `file`.

```typescript
// Example usage in service:
const formData = new FormData();
formData.append('file', file);

const res = await apiFetch(`${APP_BASE}/xlsx/upload`, {
  method: 'POST',
  body: formData,
  // Do NOT set Content-Type — browser sets it with boundary automatically
});
```

**Response `200 OK`**

```json
{
  "message": "Excel uploaded successfully",
  "result": { /* sync result details */ }
}
```

**Error codes**

| Code            | HTTP | Meaning                             |
|-----------------|------|-------------------------------------|
| `FILE_REQUIRED` | 400  | No file attached in request         |
| `UPLOAD_ERROR`  | 500  | Failed to process the Excel file    |

---

### GET /api/v1/xlsx/download  (admin)

Downloads a full database export as an `.xlsx` file.

> ⚠️ Returns binary data, not JSON. Use `apiFetch` and `res.blob()`.

```typescript
// Example usage in service:
const res = await apiFetch(`${APP_BASE}/xlsx/download`);
const blob = await res.blob();
// Then trigger browser download via URL.createObjectURL
```

**Response `200 OK`**
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="impulsaedu.xlsx"`

---

## Rate Limits (app_api users only)

User endpoints apply per-IP rate limiting:

| Endpoint type | Window | Max requests |
|---------------|--------|--------------|
| Read (`GET`)  | 60 s   | 120          |
| Write (other) | 60 s   | 60           |

On limit breach, server returns `429` with:
```json
{ "error": { "code": "TOO_MANY_REQUESTS", "message": "Too many requests" } }
```

---

## Frontend Component Interfaces (reference)

Some components have existing interfaces. Reference them when building adapters:

- `Donor` — `frontend/src/components/donantes/donantesInterfaces.ts`
  - Fields: `id`, `name` (from `full_name`), `type`, `email`, `phone`, `totalDonations` (from `donation_count`), `status` (`'active' | 'inactive'` from `is_active`)

- `ApiSchool` — `frontend/src/lib/schoolsService.ts` (used directly, no adapter)

---

## MCP Server

An MCP server providing structured, tool-callable access to this documentation
is available at `mcp/impulsaedu-api/`. See [`mcp/impulsaedu-api/README.md`](../mcp/impulsaedu-api/README.md)
for setup instructions.
