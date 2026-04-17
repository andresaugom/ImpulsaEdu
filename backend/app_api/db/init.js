'use strict';

const { Client } = require('pg');

/**
 * Initialises all tables owned by the app_api.
 * Safe to run on every startup (IF NOT EXISTS / DO $$ EXCEPTION $$).
 * The users and refresh_tokens tables are created here for fresh deployments;
 * auth-service also creates them with an identical definition.
 */
async function initDatabase(config) {
    const client = new Client({
        host: config.host || 'localhost',
        user: config.user,
        password: config.password,
        database: config.database,
        port: parseInt(config.port) || 5432,
        ssl: config.host && config.host !== 'localhost' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();

        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        // ENUMs – ignore if already exist
        await client.query(`
            DO $$ BEGIN
                CREATE TYPE user_role AS ENUM ('staff', 'admin');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        // ── users (shared with auth-service) ────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                firstname     TEXT        NOT NULL,
                middlename    TEXT,
                lastname      TEXT        NOT NULL DEFAULT '',
                role          user_role   NOT NULL DEFAULT 'staff',
                email         TEXT        NOT NULL UNIQUE,
                phone         TEXT,
                password_hash TEXT        NOT NULL,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by    UUID        REFERENCES users(id),
                updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by    UUID        REFERENCES users(id),
                deleted_at    TIMESTAMPTZ DEFAULT NULL,
                deleted_by    UUID        REFERENCES users(id)
            );
        `);

        // ── refresh_tokens (shared with auth-service) ────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash  VARCHAR(64) NOT NULL UNIQUE,
                expires_at  TIMESTAMPTZ NOT NULL,
                revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // ── schools ──────────────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS schools (
                id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
                name         TEXT         NOT NULL,
                region       TEXT         NOT NULL,
                category     TEXT         NOT NULL,
                description  TEXT,
                funding_goal NUMERIC(12,2) NOT NULL CHECK (funding_goal > 0),
                status       TEXT         NOT NULL DEFAULT 'active'
                                          CHECK (status IN ('active', 'archived')),
                created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                UNIQUE (name, region)
            );
        `);

        // ── donors ───────────────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS donors (
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
        `);

        // ── donations ─────────────────────────────────────────────────────────
        await client.query(`
            CREATE TABLE IF NOT EXISTS donations (
                id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
                donor_id         UUID          NOT NULL REFERENCES donors(id),
                school_id        UUID          NOT NULL REFERENCES schools(id),
                type             TEXT          NOT NULL CHECK (type IN ('monetary', 'material')),
                description      TEXT,
                amount           NUMERIC(12,2),
                estimated_value  NUMERIC(12,2),
                state            TEXT          NOT NULL DEFAULT 'registered'
                                               CHECK (state IN ('registered','approved','in_delivery',
                                                                'delivered','completed','cancelled')),
                observations     TEXT,
                delivery_mode    TEXT          CHECK (delivery_mode IN
                                               ('donor_to_ngo','donor_to_school','ngo_to_school')),
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
        `);

        // ── indexes ───────────────────────────────────────────────────────────
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_schools_status   ON schools(status);
            CREATE INDEX IF NOT EXISTS idx_schools_region   ON schools(region);
            CREATE INDEX IF NOT EXISTS idx_donors_is_active ON donors(is_active);
            CREATE INDEX IF NOT EXISTS idx_donors_type      ON donors(type);
            CREATE INDEX IF NOT EXISTS idx_donations_donor  ON donations(donor_id);
            CREATE INDEX IF NOT EXISTS idx_donations_school ON donations(school_id);
            CREATE INDEX IF NOT EXISTS idx_donations_state  ON donations(state);
        `);

        console.log('app_api: database initialised.');
    } catch (err) {
        console.error('app_api: database init error:', err);
        throw err;
    } finally {
        await client.end();
    }
}

module.exports = initDatabase;
