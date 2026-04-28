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

const SUMMARY_ROW = {
    id:            'don-uuid-1',
    donor_id:      'donor-uuid-1',
    donor_name:    'Juan Pérez',
    school_id:     'school-uuid-1',
    school_name:   'Escuela Juárez',
    donation_type: 'Monetaria',
    amount:        '10000.00',
    status:        'Aprobado',
    description:   'Test donation',
    created_at:    '2026-02-01T09:00:00.000Z'
};

const DETAIL_ROW = {
    ...SUMMARY_ROW,
    donor_type:    'Fisica',
    school_region: 'Zapopan'
};

let mockClient;

beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    pool.query.mockReset();
    pool.connect.mockReset();
    pool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/v1/donations ──────────────────────────────────────────────────────

describe('GET /api/v1/donations', () => {
    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/v1/donations');
        expect(res.status).toBe(401);
    });

    it('returns paginated list', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '1' }] })
            .mockResolvedValueOnce({ rows: [SUMMARY_ROW] });

        const res = await request(app)
            .get('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body.items[0]).toMatchObject({
            id:     'don-uuid-1',
            status: 'Aprobado',
            donor:  { name: 'Juan Pérez' }
        });
    });

    it('filters by school_id, donor_id, status, donation_type', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/donations?school_id=s1&donor_id=d1&status=Aprobado&donation_type=Monetaria')
            .set('Authorization', `Bearer ${staffToken}`);

        const params = pool.query.mock.calls[0][1];
        expect(params).toContain('s1');
        expect(params).toContain('d1');
        expect(params).toContain('Aprobado');
        expect(params).toContain('Monetaria');
    });
});

// ── GET /api/v1/donations/:id ──────────────────────────────────────────────────

describe('GET /api/v1/donations/:id', () => {
    it('returns 404 when not found', async () => {
        pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app)
            .get('/api/v1/donations/nonexistent')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(404);
    });

    it('returns donation detail with nested donor, school and items', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [DETAIL_ROW], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [] });  // items

        const res = await request(app)
            .get('/api/v1/donations/don-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            id:            'don-uuid-1',
            donation_type: 'Monetaria',
            status:        'Aprobado',
            donor:         { name: 'Juan Pérez' },
            items:         expect.any(Array)
        });
    });
});

// ── POST /api/v1/donations ─────────────────────────────────────────────────────

describe('POST /api/v1/donations', () => {
    it('returns 400 when required fields missing', async () => {
        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'd1', school_id: 's1' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('returns 400 when amount missing for Monetaria', async () => {
        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'd1', school_id: 's1', donation_type: 'Monetaria' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_AMOUNT');
    });

    it('returns 404 when donor not found', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })              // BEGIN
            .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT donor - not found

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'missing', school_id: 's1', donation_type: 'Monetaria', amount: 1000 });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when school not found', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                              // BEGIN
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-1' }] }) // SELECT donor - found
            .mockResolvedValueOnce({ rowCount: 0, rows: [] });                 // SELECT school - not found

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'donor-1', school_id: 'missing', donation_type: 'Monetaria', amount: 1000 });
        expect(res.status).toBe(404);
    });

    it('returns 404 when school is archived', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                              // BEGIN
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-1' }] }) // SELECT donor - found
            .mockResolvedValueOnce({ rowCount: 0, rows: [] });                 // SELECT school - archived (deleted_at set)

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'donor-1', school_id: 'school-1', donation_type: 'Monetaria', amount: 1000 });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('creates donation and returns 201 with full detail', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                               // BEGIN
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-1' }] }) // SELECT donor
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'school-1' }] }) // SELECT school
            .mockResolvedValueOnce({ rows: [{ id: 'don-uuid-1' }], rowCount: 1 }); // INSERT donation
        pool.query
            .mockResolvedValueOnce({ rows: [DETAIL_ROW], rowCount: 1 }) // DETAIL_SELECT
            .mockResolvedValueOnce({ rows: [] });                        // items

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'donor-1', school_id: 'school-1', donation_type: 'Monetaria', amount: 10000 });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe('don-uuid-1');
        expect(res.body.donation_type).toBe('Monetaria');
        expect(res.body.items).toBeDefined();
    });
});

// ── PUT /api/v1/donations/:id ──────────────────────────────────────────────────

describe('PUT /api/v1/donations/:id', () => {
    it('returns 404 when not found', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })              // BEGIN
            .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // SELECT - not found

        const res = await request(app)
            .put('/api/v1/donations/nonexistent')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ description: 'Updated' });
        expect(res.status).toBe(404);
    });

    it('updates editable fields', async () => {
        mockClient.query
            .mockResolvedValueOnce({ rows: [] })                              // BEGIN
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1' }] }) // SELECT - found
            .mockResolvedValueOnce({ rowCount: 1 });                          // UPDATE description
        pool.query
            .mockResolvedValueOnce({ rows: [DETAIL_ROW], rowCount: 1 }) // DETAIL_SELECT
            .mockResolvedValueOnce({ rows: [] });                        // items

        const res = await request(app)
            .put('/api/v1/donations/don-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ description: 'Updated description' });

        expect(res.status).toBe(200);
    });

    it('returns 400 when no fields provided', async () => {
        const res = await request(app)
            .put('/api/v1/donations/don-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({});

        expect(res.status).toBe(400);
    });
});

// ── PATCH /api/v1/donations/:id/status ────────────────────────────────────────

describe('PATCH /api/v1/donations/:id/status', () => {
    it('returns 404 when not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .patch('/api/v1/donations/nonexistent/status')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'Aprobado' });
        expect(res.status).toBe(404);
    });

    it('returns 422 on invalid status transition', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', status: 'Finalizado' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/status')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'Entregando' });

        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('advances status from Registrado to Aprobado', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', status: 'Registrado' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'don-uuid-1', status: 'Aprobado' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/status')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'Aprobado' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Aprobado');
    });

    it('allows cancellation from Aprobado state', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', status: 'Aprobado' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'don-uuid-1', status: 'Cancelado' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/status')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'Cancelado' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('Cancelado');
    });

    it('rejects transition from terminal state Finalizado', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', status: 'Finalizado' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/status')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'Aprobado' });

        expect(res.status).toBe(422);
    });

    it('rejects transition from terminal state Cancelado', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', status: 'Cancelado' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/status')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ status: 'Aprobado' });

        expect(res.status).toBe(422);
    });

    it('returns 400 when status field is missing', async () => {
        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/status')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({});
        expect(res.status).toBe(400);
    });
});
