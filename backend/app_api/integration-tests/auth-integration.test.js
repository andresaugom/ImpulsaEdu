require('dotenv').config({ path: '.env.test' }); 

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken'); 
const { pool, clearDatabase } = require('./test-utils'); 
const usersRouter = require('../routes/users'); 
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

// Mounting to users as confirmed by your project structure
app.use('/api/v1/users', usersRouter);

describe('User Management & Creation Integration Pipeline', () => {
    let client;
    
    // We define a constant UUID to use for both the token and the DB record
    const ADMIN_ID = '00000000-0000-0000-0000-000000000000';
    
    const adminToken = jwt.sign(
        { 
            sub: ADMIN_ID, 
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
            // 1. Wipe the database
            await clearDatabase(client);
            
            // 2. SEED THE ADMIN USER
            // This satisfies the Foreign Key constraint "users_created_by_fkey"
            await client.query(
                `INSERT INTO users (id, firstname, lastname, email, password_hash, role) 
                 VALUES ($1, 'Admin', 'Test', 'admin@test.com', 'no-password', 'admin')`,
                [ADMIN_ID]
            );
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

        // This should now return 201 because the 'created_by' ID exists in the DB
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