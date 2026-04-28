const request = require('supertest');
const express = require('express');
const { pool, clearDatabase } = require('./test-utils');
const reportsRouter = require('../routes/reports');

const app = express();
app.use(express.json());

// Mock auth & admin middleware for the reports router
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => next(),
    requireAdmin: (req, res, next) => next()
}));

app.use('/api/v1/reports', reportsRouter);

describe('Reports Integration Pipeline', () => {
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

    it('successfully aggregates donations by school from real database', async () => {
        // Seed database
        await client.query("INSERT INTO users (id, name, email, password_hash, role) VALUES (1, 'Admin', 'admin@test.com', 'h', 'admin')");
        await client.query("INSERT INTO donors (id, user_id, contact_info) VALUES (1, 1, 'info')");
        
        await client.query("INSERT INTO schools (cct, name) VALUES ('CCT1', 'School 1'), ('CCT2', 'School 2')");
        await client.query("INSERT INTO schools_needs (id, school_cct, need_type) VALUES (1, 'CCT1', 'tech'), (2, 'CCT2', 'infra')");
        
        // Insert aggregated amounts: School 1 gets 300, School 2 gets 200
        await client.query(`
            INSERT INTO donations (amount, status, donor_id, need_id) VALUES 
            (100, 'completed', 1, 1),
            (200, 'completed', 1, 1),
            (200, 'completed', 1, 2)
        `);

        const res = await request(app).get('/api/v1/reports/donations-by-school');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        const school1 = res.body.find(s => s.cct === 'CCT1');
        const school2 = res.body.find(s => s.cct === 'CCT2');

        // Verify aggregation
        expect(Number(school1.total_donations)).toBe(300);
        expect(Number(school2.total_donations)).toBe(200);
    });
});