const request = require('supertest');
const express = require('express');
const { pool, clearDatabase } = require('./test-utils');
const schoolsRouter = require('../routes/schools');

const app = express();
app.use(express.json());
app.use('/api/v1/schools', schoolsRouter);

describe('Schools Integration Pipeline', () => {
    let client;

    beforeAll(async () => { client = await pool.connect(); });
    beforeEach(async () => { await clearDatabase(client); });
    afterAll(async () => { client.release(); await pool.end(); });

    it('retrieves a list of schools from the real database', async () => {
        // Seed database
        await client.query("INSERT INTO schools (cct, name) VALUES ('CCT001', 'Test School 1')");
        await client.query("INSERT INTO schools (cct, name) VALUES ('CCT002', 'Test School 2')");
        
        // Make request
        const res = await request(app).get('/api/v1/schools');
        
        // Assertions
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
        expect(res.body.some(s => s.cct === 'CCT001')).toBe(true);
    });
});