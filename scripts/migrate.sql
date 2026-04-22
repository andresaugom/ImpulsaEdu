-- migrate.sql
-- Drops the legacy schema and recreates all tables to match the current route code.
-- Safe to run when tables are empty (seed data only).

BEGIN;

-- ── Drop legacy tables (order respects FK constraints) ───────────────────────

DROP TABLE IF EXISTS audit_logs      CASCADE;
DROP TABLE IF EXISTS donation_items  CASCADE;
DROP TABLE IF EXISTS schools_needs   CASCADE;
DROP TABLE IF EXISTS contacts        CASCADE;
DROP TABLE IF EXISTS donations       CASCADE;
DROP TABLE IF EXISTS donors          CASCADE;
DROP TABLE IF EXISTS schools         CASCADE;

-- ── Drop legacy enum types ────────────────────────────────────────────────────

DROP TYPE IF EXISTS school_level    CASCADE;
DROP TYPE IF EXISTS school_mode     CASCADE;
DROP TYPE IF EXISTS school_shift    CASCADE;
DROP TYPE IF EXISTS school_category CASCADE;
DROP TYPE IF EXISTS donor_type      CASCADE;
DROP TYPE IF EXISTS donation_type   CASCADE;
DROP TYPE IF EXISTS donation_status CASCADE;

-- ── schools ───────────────────────────────────────────────────────────────────

CREATE TABLE schools (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT          NOT NULL,
    region       TEXT          NOT NULL,
    category     TEXT          NOT NULL,
    description  TEXT,
    funding_goal NUMERIC(12,2) NOT NULL CHECK (funding_goal > 0),
    status       TEXT          NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'archived')),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── donors ────────────────────────────────────────────────────────────────────

CREATE TABLE donors (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         TEXT        NOT NULL,
    email             TEXT        NOT NULL UNIQUE,
    tax_id            TEXT        UNIQUE,
    phone             TEXT,
    type              TEXT        NOT NULL CHECK (type IN ('individual', 'corporate')),
    organization_name TEXT,
    notes             TEXT,
    is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── donations ─────────────────────────────────────────────────────────────────

CREATE TABLE donations (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id         UUID          NOT NULL REFERENCES donors(id),
    school_id        UUID          NOT NULL REFERENCES schools(id),
    type             TEXT          NOT NULL CHECK (type IN ('monetary', 'material')),
    description      TEXT,
    amount           NUMERIC(12,2),
    estimated_value  NUMERIC(12,2),
    observations     TEXT,
    state            TEXT          NOT NULL DEFAULT 'registered'
                                   CHECK (state IN ('registered','approved','in_delivery','delivered','completed','cancelled')),
    delivery_mode    TEXT,
    shipping_address TEXT,
    tracking_info    TEXT,
    delivery_notes   TEXT,
    registered_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    approved_at      TIMESTAMPTZ,
    in_delivery_at   TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    cancelled_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMIT;
