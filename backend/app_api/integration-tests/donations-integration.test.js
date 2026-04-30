/**
 * Integration test for donations CRUD using a real DB connection.
 * Requires a running PostgreSQL instance with credentials from .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../db/pool');

const TEST_DONOR_NAME = 'Donor Integration Test';
const TEST_DONOR_REGION = 'TestRegion';
const TEST_SCHOOL_CCT = 'DONATION_TEST_CCT_001';
const TEST_SCHOOL_NAME = 'Escuela Donacion Test';

async function cleanupTestData(client) {
    // Remove donation_items, donations, donors, schools (in order due to FKs)
    const { rows: donations } = await client.query(
        `SELECT id FROM donations WHERE description LIKE '%integration test%'`
    );
    for (const row of donations) {
        await client.query('DELETE FROM donation_items WHERE donation_id = $1', [row.id]);
    }
    await client.query(`DELETE FROM donations WHERE description LIKE '%integration test%'`);
    await client.query(`DELETE FROM donors WHERE name = $1 AND region = $2`, [TEST_DONOR_NAME, TEST_DONOR_REGION]);
    const { rows: schools } = await client.query('SELECT id FROM schools WHERE cct = $1', [TEST_SCHOOL_CCT]);
    for (const row of schools) {
        await client.query('DELETE FROM schools_needs WHERE school_id = $1', [row.id]);
    }
    await client.query('DELETE FROM schools WHERE cct = $1', [TEST_SCHOOL_CCT]);
}

describe('Donations CRUD integration (real DB)', () => {
    let client;
    let donorId, schoolId, donationId;

    beforeAll(async () => {
        client = await pool.connect();
        await cleanupTestData(client);

        // Insert a donor
        const donorRes = await client.query(
            `INSERT INTO donors (name, region, donor_type, description)
             VALUES ($1, $2, 'Fisica', 'integration test donor') RETURNING id`,
            [TEST_DONOR_NAME, TEST_DONOR_REGION]
        );
        donorId = donorRes.rows[0].id;

        // Insert a school
        const schoolRes = await client.query(
            `INSERT INTO schools (region, school, name, employees, students, level, cct, mode, shift, address, location, category, description, goal, progress)
             VALUES ($1, $2, $3, 3, 50, 'Primaria', $4, 'SEP-General', 'Matutino', 'Calle Test', 'Urbana', 'Estatal', 'integration test school', 1000, 0)
             RETURNING id`,
            [TEST_DONOR_REGION, 'PlantelTest', TEST_SCHOOL_NAME, TEST_SCHOOL_CCT]
        );
        schoolId = schoolRes.rows[0].id;
    });

    afterAll(async () => {
        await cleanupTestData(client);
        client.release();
        await pool.end();
    });

    it('creates a donation (C)', async () => {
        const res = await client.query(
            `INSERT INTO donations (donor_id, school_id, amount, donation_type, status, description, created_by, updated_by)
             VALUES ($1, $2, 500, 'Monetaria', 'Registrado', 'integration test donation', NULL, NULL)
             RETURNING *`,
            [donorId, schoolId]
        );
        expect(res.rows).toHaveLength(1);
        donationId = res.rows[0].id;
        expect(Number(res.rows[0].amount)).toBeCloseTo(500); // <-- FIXED
        expect(res.rows[0].donation_type).toBe('Monetaria');
        expect(res.rows[0].status).toBe('Registrado');
    });

    it('reads the donation (R)', async () => {
        const res = await client.query(
            `SELECT * FROM donations WHERE id = $1`,
            [donationId]
        );
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].description).toBe('integration test donation');
        expect(res.rows[0].donor_id).toBe(donorId);
        expect(res.rows[0].school_id).toBe(schoolId);
    });

    it('updates the donation (U)', async () => {
        const res = await client.query(
            `UPDATE donations SET amount = $1, status = $2, description = $3, updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [750, 'Aprobado', 'integration test donation updated', donationId]
        );
        expect(res.rows).toHaveLength(1);
        expect(Number(res.rows[0].amount)).toBeCloseTo(750); // <-- FIXED
        expect(res.rows[0].status).toBe('Aprobado');
        expect(res.rows[0].description).toBe('integration test donation updated');
    });

    it('adds donation items (part of C/U)', async () => {
        const res = await client.query(
            `INSERT INTO donation_items (donation_id, item_name, quantity, amount, created_by, updated_by)
             VALUES ($1, $2, $3, $4, NULL, NULL), ($1, $5, $6, $7, NULL, NULL)
             RETURNING *`,
            [donationId, 'Cuadernos', 20, 200, 'Lápices', 100, 50]
        );
        expect(res.rows).toHaveLength(2);
        const names = res.rows.map(r => r.item_name);
        expect(names).toContain('Cuadernos');
        expect(names).toContain('Lápices');
    });

    it('reads donation items (R)', async () => {
        const res = await client.query(
            `SELECT * FROM donation_items WHERE donation_id = $1 ORDER BY item_name`,
            [donationId]
        );
        expect(res.rows).toHaveLength(2);
        expect(res.rows[0].item_name).toBe('Cuadernos');
        expect(res.rows[1].item_name).toBe('Lápices');
    });

    it('deletes the donation (D) and cascades donation_items', async () => {
        // Delete donation
        await client.query(`DELETE FROM donations WHERE id = $1`, [donationId]);
        // Donation should be gone
        const res = await client.query(`SELECT * FROM donations WHERE id = $1`, [donationId]);
        expect(res.rows).toHaveLength(0);
        // Donation items should be gone due to ON DELETE CASCADE
        const itemsRes = await client.query(`SELECT * FROM donation_items WHERE donation_id = $1`, [donationId]);
        expect(itemsRes.rows).toHaveLength(0);
    });
});