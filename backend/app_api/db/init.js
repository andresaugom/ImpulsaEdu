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
        ssl: config.ssl === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();

        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        // ENUMs
        const enums = [
            `DO $$ BEGIN CREATE TYPE user_role AS ENUM ('staff', 'admin'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE donor_type AS ENUM ('Fisica', 'Moral'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE donation_status AS ENUM ('Registrado','Aprobado','Entregando','Entregado','Finalizado','Cancelado'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE donation_type AS ENUM ('Material','Monetaria'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE school_level AS ENUM ('Preescolar','Primaria','Secundaria','Preparatoria','Universidad'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE school_mode AS ENUM ('SEP-Multigrado','SEP-General','CONAFE', 'Particular', 'Otro'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE school_shift AS ENUM ('Matutino','Vespertino','Mixto'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE school_category AS ENUM ('Estatal','Federal','Federalizado'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE school_need_status AS ENUM ('Cubierto', 'Aun no cubierto', 'Cubierto parcialmente'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE entity_type AS ENUM ('donor','donation','school'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
            `DO $$ BEGIN CREATE TYPE audit_action AS ENUM ('create','update','archive','state_change'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        ];
        for (const sql of enums) await client.query(sql);

        // Tables (order respects foreign key dependencies)
        // users: created without self-referential FK columns so the table can be
        // created in a single statement; those columns are added below with
        // ADD COLUMN IF NOT EXISTS (handles both fresh and pre-existing tables).
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                firstname TEXT NOT NULL,
                middlename TEXT,
                lastname TEXT NOT NULL,
                role user_role NOT NULL DEFAULT 'staff',
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ
            );
        `);

        // Self-referential FK columns — ADD COLUMN IF NOT EXISTS is a no-op when
        // the column already exists, so this is safe on every startup.
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                revoked BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS donors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                region TEXT NOT NULL,
                donor_type donor_type NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by UUID REFERENCES users(id),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by UUID REFERENCES users(id),
                deleted_at TIMESTAMPTZ,
                deleted_by UUID REFERENCES users(id),
                UNIQUE(name, region)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS schools (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                region TEXT NOT NULL,
                school TEXT NOT NULL,
                name TEXT NOT NULL,
                employees INT NOT NULL DEFAULT 0,
                students INT NOT NULL DEFAULT 0,
                level school_level NOT NULL,
                cct TEXT NOT NULL,
                mode school_mode NOT NULL,
                shift school_shift NOT NULL,
                address TEXT NOT NULL,
                location TEXT NOT NULL,
                category school_category NOT NULL,
                description TEXT,
                goal NUMERIC(12,2) NOT NULL CHECK (goal > 0),
                progress NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (progress >= 0),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by UUID REFERENCES users(id),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by UUID REFERENCES users(id),
                deleted_at TIMESTAMPTZ,
                deleted_by UUID REFERENCES users(id),
                UNIQUE(region, school, name)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS schools_needs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                school_id UUID NOT NULL REFERENCES schools(id),
                category TEXT NOT NULL,
                subcategory TEXT NOT NULL,
                item_name TEXT NOT NULL,
                quantity INT,
                unit TEXT,
                amount NUMERIC(12,2) NOT NULL,
                status school_need_status NOT NULL DEFAULT 'Aun no cubierto',
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by UUID REFERENCES users(id),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by UUID REFERENCES users(id),
                deleted_at TIMESTAMPTZ,
                deleted_by UUID REFERENCES users(id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS donations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                donor_id UUID NOT NULL REFERENCES donors(id),
                school_id UUID NOT NULL REFERENCES schools(id),
                amount NUMERIC(12,2) NOT NULL DEFAULT 0,
                donation_type donation_type NOT NULL,
                status donation_status NOT NULL DEFAULT 'Registrado',
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by UUID REFERENCES users(id),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by UUID REFERENCES users(id),
                deleted_at TIMESTAMPTZ,
                deleted_by UUID REFERENCES users(id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS donation_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
                item_name TEXT NOT NULL,
                quantity INT CHECK (quantity > 0),
                amount NUMERIC(12,2) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_by UUID REFERENCES users(id),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_by UUID REFERENCES users(id),
                deleted_at TIMESTAMPTZ,
                deleted_by UUID REFERENCES users(id)
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                donor_id UUID REFERENCES donors(id) ON DELETE CASCADE,
                school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
                email TEXT,
                phone TEXT,
                CONSTRAINT chk_contact_owner CHECK (
                    (donor_id IS NOT NULL AND school_id IS NULL) OR
                    (donor_id IS NULL AND school_id IS NOT NULL)
                )
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                entity_type entity_type NOT NULL,
                entity_id UUID NOT NULL,
                action audit_action NOT NULL,
                old_value JSONB,
                new_value JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
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
