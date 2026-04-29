'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../db/pool', () => ({
    query:   jest.fn(),
    connect: jest.fn()
}));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../server');
const pool    = require('../db/pool');

const staffToken = jwt.sign({ sub: 'staff-1', email: 'staff@test.com', role: 'staff' }, 'test-secret');

const DONOR_ROW = {
    id:             'donor-uuid-1',
    name:           'Empresa XYZ S.A.',
    region:         'Zapopan',
    donor_type:     'Moral',
    description:    null,
    email:          'contacto@xyz.com',
    phone:          '+52 33 1234 5678',
    deleted_at:     null,
    donation_count: '3'
};

let mockClient;

beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    pool.query.mockReset();
    pool.connect.mockReset();
    pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/v1/donors ─────────────────────────────────────────────────────────

describe('GET /api/v1/donors', () => {
    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/v1/donors');
        expect(res.status).toBe(401);
    });

    it('returns paginated list', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '1' }] })
            .mockResolvedValueOnce({ rows: [DONOR_ROW] });

        const res = await request(app)
            .get('/api/v1/donors')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body.items[0]).toMatchObject({
            id:             'donor-uuid-1',
            name:           'Empresa XYZ S.A.',
            donation_count: 3
        });
        expect(res.body.total).toBe(1);
    });

    it('filters by name (partial, case-insensitive)', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/donors?name=empresa')
            .set('Authorization', `Bearer ${staffToken}`);

        const params = pool.query.mock.calls[0][1];
        expect(params).toContain('%empresa%');
    });

    it('filters by donor_type', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/donors?donor_type=Fisica')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(pool.query.mock.calls[0][1]).toContain('Fisica');
    });

    it('filters by is_active=false using deleted_at IS NOT NULL', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/donors?is_active=false')
            .set('Authorization', `Bearer ${staffToken}`);

        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain('deleted_at IS NOT NULL');
    });
});

// ── GET /api/v1/donors/:id ─────────────────────────────────────────────────────

describe('GET /api/v1/donors/:id', () => {
    it('returns 404 when donor not found', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [], rowCount: 0 })
            .mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .get('/api/v1/donors/nonexistent')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(404);
    });

    it('returns donor with donation history', async () => {
        const donation = {
            id:            'don-1',
            school_name:   'Escuela Juárez',
            donation_type: 'Monetaria',
            amount:        '10000',
            status:        'Finalizado',
            created_at:    '2026-01-15T10:00:00Z'
        };

        pool.query
            .mockResolvedValueOnce({ rows: [DONOR_ROW], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [donation] });

        const res = await request(app)
            .get('/api/v1/donors/donor-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            id:   'donor-uuid-1',
            name: 'Empresa XYZ S.A.'
        });
        expect(res.body.donations).toHaveLength(1);
        expect(res.body.donations[0]).toMatchObject({
            school_name:   'Escuela Juárez',
            status:        'Finalizado'
        });
    });
});

// ── POST /api/v1/donors ────────────────────────────────────────────────────────

describe('POST /api/v1/donors', () => {
    it('returns 400 when required fields missing', async () => {
        const res = await request(app)
            .post('/api/v1/donors')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'Juan' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('returns 400 for invalid donor_type', async () => {
        const res = await request(app)
            .post('/api/v1/donors')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'Juan', region: 'Zapopan', donor_type: 'unknown' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_TYPE');
    });

    it('creates donor and returns 201', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                          // BEGIN
            .mockResolvedValueOnce({ rows: [DONOR_ROW], rowCount: 1 });  // INSERT

        const res = await request(app)
            .post('/api/v1/donors')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'Empresa XYZ S.A.', region: 'Zapopan', donor_type: 'Moral' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Empresa XYZ S.A.');
    });

    it('returns 409 on duplicate name/region conflict', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                     // BEGIN
            .mockRejectedValueOnce({ code: '23505' });               // INSERT throws

        const res = await request(app)
            .post('/api/v1/donors')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'Dup', region: 'Zapopan', donor_type: 'Fisica' });

        expect(res.status).toBe(409);
        expect(res.body.error.code).toBe('CONFLICT');
    });
});

// ── PUT /api/v1/donors/:id ─────────────────────────────────────────────────────

describe('PUT /api/v1/donors/:id', () => {
    it('returns 404 when donor not found', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })              // BEGIN
            .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT - not found

        const res = await request(app)
            .put('/api/v1/donors/nonexistent')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'New Name' });
        expect(res.status).toBe(404);
    });

    it('returns 400 with no update fields', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                              // BEGIN
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-uuid-1' }] }); // SELECT - found

        const res = await request(app)
            .put('/api/v1/donors/donor-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it('updates donor successfully', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                              // BEGIN
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-uuid-1' }] }) // SELECT
            .mockResolvedValueOnce({ rowCount: 1 });                          // UPDATE
        pool.query.mockResolvedValueOnce({ rows: [{ ...DONOR_ROW, name: 'New Name' }] });

        const res = await request(app)
            .put('/api/v1/donors/donor-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ name: 'New Name' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('New Name');
    });
});

// ── PATCH /api/v1/donors/:id/deactivate ───────────────────────────────────────

describe('PATCH /api/v1/donors/:id/deactivate', () => {
    it('returns 404 when donor not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .patch('/api/v1/donors/nonexistent/deactivate')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(404);
    });

    it('deactivates donor and returns 200', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-uuid-1' }] });

        const res = await request(app)
            .patch('/api/v1/donors/donor-uuid-1/deactivate')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(200);
    });
});
