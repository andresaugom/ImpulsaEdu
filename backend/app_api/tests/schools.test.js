'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../server');
const pool    = require('../db/pool');

const staffToken = jwt.sign({ sub: 'staff-1', email: 'staff@test.com', role: 'staff' }, 'test-secret');

const SCHOOL_ROW = {
    id:              'school-uuid-1',
    name:            'Escuela Primaria Juárez',
    region:          'Jalisco',
    category:        'Infrastructure',
    description:     'Needs new bathrooms.',
    funding_goal:    '50000.00',
    status:          'active',
    confirmed_value: '22500.00'
};

const SCHOOL_BODY = {
    id:              'school-uuid-1',
    name:            'Escuela Primaria Juárez',
    region:          'Jalisco',
    category:        'Infrastructure',
    description:     'Needs new bathrooms.',
    funding_goal:    50000,
    confirmed_value: 22500,
    progress_pct:    45,
    status:          'active'
};

beforeEach(() => pool.query.mockReset());

// ── GET /api/v1/schools ────────────────────────────────────────────────────────

describe('GET /api/v1/schools', () => {
    it('is public — no auth required', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '1' }] })
            .mockResolvedValueOnce({ rows: [SCHOOL_ROW] });

        const res = await request(app).get('/api/v1/schools');
        expect(res.status).toBe(200);
    });

    it('returns paginated list with correct shape', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '1' }] })
            .mockResolvedValueOnce({ rows: [SCHOOL_ROW] });

        const res = await request(app).get('/api/v1/schools');
        expect(res.body).toMatchObject({
            items:    [SCHOOL_BODY],
            total:    1,
            page:     1,
            per_page: 20
        });
    });

    it('defaults status to active', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await request(app).get('/api/v1/schools');
        expect(pool.query.mock.calls[0][1]).toContain('active');
    });

    it('respects region and category filters', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await request(app).get('/api/v1/schools?region=Jalisco&category=Infrastructure');
        const params = pool.query.mock.calls[0][1];
        expect(params).toContain('Jalisco');
        expect(params).toContain('Infrastructure');
    });

    it('caps per_page at 100', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/v1/schools?per_page=999');
        expect(res.body.per_page).toBe(100);
    });
});

// ── GET /api/v1/schools/:id ────────────────────────────────────────────────────

describe('GET /api/v1/schools/:id', () => {
    it('returns school detail', async () => {
        pool.query.mockResolvedValueOnce({ rows: [SCHOOL_ROW], rowCount: 1 });

        const res = await request(app).get('/api/v1/schools/school-uuid-1');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject(SCHOOL_BODY);
    });

    it('returns 404 when school not found', async () => {
        pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app).get('/api/v1/schools/nonexistent');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
});

// ── POST /api/v1/schools ───────────────────────────────────────────────────────

describe('POST /api/v1/schools', () => {
    it('returns 401 without token', async () => {
        const res = await request(app)
            .post('/api/v1/schools')
            .send({ name: 'School', region: 'Jalisco', category: 'Infrastructure', funding_goal: 1000 });
        expect(res.status).toBe(401);
    });

    it('returns 400 when required fields missing', async () => {
        const res = await request(app)
            .post('/api/v1/schools')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'School' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('creates school and returns 201', async () => {
        pool.query.mockResolvedValueOnce({ rows: [SCHOOL_ROW], rowCount: 1 });

        const res = await request(app)
            .post('/api/v1/schools')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                name:         'Escuela Primaria Juárez',
                region:       'Jalisco',
                category:     'Infrastructure',
                description:  'Needs new bathrooms.',
                funding_goal: 50000
            });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Escuela Primaria Juárez');
    });

    it('returns 409 on duplicate name/region', async () => {
        pool.query.mockRejectedValueOnce({ code: '23505' });

        const res = await request(app)
            .post('/api/v1/schools')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'Dup School', region: 'Jalisco', category: 'Cat', funding_goal: 1000 });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
    });
});

// ── PUT /api/v1/schools/:id ────────────────────────────────────────────────────

describe('PUT /api/v1/schools/:id', () => {
    it('returns 404 when school not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .put('/api/v1/schools/nonexistent')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'New Name' });
        expect(res.status).toBe(404);
    });

    it('updates school successfully', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'school-uuid-1' }] }) // existence
            .mockResolvedValueOnce({ rows: [{ ...SCHOOL_ROW, name: 'New Name' }], rowCount: 1 }) // UPDATE
            .mockResolvedValueOnce({ rows: [{ confirmed_value: '22500' }] }); // confirmed_value

        const res = await request(app)
            .put('/api/v1/schools/school-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'New Name' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('New Name');
    });
});

// ── PATCH /api/v1/schools/:id/archive ─────────────────────────────────────────

describe('PATCH /api/v1/schools/:id/archive', () => {
    it('returns 404 when school not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .patch('/api/v1/schools/nonexistent/archive')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(404);
    });

    it('archives school and returns 200', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'school-uuid-1' }] });

        const res = await request(app)
            .patch('/api/v1/schools/school-uuid-1/archive')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
    });
});
