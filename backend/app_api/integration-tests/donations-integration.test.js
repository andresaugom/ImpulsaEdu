const request = require('supertest');
const express = require('express');
const { pool, clearDatabase } = require('./test-utils');
const donationsRouter = require('../routes/donations');

const app = express();
app.use(express.json());
app.use('/api/v1/donations', donationsRouter);

// Mock auth middleware to bypass JWT token validation for isolated router DB tests
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, role: 'standard' };
        next();
    }
}));

describe('Donations Integration Pipeline', () => {
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

    it('creates a donation associating real schools and users', async () => {
        // 1. Seed Foreign Keys
        await client.query("INSERT INTO users (id, name, email, password_hash, role) VALUES (1, 'D', 'd@t.com', 'h', 'standard')");
        await client.query("INSERT INTO donors (id, user_id, contact_info) VALUES (1, 1, 'info')");
        await client.query("INSERT INTO schools (cct, name) VALUES ('123ABC456', 'Test School')");
        await client.query("INSERT INTO schools_needs (id, school_cct, need_type) VALUES (1, '123ABC456', 'Infrastructure')");

        // 2. HTTP Request
        const res = await request(app)
            .post('/api/v1/donations')
            .send({
                amount: 1000,
                status: 'completed',
                donor_id: 1,
                need_id: 1
            });

        expect(res.status).toBe(201);

        // 3. Verify Database Insertion
        const dbRes = await client.query("SELECT * FROM donations WHERE amount = 1000");
        expect(dbRes.rows.length).toBe(1);
        expect(dbRes.rows[0].donor_id).toBe(1);
    });
});