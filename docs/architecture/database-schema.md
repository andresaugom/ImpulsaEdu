# ImpulsaEdu – PostgreSQL Database Schema

> **Applies to**: `api-service` and `auth-service` — both share a single PostgreSQL instance, single database `impulsa`.

---

## 1. Entity Relationship Summary

```
users ──────────────────────────────────────────────────────┐
  │ (created_by / updated_by / deleted_by)                  │
  ├──────────────────────────────────────┐                  │
  │                                      │                  │
  ▼                                      ▼                  │
schools                               donors                │
  │  └──< contacts                       │  └──< contacts   │
  │                                      │                  │
  └──────────────►  donations  ◄─────────┘                  │
                      │ (created_by) ─────────────────────► ┘
                      │
                      └──< donation_items

  donations ──► audit_logs (via entity_id)
  users     ──► refresh_tokens
```

---

## 2. DDL – Full Schema

```sql
-- ─────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────────────────────
CREATE TYPE user_role       AS ENUM ('staff', 'admin');
CREATE TYPE donor_type      AS ENUM ('Fisica', 'Moral');
CREATE TYPE donation_status AS ENUM ('Registrado', 'Aprobado', 'Entregando', 'Entregado', 'Finalizado', 'Cancelado');
CREATE TYPE donation_type   AS ENUM ('Material', 'Monetaria');
CREATE TYPE school_type     AS ENUM ('Publica', 'Privada');
CREATE TYPE entity_type     AS ENUM ('donor', 'donation', 'school');
CREATE TYPE audit_action    AS ENUM ('create', 'update', 'archive', 'state_change');

-- NOTE: region is TEXT rather than ENUM to avoid ALTER TYPE migrations
-- when new regions are added. The application layer enforces valid values.


-- ─────────────────────────────────────────────────────────
-- USERS  (managed by auth-service)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    firstname     TEXT        NOT NULL,
    middlename    TEXT,
    lastname      TEXT        NOT NULL,
    role          user_role   NOT NULL DEFAULT 'staff',
    email         TEXT        NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT        NOT NULL,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by    UUID        REFERENCES users(id),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by    UUID        REFERENCES users(id),
    deleted_at    TIMESTAMPTZ,
    deleted_by    UUID        REFERENCES users(id)
);


-- ─────────────────────────────────────────────────────────
-- REFRESH TOKENS  (managed by auth-service)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,   -- SHA-256 of the raw token
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- DONORS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donors (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    region      TEXT        NOT NULL,
    donor_type  donor_type  NOT NULL,
    notes       TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID        REFERENCES users(id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID        REFERENCES users(id),
    deleted_at  TIMESTAMPTZ,
    deleted_by  UUID        REFERENCES users(id),

    UNIQUE (name, region)
);


-- ─────────────────────────────────────────────────────────
-- SCHOOLS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    region      TEXT        NOT NULL,
    school_type school_type NOT NULL,
    notes       TEXT,
    goal        NUMERIC(12,2) NOT NULL CHECK (goal > 0),
    progress    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (progress >= 0),

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by  UUID        REFERENCES users(id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  UUID        REFERENCES users(id),
    deleted_at  TIMESTAMPTZ,
    deleted_by  UUID        REFERENCES users(id),

    UNIQUE (name, region)
);


-- ─────────────────────────────────────────────────────────
-- DONATIONS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
    id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id      UUID            NOT NULL REFERENCES donors(id),
    school_id     UUID            NOT NULL REFERENCES schools(id),
    amount        NUMERIC(12,2)   NOT NULL DEFAULT 0,
    donation_type donation_type   NOT NULL,
    status        donation_status NOT NULL DEFAULT 'Registrado',
    description   TEXT,
    notes         TEXT,

    created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_by    UUID            REFERENCES users(id),
    updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_by    UUID            REFERENCES users(id),
    deleted_at    TIMESTAMPTZ,
    deleted_by    UUID            REFERENCES users(id)
);


-- ─────────────────────────────────────────────────────────
-- DONATION ITEMS  (line items for Material donations)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donation_items (
    id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID  NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    item_name   TEXT  NOT NULL,
    quantity    INT   CHECK (quantity > 0)
);


-- ─────────────────────────────────────────────────────────
-- CONTACTS  (contact info per donor OR per school)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
    id        UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id  UUID  REFERENCES donors(id)  ON DELETE CASCADE,
    school_id UUID  REFERENCES schools(id) ON DELETE CASCADE,
    email     TEXT,
    phone     TEXT,

    -- Each row belongs to exactly one entity
    CONSTRAINT chk_contact_owner CHECK (
        num_nonnulls(donor_id, school_id) = 1
    )
);


-- ─────────────────────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
    entity_type entity_type   NOT NULL,
    entity_id   UUID          NOT NULL,
    action      audit_action  NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────

-- Schools – public dashboard filters
CREATE INDEX idx_schools_region      ON schools(region);
CREATE INDEX idx_schools_school_type ON schools(school_type);
CREATE INDEX idx_schools_active      ON schools(deleted_at) WHERE deleted_at IS NULL;

-- Donors
CREATE INDEX idx_donors_region  ON donors(region);
CREATE INDEX idx_donors_active  ON donors(deleted_at) WHERE deleted_at IS NULL;

-- Donations
CREATE INDEX idx_donations_donor  ON donations(donor_id);
CREATE INDEX idx_donations_school ON donations(school_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_type   ON donations(donation_type);

-- Audit
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_logs(user_id);

-- Auth
CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

## 3. State Transition Rules

Enforced in application code (not DB constraints) to allow descriptive error messages.

| Current state | Allowed next states |
|---|---|
| `Registrado` | `Aprobado`, `Cancelado` |
| `Aprobado` | `Entregando`, `Cancelado` |
| `Entregando` | `Entregado`, `Cancelado` |
| `Entregado` | `Finalizado` |
| `Finalizado` | *(terminal — no transitions)* |
| `Cancelado` | *(terminal — no transitions)* |

---

## 4. Deduplication Rules

| Entity | Uniqueness constraint |
|---|---|
| School | `(name, region)` — same school name cannot appear in the same region |
| Donor | `(name, region)` — same donor name cannot appear in the same region |
| User | `email` — unique across all users |

Contact emails and phones live in the `contacts` table and are not subject to uniqueness constraints (a donor may have multiple contact entries).

---

## 5. Progress Bar

`schools.progress` is a **stored column** updated by the `api-service` whenever a donation on that school changes state. This avoids a full aggregation query on every page load while keeping the value accurate.

**Update query** — called by the api-service after every donation state transition:

```sql
UPDATE schools
SET
    progress   = (
        SELECT COALESCE(SUM(amount), 0)
        FROM   donations
        WHERE  school_id  = $1
          AND  status     IN ('Aprobado', 'Entregando', 'Entregado', 'Finalizado')
          AND  deleted_at IS NULL
    ),
    updated_at = NOW()
WHERE id = $1;
```

**Read query** — used by `GET /api/v1/schools` and `GET /api/v1/schools/:id`:

```sql
SELECT
    id,
    name,
    region,
    school_type,
    notes,
    goal,
    progress,
    ROUND(progress / NULLIF(goal, 0) * 100, 2) AS progress_pct
FROM  schools
WHERE deleted_at IS NULL;
```

Only donations in states `Aprobado`, `Entregando`, `Entregado`, `Finalizado` count towards a school's progress. `Registrado` and `Cancelado` are excluded.

---

## 6. Seed Data (Initial Admin User)

```sql
-- Run once during deployment setup
INSERT INTO users (firstname, lastname, role, email, password_hash)
VALUES (
    'System',
    'Administrator',
    'admin',
    'admin@impulsaedu.org',
    '$2a$12$<BCRYPT_HASH_OF_INITIAL_PASSWORD>'  -- replace with real bcrypt hash
);
```

---

## 7. Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| `region` as TEXT not ENUM | `TEXT` | ENUM requires `ALTER TYPE` for every new region; TEXT is flexible and validated at the app layer |
| `donation_type` as ENUM | `'Material'`, `'Monetaria'` | Fixed two-value set; suits ENUM |
| Soft delete pattern | `deleted_at` / `deleted_by` nullable on all main tables | Preserves history and audit trail; rows are never physically removed |
| `schools.progress` stored column | Updated on state transition | Avoids aggregation JOIN on every read; api-service owns the update logic |
| `donation_items` child table | 1:N of `donations` | Material donations can list multiple physical items with quantities |
| `contacts` separate table | Nullable FK to donor OR school | Normalizes contact info; a donor or school can have multiple contacts |
| `deleted_by` nullable | `REFERENCES users(id)` without `NOT NULL` | Record has no deleter at creation time; only populated on soft-delete |
| `UNIQUE(name, region)` on donors | Applied to `(name, region)` | Replaces email/tax_id dedup from previous draft since those fields moved to `contacts` |
| No `deliveries` table | Removed | Delivery mode tracking was dropped from this version of the model |
| `audit_action` includes `state_change` | Added value | State transitions are the most important auditable events in the system |
