// 1. MUST LOAD DOTENV FIRST
require('dotenv').config({ path: '.env.test' }); 

const request = require('supertest');
const express = require('express');
// Ensure these point to your corrected pool and utility files
const { pool, clearDatabase } = require('./test-utils'); 
const usersRouter = require('../routes/users');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

// Mount the router
app.use('/api/v1/auth', usersRouter);

describe('Auth & Users Integration Pipeline', () => {
    let client;

    beforeAll(async () => {
        try {
            // This will now use the credentials from .env.test or .env
            client = await pool.connect();
        } catch (err) {
            console.error("CRITICAL: Could not connect to the test database. Check your credentials.", err);
            throw err;
        }
    });

    beforeEach(async () => {
        // Ensure client exists before trying to clear the DB
        if (client) {
            await clearDatabase(client);
        }
    });

    afterAll(async () => {
        // Correct cleanup order
        if (client) {
            client.release();
        }
        await pool.end(); // Closes the pool so Jest can exit cleanly
    });

    it('should register a new user in the real database', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send({
                firstname: 'Integration',
                lastname: 'User',
                email: 'integration@test.com',
                password: 'password123',
                role: 'staff' 
            });

        expect(res.status).toBe(201);

        const dbRes = await client.query("SELECT * FROM users WHERE email = 'integration@test.com'");
        expect(dbRes.rows.length).toBe(1);
        expect(dbRes.rows[0].firstname).toBe('Integration');
    });

    it('should authenticate an existing user via the real database', async () => {
        const hash = await bcrypt.hash('secret123', 10);
        // Note: Check if your table uses 'password_hash' or 'password'. 
        // Based on your code, it's 'password_hash'.
        await client.query(
            "INSERT INTO users (firstname, lastname, email, password_hash, role) VALUES ('Login', 'Test', 'login@test.com', $1, 'staff')",
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