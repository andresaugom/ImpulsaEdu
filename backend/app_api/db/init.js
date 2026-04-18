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
        console.log('app_api: database initialised.');
    } catch (err) {
        console.error('app_api: database init error:', err);
        throw err;
    } finally {
        await client.end();
    }
}

module.exports = initDatabase;
