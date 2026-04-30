// 1. MUST LOAD DOTENV FIRST
require('dotenv').config({ path: '.env.test' }); 

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken'); 
const { pool, clearDatabase } = require('./test-utils'); 
const usersRouter = require('../routes/users'); 
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
    
    /**
     * FIX: The 'sub' field must be a valid UUID string to satisfy 
     * the PostgreSQL 'created_by' foreign key or UUID column constraint.
     */
    const adminToken = jwt.sign(
        { 
            sub: '00000000-0000-0000-0000-000000000000', 
            email: 'admin@test.com', 
            role: 'admin' 
        }, 
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
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                full_name: 'Integration User',
                email: 'integration@test.com',
                password: 'password123',
                role: 'staff' 
            });

        // If this still fails with 500, check if 'created_by' references a real user ID.
        // If it does, you may need to insert a seed user with the UUID used above first.
        expect(res.status).toBe(201);

        const dbRes = await client.query("SELECT * FROM users WHERE email = 'integration@test.com'");
        expect(dbRes.rows.length).toBe(1);
        
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

        expect(res.status).toBe(401);
    });
});