/**
 * Integration test for schools CRUD using a real DB connection.
 * Requires a running PostgreSQL instance with credentials from .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../db/pool');

const TEST_SCHOOL_REGION = 'TestRegion';
const TEST_SCHOOL_PLANTEL = 'PlantelTest';
const TEST_SCHOOL_NAME = 'Escuela Integración Test';
const TEST_SCHOOL_CCT = 'SCHOOL_CCT_TEST_001';
const TEST_SCHOOL_MODE = 'SEP-General';
const TEST_SCHOOL_SHIFT = 'Matutino';
const TEST_SCHOOL_ADDRESS = 'Calle Test';
const TEST_SCHOOL_LOCATION = 'Urbana';
const TEST_SCHOOL_CATEGORY = 'Estatal';
const TEST_SCHOOL_LEVEL = 'Primaria';
const TEST_SCHOOL_DESC = 'integration test school';
const TEST_SCHOOL_GOAL = 1000.00;
const TEST_SCHOOL_PROGRESS = 0.00;

async function cleanupTestData(client) {
    // Remove related school_needs first due to FK
    const { rows: schools } = await client.query(
        `SELECT id FROM schools WHERE cct = $1`, [TEST_SCHOOL_CCT]
    );
    for (const row of schools) {
        await client.query('DELETE FROM schools_needs WHERE school_id = $1', [row.id]);
    }
    await client.query('DELETE FROM schools WHERE cct = $1', [TEST_SCHOOL_CCT]);
    await client.query('DELETE FROM schools WHERE cct = $1', [`${TEST_SCHOOL_CCT}_UPDATED`]);
}

describe('Schools CRUD integration (real DB)', () => {
    let client;
    let schoolId;

    beforeAll(async () => {
        client = await pool.connect();
        await cleanupTestData(client);
    });

    afterAll(async () => {
        await cleanupTestData(client);
        client.release();
        await pool.end();
    });

    it('creates a school (C)', async () => {
        const res = await client.query(
            `INSERT INTO schools
                (region, school, name, employees, students, level, cct, mode, shift, address, location, category, description, goal, progress)
             VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING *`,
            [
                TEST_SCHOOL_REGION,
                TEST_SCHOOL_PLANTEL,
                TEST_SCHOOL_NAME,
                10, // employees
                100, // students
                TEST_SCHOOL_LEVEL,
                TEST_SCHOOL_CCT,
                TEST_SCHOOL_MODE,
                TEST_SCHOOL_SHIFT,
                TEST_SCHOOL_ADDRESS,
                TEST_SCHOOL_LOCATION,
                TEST_SCHOOL_CATEGORY,
                TEST_SCHOOL_DESC,
                TEST_SCHOOL_GOAL,
                TEST_SCHOOL_PROGRESS
            ]
        );
        expect(res.rows).toHaveLength(1);
        schoolId = res.rows[0].id;
        expect(res.rows[0].region).toBe(TEST_SCHOOL_REGION);
        expect(res.rows[0].school).toBe(TEST_SCHOOL_PLANTEL);
        expect(res.rows[0].name).toBe(TEST_SCHOOL_NAME);
        expect(res.rows[0].employees).toBe(10);
        expect(res.rows[0].students).toBe(100);
        expect(res.rows[0].level).toBe(TEST_SCHOOL_LEVEL);
        expect(res.rows[0].cct).toBe(TEST_SCHOOL_CCT);
        expect(res.rows[0].mode).toBe(TEST_SCHOOL_MODE);
        expect(res.rows[0].shift).toBe(TEST_SCHOOL_SHIFT);
        expect(res.rows[0].address).toBe(TEST_SCHOOL_ADDRESS);
        expect(res.rows[0].location).toBe(TEST_SCHOOL_LOCATION);
        expect(res.rows[0].category).toBe(TEST_SCHOOL_CATEGORY);
        expect(res.rows[0].description).toBe(TEST_SCHOOL_DESC);
        expect(Number(res.rows[0].goal)).toBeCloseTo(TEST_SCHOOL_GOAL);
        expect(Number(res.rows[0].progress)).toBeCloseTo(TEST_SCHOOL_PROGRESS);
    });

    it('reads the school (R)', async () => {
        const res = await client.query(
            `SELECT * FROM schools WHERE id = $1`,
            [schoolId]
        );
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].name).toBe(TEST_SCHOOL_NAME);
        expect(res.rows[0].cct).toBe(TEST_SCHOOL_CCT);
    });

    it('updates the school (U)', async () => {
        const updatedName = TEST_SCHOOL_NAME + ' Updated';
        const updatedCCT = TEST_SCHOOL_CCT + '_UPDATED';
        const updatedGoal = 2000.00;
        const res = await client.query(
            `UPDATE schools SET name = $1, cct = $2, goal = $3, updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [updatedName, updatedCCT, updatedGoal, schoolId]
        );
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].name).toBe(updatedName);
        expect(res.rows[0].cct).toBe(updatedCCT);
        expect(Number(res.rows[0].goal)).toBeCloseTo(updatedGoal);
    });

    it('deletes the school (D)', async () => {
        await client.query(
            `DELETE FROM schools WHERE id = $1`,
            [schoolId]
        );
        const res = await client.query(
            `SELECT * FROM schools WHERE id = $1`,
            [schoolId]
        );
        expect(res.rows).toHaveLength(0);
    });
});