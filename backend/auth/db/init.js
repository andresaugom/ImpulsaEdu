'use strict';

const { Client } = require('pg');

/**
 * Initialises all tables owned by the auth service.
 * Safe to run on every startup (IF NOT EXISTS / DO $$ EXCEPTION $$).
 */
async function initDatabase(config) {
    const client = new Client({
        host:     config.host || 'localhost',
        user:     config.user,
        password: config.password,
        database: config.database,
        port:     parseInt(config.port) || 5432,
        ssl:      config.ssl === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();

        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        await client.query(`
            DO $$ BEGIN
                CREATE TYPE user_role AS ENUM ('staff', 'admin');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

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

        console.log('auth: database initialised.');
    } catch (err) {
        console.error('auth: database init error:', err);
        throw err;
    } finally {
        await client.end();
    }
}

module.exports = initDatabase;