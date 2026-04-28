const pool = require('../db/pool');

async function clearDatabase(client) {
    // Clears all tables and resets auto-increment IDs cascadingly
    await client.query(`
        TRUNCATE TABLE donations, schools_needs, schools, users, donors RESTART IDENTITY CASCADE;
    `);
}

module.exports = {
    pool,
    clearDatabase
};