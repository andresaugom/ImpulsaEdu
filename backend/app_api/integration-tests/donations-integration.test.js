const request = require('supertest');
const express = require('express');
const { pool, clearDatabase } = require('./test-utils');
const donationsRouter = require('../routes/donations');

const app = express();
app.use(express.json());
// Mock auth 
jest.mock('../middleware/auth', () => ({ authenticateToken: (req, res, next) => next() }));
app.use('/api/v1/donations', donationsRouter);

describe('Donations Integration Pipeline', () => {
    let client;

    beforeAll(async () => { client = await pool.connect(); });
    beforeEach(async () => { await clearDatabase(client); });
    afterAll(async () => { if(client) client.release(); await pool.end(); });

    it('creates a donation associated with UUIDs for donor and school', async () => {
        // 1. Seed strict FK setup
        const donorRes = await client.query(`
            INSERT INTO donors (name, region, donor_type) VALUES ('Donor Corp', 'North', 'Moral') RETURNING id
        `);
        const schoolRes = await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('North', 'SchA', 'NameA', 'Primaria', 'CCTA', 'Presencial', 'Matutino', 'Addr', 'Loc', 'Estatal', 500) RETURNING id
        `);
        
        const donor_id = donorRes.rows[0].id;
        const school_id = schoolRes.rows[0].id;

        // 2. HTTP Request mapping to schema
        const res = await request(app)
            .post('/api/v1/donations')
            .send({
                donor_id,
                school_id,
                amount: 1000,
                donation_type: 'Monetaria',
                status: 'Registrado'
            });

        expect(res.status).toBe(201);
        const dbRes = await client.query("SELECT * FROM donations WHERE donor_id = $1", [donor_id]);
        expect(dbRes.rows.length).toBe(1);
    });
});