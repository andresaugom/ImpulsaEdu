const request = require('supertest');
const express = require('express');
const { pool, clearDatabase } = require('./test-utils');
const usersRouter = require('../routes/users');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use('/api/v1/users', usersRouter);

describe('Auth & Users Integration Pipeline', () => {
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

    it('should register a new user in the real database', async () => {
        const res = await request(app)
            .post('/api/v1/users/register')
            .send({
                firstname: 'Integration',
                lastname: 'User',
                email: 'integration@test.com',
                password: 'password123',
                role: 'staff' // using the ENUM
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
            .post('/api/v1/users/login')
            .send({
                email: 'login@test.com',
                password: 'secret123'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });
});