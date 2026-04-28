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
    afterAll(async () => { if(client) client.release(); await pool.end(); });

    it('retrieves a list of schools from the real database', async () => {
        // Seed database with ALL strictly required fields from the new schema
        await client.query(`
            INSERT INTO schools (region, school, name, level, cct, mode, shift, address, location, category, goal) 
            VALUES ('North', 'Test1', 'Test School 1', 'Primaria', 'CCT001', 'Presencial', 'Matutino', '123 St', 'City', 'Estatal', 5000),
                   ('South', 'Test2', 'Test School 2', 'Secundaria', 'CCT002', 'En linea', 'Vespertino', '456 St', 'City', 'Federal', 10000)
        `);
        
        const res = await request(app).get('/api/v1/schools');
        
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('creates a new school matching the schema constraints', async () => {
        // 1. JWT mocking/login abstraction (Assuming authenticateToken middleware expects this)
        const token = 'mocked_or_real_jwt_token'; 

        const payload = {
            region: 'West',
            school: 'Test3',
            name: 'New School',
            level: 'Preparatoria',
            cct: 'CCT003',
            mode: 'Semi-presencial',
            shift: 'Mixto',
            address: '789 Blvd',
            location: 'Town',
            category: 'Federalizado',
            goal: 15000
        };

        const res = await request(app)
            .post('/api/v1/schools')
            .set('Authorization', 'Bearer ' + token)
            .send(payload);

        expect(res.status).toBe(201);
        
        // Verify in DB via UUID
        const dbRes = await client.query("SELECT * FROM schools WHERE cct = 'CCT003'");
        expect(dbRes.rows.length).toBe(1);
    });
});