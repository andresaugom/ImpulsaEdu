const request = require('supertest');
const express = require('express');
// Ensure environment variables are loaded if you use a .env file locally
require('dotenv').config(); 

const { pool, clearDatabase } = require('./test-utils');
const usersRouter = require('../routes/users');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use('/api/v1/auth', usersRouter);

describe('Auth & Users Integration Pipeline', () => {
    let client;

    beforeAll(async () => {
        try {
            // Log connection info in CI if it fails (Hidden in production)
            if (process.env.GITHUB_ACTIONS) {
                console.log(`Connecting to DB at ${process.env.DB_HOST} as ${process.env.DB_USER}`);
            }
            client = await pool.connect();
        } catch (err) {
            console.error("Failed to connect to the pool. Check DB_USER and DB_PASSWORD env vars.");
            throw err;
        }
    });

    beforeEach(async () => {
        // Ensure client exists before clearing
        if (client) {
            await clearDatabase(client);
        }
    });

    afterAll(async () => {
        if (client) {
            client.release();
        }
        // Only end the pool if this is the only test file using it, 
        // otherwise Jest might fail on subsequent suites.
        await pool.end();
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