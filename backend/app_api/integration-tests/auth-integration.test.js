// 1. MUST LOAD DOTENV FIRST
require('dotenv').config({ path: '.env.test' }); 

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken'); // Required to generate the admin bypass token
const { pool, clearDatabase } = require('./test-utils'); 
const usersRouter = require('../routes/users'); // Using the confirmed existing router
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

/**
 * MOUNTING LOGIC
 * Since users.js handles user creation at its root POST route,
 * we mount it to /api/v1/users.
 */
app.use('/api/v1/users', usersRouter);

describe('User Management & Creation Integration Pipeline', () => {
    let client;
    
    // Generate a token that satisfies the 'requireAdmin' middleware in users.js
    const adminToken = jwt.sign(
        { sub: 'admin-1', email: 'admin@test.com', role: 'admin' }, 
        process.env.JWT_SECRET || 'test-secret-for-ci'
    );

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

    it('should allow an admin to create a new user (Registration Logic)', async () => {
        const res = await request(app)
            .post('/api/v1/users') // Hits the 'router.post("/")' in users.js
            .set('Authorization', `Bearer ${adminToken}`) // Satisfies authenticateToken & requireAdmin
            .send({
                // Match the 'email, password, full_name, role' expected by users.js
                full_name: 'Integration User',
                email: 'integration@test.com',
                password: 'password123',
                role: 'staff' 
            });

        // status 201 is returned by your users.js on success
        expect(res.status).toBe(201);

        const dbRes = await client.query("SELECT * FROM users WHERE email = 'integration@test.com'");
        expect(dbRes.rows.length).toBe(1);
        
        // Verifies the 'splitFullName' helper worked: "Integration User" -> firstname: "Integration"
        expect(dbRes.rows[0].firstname).toBe('Integration');
    });

    it('should fail to create a user if the requester is not an admin', async () => {
        const res = await request(app)
            .post('/api/v1/users')
            .send({
                full_name: 'Unauthorized User',
                email: 'fail@test.com',
                password: 'password123',
                role: 'staff'
            });

        // authenticateToken returns 401 if no token is provided
        expect(res.status).toBe(401);
    });
});