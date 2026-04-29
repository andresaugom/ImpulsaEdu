const { pool, clearDatabase } = require('./test-utils');

describe('Database Triggers & Constraints Integration', () => {
    let client;

    beforeAll(async () => { client = await pool.connect(); });
    beforeEach(async () => { await clearDatabase(client); });
    afterAll(async () => { if(client) client.release(); await pool.end(); });

    it('should auto-update the updated_at timestamp when a school is modified', async () => {
        // Insert a school with ALL strictly required fields to avoid NOT NULL constraint errors
        await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('Centro', 'Plantel Test', 'Trigger Test School', 'Primaria', 'TRIG123', 'SEP-General', 'Matutino', 'Calle 123', 'Ciudad', 'Estatal', 100)
        `);

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
        // Insert school - Changed 'Presencial' to 'SEP-General' to match ENUM school_mode
        const schoolRes = await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('North', 'DelSch', 'DeleteMe', 'Primaria', 'DEL1', 'SEP-General', 'Matutino', 'A', 'B', 'Estatal', 100) 
            RETURNING id
        `);
        const schoolUuid = schoolRes.rows[0].id;

        // Insert need - Added 'category' and 'subcategory' which are NOT NULL in your schema
        await client.query(
            "INSERT INTO schools_needs (school_id, category, subcategory, item_name, amount) VALUES ($1, $2, $3, $4, $5)",
            [schoolUuid, 'Tecnología', 'Hardware', 'Computers', 5000]
        );

        // Delete school
        await client.query("DELETE FROM schools WHERE id = $1", [schoolUuid]);

        // Assert schema CASCADE logic wiped the child table automatically
        const needsRes = await client.query("SELECT * FROM schools_needs WHERE school_id = $1", [schoolUuid]);
        expect(needsRes.rows.length).toBe(0);
    });
});