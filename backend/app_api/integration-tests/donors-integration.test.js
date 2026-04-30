/**
 * Integration test for donors CRUD using a real DB connection.
 * Requires a running PostgreSQL instance with credentials from .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../db/pool');

const TEST_DONOR_NAME = 'Donor Integration Test';
const TEST_DONOR_REGION = 'TestRegion';
const TEST_DONOR_TYPE = 'Fisica';
const TEST_DONOR_DESC = 'integration test donor';

async function cleanupTestData(client) {
    await client.query(
        `DELETE FROM donors WHERE name = $1 AND region = $2`,
        [TEST_DONOR_NAME, TEST_DONOR_REGION]
    );
    await client.query(
        `DELETE FROM donors WHERE name = $1 AND region = $2`,
        [`${TEST_DONOR_NAME} Updated`, TEST_DONOR_REGION]
    );
}

describe('Donors CRUD integration (real DB)', () => {
    let client;
    let donorId;

    beforeAll(async () => {
        client = await pool.connect();
        await cleanupTestData(client);
    });

    afterAll(async () => {
        await cleanupTestData(client);
        client.release();
        await pool.end();
    });

    it('creates a donor (C)', async () => {
        const res = await client.query(
            `INSERT INTO donors (name, region, donor_type, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [TEST_DONOR_NAME, TEST_DONOR_REGION, TEST_DONOR_TYPE, TEST_DONOR_DESC]
        );
        expect(res.rows).toHaveLength(1);
        donorId = res.rows[0].id;
        expect(res.rows[0].name).toBe(TEST_DONOR_NAME);
        expect(res.rows[0].region).toBe(TEST_DONOR_REGION);
        expect(res.rows[0].donor_type).toBe(TEST_DONOR_TYPE);
        expect(res.rows[0].description).toBe(TEST_DONOR_DESC);
    });

    it('reads the donor (R)', async () => {
        const res = await client.query(
            `SELECT * FROM donors WHERE id = $1`,
            [donorId]
        );
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].name).toBe(TEST_DONOR_NAME);
        expect(res.rows[0].region).toBe(TEST_DONOR_REGION);
        expect(res.rows[0].donor_type).toBe(TEST_DONOR_TYPE);
        expect(res.rows[0].description).toBe(TEST_DONOR_DESC);
    });

    it('updates the donor (U)', async () => {
        const updatedName = `${TEST_DONOR_NAME} Updated`;
        const updatedDesc = 'integration test donor updated';
        const res = await client.query(
            `UPDATE donors SET name = $1, description = $2, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [updatedName, updatedDesc, donorId]
        );
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].name).toBe(updatedName);
        expect(res.rows[0].description).toBe(updatedDesc);
    });

    it('deletes the donor (D)', async () => {
        await client.query(
            `DELETE FROM donors WHERE id = $1`,
            [donorId]
        );
        const res = await client.query(
            `SELECT * FROM donors WHERE id = $1`,
            [donorId]
        );
        expect(res.rows).toHaveLength(0);
    });
});