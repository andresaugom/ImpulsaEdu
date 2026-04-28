const { pool, clearDatabase } = require('./test-utils');

describe('Database Triggers & Constraints Integration', () => {
    let client;

    beforeAll(async () => {
        client = await pool.connect();
    });

    beforeEach(async () => {
        await clearDatabase(client);
    });

    afterAll(async () => {
        client.release();
        await pool.end();
    });

    it('should auto-update the updated_at timestamp when a school is modified', async () => {
        // Insert a school
        await client.query("INSERT INTO schools (cct, name) VALUES ('TRIG123', 'Trigger Test School')");

        // Wait a brief moment to ensure time difference
        await new Promise(resolve => setTimeout(resolve, 100));

        // Update the school
        await client.query("UPDATE schools SET name = 'Updated Name' WHERE cct = 'TRIG123'");

        // Fetch the row
        const res = await client.query("SELECT created_at, updated_at FROM schools WHERE cct = 'TRIG123'");
        const row = res.rows[0];

        // Ensure trigger fired
        expect(row.updated_at.getTime()).toBeGreaterThan(row.created_at.getTime());
    });

    it('cascading deletes wipe orphaned needs and donations', async () => {
        // Seed hierarchy
        await client.query("INSERT INTO users (id, name, email, password_hash, role) VALUES (1, 'D', 'd@t.com', 'h', 'standard')");
        await client.query("INSERT INTO donors (id, user_id) VALUES (1, 1)");
        await client.query("INSERT INTO schools (cct, name) VALUES ('DEL123', 'Delete Test')");
        await client.query("INSERT INTO schools_needs (id, school_cct, need_type) VALUES (1, 'DEL123', 'tech')");
        await client.query("INSERT INTO donations (id, amount, status, donor_id, need_id) VALUES (1, 50, 'completed', 1, 1)");

        // Execute the CASCADE delete logic
        await client.query("DELETE FROM schools WHERE cct = 'DEL123'");

        // Assert children were automatically removed by Postgres schemas
        const needsRes = await client.query("SELECT * FROM schools_needs WHERE school_cct = 'DEL123'");
        const donRes = await client.query("SELECT * FROM donations WHERE need_id = 1");

        expect(needsRes.rows.length).toBe(0);
        expect(donRes.rows.length).toBe(0);
    });
});