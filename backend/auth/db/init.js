const { Client } = require('pg');

async function initDatabase(config) {
    const client = new Client({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: Number(config.port),
        ssl: config.ssl === 'true' ? { rejectUnauthorized: false } : false
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

        console.log("Base de datos PostgreSQL (ImpulsaEdu) inicializada.");
    } catch (err) {
        console.error("Error inicializando base de datos:", err);
        throw err;
    } finally {
        await client.end();
    }
}

module.exports = initDatabase;