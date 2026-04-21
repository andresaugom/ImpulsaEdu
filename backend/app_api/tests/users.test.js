'use strict';

process.env.JWT_SECRET = 'test-secret';

// Mock the pool before requiring the app
jest.mock('../db/pool', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../server');
const pool    = require('../db/pool');

const adminToken = jwt.sign({ sub: 'admin-1', email: 'admin@test.com', role: 'admin' }, 'test-secret');
const staffToken = jwt.sign({ sub: 'staff-1', email: 'staff@test.com', role: 'staff' }, 'test-secret');

const USER_ROW = {
    id:         'user-uuid-1',
    firstname:  'Carlos',
    lastname:   'López',
    email:      'carlos@test.com',
    role:       'staff',
    deleted_at: null
};

beforeEach(() => pool.query.mockReset());

// ── GET /api/v1/users ──────────────────────────────────────────────────────────

describe('GET /api/v1/users', () => {
    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/v1/users');
        expect(res.status).toBe(401);
    });

    it('returns 403 for staff role', async () => {
        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(403);
    });

    it('returns paginated user list for admin', async () => {
        pool.query.mockResolvedValueOnce({ rows: [USER_ROW], rowCount: 1 });

        const res = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            items: [{ id: 'user-uuid-1', full_name: 'Carlos López', email: 'carlos@test.com', role: 'staff', is_active: true }],
            total: 1
        });
    });

    it('filters by role query param', async () => {
        pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app)
            .get('/api/v1/users?role=admin')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        const call = pool.query.mock.calls[0];
        expect(call[0]).toContain('u.role = $1');
        expect(call[1]).toContain('admin');
    });

    it('filters by is_active=false', async () => {
        pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app)
            .get('/api/v1/users?is_active=false')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(pool.query.mock.calls[0][0]).toContain('IS NOT NULL');
    });
});

// ── POST /api/v1/users ─────────────────────────────────────────────────────────

describe('POST /api/v1/users', () => {
    it('returns 403 for staff', async () => {
        const res = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ email: 'x@test.com', password: 'pass', full_name: 'X', role: 'staff' });
        expect(res.status).toBe(403);
    });

    it('returns 400 when fields are missing', async () => {
        const res = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'x@test.com' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('returns 409 when email already exists', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'existing' }] }); // email check

        const res = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'existing@test.com', password: 'pass', full_name: 'Existing User', role: 'staff' });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('EMAIL_CONFLICT');
    });

    it('creates a user and returns 201', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 0, rows: [] })        // email check
            .mockResolvedValueOnce({ rows: [USER_ROW], rowCount: 1 }); // INSERT

        const res = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ email: 'carlos@test.com', password: 'pass123', full_name: 'Carlos López', role: 'staff' });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ email: 'carlos@test.com', full_name: 'Carlos López' });
    });
});

// ── GET /api/v1/users/:id ──────────────────────────────────────────────────────

describe('GET /api/v1/users/:id', () => {
    it('returns 403 when staff tries to read another user', async () => {
        const res = await request(app)
            .get('/api/v1/users/other-user-id')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(403);
    });

    it('returns 404 when user not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .get('/api/v1/users/nonexistent')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });

    it('allows admin to read any user', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [USER_ROW] });

        const res = await request(app)
            .get('/api/v1/users/user-uuid-1')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: 'user-uuid-1', full_name: 'Carlos López', role: 'staff' });
    });

    it('allows staff to read own profile', async () => {
        pool.query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ ...USER_ROW, id: 'staff-1', firstname: 'Staff', lastname: 'User', email: 'staff@test.com' }]
        });

        const res = await request(app)
            .get('/api/v1/users/staff-1')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body.email).toBe('staff@test.com');
    });
});

// ── PUT /api/v1/users/:id ──────────────────────────────────────────────────────

describe('PUT /api/v1/users/:id', () => {
    it('returns 403 when staff tries to update another user', async () => {
        const res = await request(app)
            .put('/api/v1/users/other-user-id')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ full_name: 'New Name' });
        expect(res.status).toBe(403);
    });

    it('returns 400 when no updateable field is provided', async () => {
        const res = await request(app)
            .put('/api/v1/users/admin-1')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('returns 404 when user not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // existence check

        const res = await request(app)
            .put('/api/v1/users/nonexistent')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ full_name: 'New Name' });
        expect(res.status).toBe(404);
    });

    it('allows admin to update any user', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-uuid-1' }] }) // existence check
            .mockResolvedValueOnce({ rows: [{ ...USER_ROW, firstname: 'Carlos', lastname: 'López Jr.' }], rowCount: 1 }); // UPDATE

        const res = await request(app)
            .put('/api/v1/users/user-uuid-1')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ full_name: 'Carlos López Jr.' });

        expect(res.status).toBe(200);
        expect(res.body.is_active).toBe(true);
    });

    it('allows staff to update own profile', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'staff-1' }] })
            .mockResolvedValueOnce({ rows: [{ ...USER_ROW, id: 'staff-1' }], rowCount: 1 });

        const res = await request(app)
            .put('/api/v1/users/staff-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ full_name: 'Staff User Updated' });

        expect(res.status).toBe(200);
    });
});

// ── PATCH /api/v1/users/:id/deactivate ────────────────────────────────────────

describe('PATCH /api/v1/users/:id/deactivate', () => {
    it('returns 403 for staff', async () => {
        const res = await request(app)
            .patch('/api/v1/users/user-uuid-1/deactivate')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(403);
    });

    it('returns 404 when user not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .patch('/api/v1/users/nonexistent/deactivate')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });

    it('deactivates user and returns 200', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'user-uuid-1' }] });

        const res = await request(app)
            .patch('/api/v1/users/user-uuid-1/deactivate')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
    });
});
