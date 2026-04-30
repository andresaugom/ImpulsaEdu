// 1. MUST LOAD DOTENV FIRST
require('dotenv').config({ path: '.env.test' }); 

const request = require('supertest');
const express = require('express');
const { pool, clearDatabase } = require('./test-utils'); 
const bcrypt = require('bcryptjs');

// FIX 1: Import the AUTH router, not the users router
// In ImpulsaEdu, auth routes (login/register) are separate from user management (CRUD)
const authRouter = require('../routes/auth'); 

const app = express();
app.use(express.json());

// FIX 2: Mount the authRouter to the correct base path
app.use('/api/v1/auth', authRouter);

describe('Auth & Users Integration Pipeline', () => {
    let client;

    beforeAll(async () => {
        try {
            client = await pool.connect();
        } catch (err) {
            console.error("CRITICAL: Could not connect to the test database.", err);
            throw err;
        }
    });

    beforeEach(async () => {
        if (client) {
            await clearDatabase(client);
        }
    });

    afterAll(async () => {
        if (client) {
            client.release();
        }
        await pool.end();
    });

    it('should register a new user in the real database', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                // FIX 3: Your backend uses splitFullName helper, 
                // so we send 'full_name' to match your schema logic
                full_name: 'Integration User',
                email: 'integration@test.com',
                password: 'password123',
                role: 'staff' 
            });

        expect(res.status).toBe(201);

        const dbRes = await client.query("SELECT * FROM users WHERE email = 'integration@test.com'");
        expect(dbRes.rows.length).toBe(1);
        // Based on your splitFullName helper, 'Integration' becomes firstname
        expect(dbRes.rows[0].firstname).toBe('Integration');
    });

    it('should authenticate an existing user via the real database', async () => {
        const hash = await bcrypt.hash('secret123', 10);
        
        // Insert a mock user directly into the DB to test the Login endpoint
        await client.query(
            `INSERT INTO users (firstname, lastname, email, password_hash, role) 
             VALUES ('Login', 'Test', 'login@test.com', $1, 'staff')`,
            [hash]
        );

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'login@test.com',
                password: 'secret123'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });
});