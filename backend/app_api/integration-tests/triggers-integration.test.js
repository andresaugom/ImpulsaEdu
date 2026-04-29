const { pool, clearDatabase } = require('./test-utils');

describe('Database Triggers & Constraints Integration', () => {
    let client;

    beforeAll(async () => { client = await pool.connect(); });
    beforeEach(async () => { await clearDatabase(client); });
    afterAll(async () => { 
        if(client) client.release(); 
        await pool.end(); 
    });

    it('should auto-update the updated_at timestamp when a school is modified', async () => {
        // Insertamos la escuela con todos los campos NOT NULL requeridos y ENUM válido
        await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('Centro', 'Plantel Test', 'Trigger Test School', 'Primaria', 'TRIG123', 'SEP-General', 'Matutino', 'Calle 123', 'Ciudad', 'Estatal', 100)
        `);

        // Aumentamos el tiempo de espera a 250ms para garantizar que el timestamp sea distinto
        await new Promise(resolve => setTimeout(resolve, 250));

        // Update que dispara el trigger set_timestamp() o similar en tu DB
        await client.query("UPDATE schools SET name = 'Updated Name' WHERE cct = 'TRIG123'");

        // Obtenemos los tiempos
        const res = await client.query("SELECT created_at, updated_at FROM schools WHERE cct = 'TRIG123'");
        const row = res.rows[0];

        // Comprobamos que las fechas existan y que la actualización sea posterior
        expect(row.updated_at.getTime()).toBeGreaterThan(row.created_at.getTime());
    });

    it('cascading deletes wipe orphaned needs', async () => {
        // 1. Insertamos escuela con ENUM correcto (SEP-General)
        const schoolRes = await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('North', 'DelSch', 'DeleteMe', 'Primaria', 'DEL1', 'SEP-General', 'Matutino', 'A', 'B', 'Estatal', 100) 
            RETURNING id
        `);
        const schoolUuid = schoolRes.rows[0].id;

        // 2. Insertamos la necesidad incluyendo category y subcategory (NOT NULL en tu esquema)
        await client.query(
            `INSERT INTO schools_needs (school_id, category, subcategory, item_name, amount) 
             VALUES ($1, $2, $3, $4, $5)`,
            [schoolUuid, 'Tecnología', 'Hardware', 'Computers', 5000]
        );

        // 3. Borramos la escuela. 
        // Si esto falla con error de FK, asegúrate de que la relación en tu DB sea ON DELETE CASCADE
        await client.query("DELETE FROM schools WHERE id = $1", [schoolUuid]);

        // 4. Verificamos que las necesidades asociadas hayan desaparecido por el CASCADE
        const needsRes = await client.query("SELECT * FROM schools_needs WHERE school_id = $1", [schoolUuid]);
        expect(needsRes.rows.length).toBe(0);
    });
});