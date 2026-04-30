/**
 * Integration test for users CRUD using a real DB connection.
 * Requires a running PostgreSQL instance with credentials from .env
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../db/pool');

const TEST_USER_EMAIL = 'integration.user@example.com';
const TEST_USER_EMAIL_UPDATED = 'integration.user.updated@example.com';
const TEST_USER_FIRSTNAME = 'Integration';
const TEST_USER_MIDDLENAME = 'Test';
const TEST_USER_LASTNAME = 'User';
const TEST_USER_ROLE = 'staff';
const TEST_USER_PHONE = '555-1234';
const TEST_USER_PASSWORD_HASH = 'hashedpassword123';

async function cleanupTestData(client) {
    await client.query(
        `DELETE FROM users WHERE email IN ($1, $2)`,
        [TEST_USER_EMAIL, TEST_USER_EMAIL_UPDATED]
    );
}

describe('Users CRUD integration (real DB)', () => {
    let client;
    let userId;

    beforeAll(async () => {
        client = await pool.connect();
        await cleanupTestData(client);
    });

    afterAll(async () => {
        await cleanupTestData(client);
        client.release();
        await pool.end();
    });

    it('creates a user (C)', async () => {
        const res = await client.query(
            `INSERT INTO users (firstname, middlename, lastname, role, email, phone, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                TEST_USER_FIRSTNAME,
                TEST_USER_MIDDLENAME,
                TEST_USER_LASTNAME,
                TEST_USER_ROLE,
                TEST_USER_EMAIL,
                TEST_USER_PHONE,
                TEST_USER_PASSWORD_HASH
            ]
        );
        expect(res.rows).toHaveLength(1);
        userId = res.rows[0].id;
        expect(res.rows[0].firstname).toBe(TEST_USER_FIRSTNAME);
        expect(res.rows[0].middlename).toBe(TEST_USER_MIDDLENAME);
        expect(res.rows[0].lastname).toBe(TEST_USER_LASTNAME);
        expect(res.rows[0].role).toBe(TEST_USER_ROLE);
        expect(res.rows[0].email).toBe(TEST_USER_EMAIL);
        expect(res.rows[0].phone).toBe(TEST_USER_PHONE);
        expect(res.rows[0].password_hash).toBe(TEST_USER_PASSWORD_HASH);
    });

    it('reads the user (R)', async () => {
        const res = await client.query(
            `SELECT * FROM users WHERE id = $1`,
            [userId]
        );
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].firstname).toBe(TEST_USER_FIRSTNAME);
        expect(res.rows[0].middlename).toBe(TEST_USER_MIDDLENAME);
        expect(res.rows[0].lastname).toBe(TEST_USER_LASTNAME);
        expect(res.rows[0].role).toBe(TEST_USER_ROLE);
        expect(res.rows[0].email).toBe(TEST_USER_EMAIL);
        expect(res.rows[0].phone).toBe(TEST_USER_PHONE);
        expect(res.rows[0].password_hash).toBe(TEST_USER_PASSWORD_HASH);
    });

    it('updates the user (U)', async () => {
        const res = await client.query(
            `UPDATE users SET email = $1, phone = $2, updated_at = NOW()
             WHERE id = $3 RETURNING *`,
            [TEST_USER_EMAIL_UPDATED, '555-5678', userId]
        );
        expect(res.rows).toHaveLength(1);
        expect(res.rows[0].email).toBe(TEST_USER_EMAIL_UPDATED);
        expect(res.rows[0].phone).toBe('555-5678');
    });

    it('deletes the user (D)', async () => {
        await client.query(
            `DELETE FROM users WHERE id = $1`,
            [userId]
        );
        const res = await client.query(
            `SELECT * FROM users WHERE id = $1`,
            [userId]
        );
        expect(res.rows).toHaveLength(0);
    });
});
