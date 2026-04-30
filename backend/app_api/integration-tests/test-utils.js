require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    // Prioritize the variables we defined in the CI/Env
    user: process.env.DB_USER || process.env.PGUSER,
    host: process.env.DB_HOST || process.env.PGHOST || '127.0.0.1',
    database: process.env.DB_NAME || process.env.PGDATABASE,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
});

const clearDatabase = async (client) => {
    // Best practice: Use the provided client from the pool to ensure 
    // it's part of the same transaction/connection if needed.
    await client.query('DELETE FROM schools_needs');
    await client.query('DELETE FROM users WHERE email != \'admin@test.com\''); 
};

module.exports = { pool, clearDatabase };