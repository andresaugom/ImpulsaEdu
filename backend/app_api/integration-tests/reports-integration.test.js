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
        if (client) client.release();
        await pool.end();
    });

    it('successfully aggregates donations by school from real database', async () => {
        // 1. Seed a Donor and grab UUID
        const donorRes = await client.query(`
            INSERT INTO donors (name, region, donor_type) 
            VALUES ('Report Donor', 'North', 'Fisica') 
            RETURNING id
        `);
        const donorId = donorRes.rows[0].id;

        // 2. Seed two Schools and grab their UUIDs
        const school1Res = await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('North', 'Sch1', 'School 1', 'Primaria', 'CCT1', 'Presencial', 'Matutino', 'Addr', 'Loc', 'Estatal', 5000) 
            RETURNING id
        `);
        const school1Id = school1Res.rows[0].id;

        const school2Res = await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('North', 'Sch2', 'School 2', 'Universidad', 'CCT2', 'En linea', 'Vespertino', 'Addr2', 'Loc2', 'Federal', 8000) 
            RETURNING id
        `);
        const school2Id = school2Res.rows[0].id;

        // 3. Insert Donations mapping directly to those UUIDs using correct ENUMs
        // School 1 gets 300 total, School 2 gets 200 total
        await client.query(`
            INSERT INTO donations (donor_id, school_id, amount, donation_type, status) VALUES 
            ($1, $2, 100, 'Monetaria', 'Entregado'),
            ($1, $2, 200, 'Monetaria', 'Entregado'),
            ($1, $3, 200, 'Material', 'Entregado')
        `, [donorId, school1Id, school2Id]);

        // 4. Request the report
        const res = await request(app).get('/api/v1/reports/donations-by-school');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        const school1 = res.body.find(s => s.cct === 'CCT1');
        const school2 = res.body.find(s => s.cct === 'CCT2');

        // Verify aggregation worked on the DB level
        expect(Number(school1.total_donations)).toBe(300);
        expect(Number(school2.total_donations)).toBe(200);
    });
});