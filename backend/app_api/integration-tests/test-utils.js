const pool = require('../db/pool');

async function clearDatabase(client) {
    await client.query(`
        TRUNCATE TABLE 
            audit_logs, contacts, donation_items, donations, schools_needs, 
            schools, donors, refresh_tokens, users 
        CASCADE;
    `);
}

module.exports = {
    pool,
    clearDatabase
};