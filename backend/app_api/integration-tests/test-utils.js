require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PGUSER || 'your_username',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'your_database',
    password: process.env.PGPASSWORD || 'your_password',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

const clearDatabase = async () => {
    await pool.query('DELETE FROM schools_needs');
    // Add additional queries to clear other tables if necessary
};

module.exports = { pool, clearDatabase };