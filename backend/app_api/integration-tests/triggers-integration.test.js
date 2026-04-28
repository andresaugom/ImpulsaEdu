const { pool, clearDatabase } = require('./test-utils');

describe('Database Triggers & Constraints Integration', () => {
    let client;

    beforeAll(async () => { client = await pool.connect(); });
    beforeEach(async () => { await clearDatabase(client); });
    afterAll(async () => { if(client) client.release(); await pool.end(); });

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

    it('cascading deletes wipe orphaned needs', async () => {
        // Insert school and grab its UUID
        const schoolRes = await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('North', 'DelSch', 'DeleteMe', 'Primaria', 'DEL1', 'Presencial', 'Matutino', 'A', 'B', 'Estatal', 100) 
            RETURNING id
        `);
        const schoolUuid = schoolRes.rows[0].id;

        // Insert need attached to that school's UUID
        await client.query(
            "INSERT INTO schools_needs (school_id, item_name, amount) VALUES ($1, 'Computers', 5000)",
            [schoolUuid]
        );

        // Delete school
        await client.query("DELETE FROM schools WHERE id = $1", [schoolUuid]);

        // Assert schema CASCADE logic wiped the child table automatically
        const needsRes = await client.query("SELECT * FROM schools_needs WHERE school_id = $1", [schoolUuid]);
        expect(needsRes.rows.length).toBe(0);
    });
});