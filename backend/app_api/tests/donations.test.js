'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../server');
const pool    = require('../db/pool');

const staffToken = jwt.sign({ sub: 'staff-1', email: 'staff@test.com', role: 'staff' }, 'test-secret');

const SUMMARY_ROW = {
    id:              'don-uuid-1',
    donor_id:        'donor-uuid-1',
    donor_name:      'Juan Pérez',
    school_id:       'school-uuid-1',
    school_name:     'Escuela Juárez',
    type:            'monetary',
    amount:          '10000.00',
    estimated_value: null,
    state:           'approved',
    delivery_mode:   'donor_to_ngo',
    registered_at:   '2026-02-01T09:00:00.000Z'
};

const DETAIL_ROW = {
    ...SUMMARY_ROW,
    donor_type:      'individual',
    school_region:   'Jalisco',
    description:     'Test donation',
    observations:    null,
    shipping_address:null,
    tracking_info:   null,
    delivery_notes:  null,
    registered_at:   '2026-02-01T09:00:00.000Z',
    approved_at:     '2026-02-03T14:30:00.000Z',
    in_delivery_at:  null,
    delivered_at:    null,
    completed_at:    null,
    cancelled_at:    null
};

beforeEach(() => pool.query.mockReset());

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
            id:    'don-uuid-1',
            state: 'approved',
            donor: { full_name: 'Juan Pérez' }
        });
    });

    it('filters by school_id, donor_id, state, type', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/donations?school_id=s1&donor_id=d1&state=approved&type=monetary')
            .set('Authorization', `Bearer ${staffToken}`);

        const params = pool.query.mock.calls[0][1];
        expect(params).toContain('s1');
        expect(params).toContain('d1');
        expect(params).toContain('approved');
        expect(params).toContain('monetary');
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

    it('returns donation detail with nested delivery and timeline', async () => {
        pool.query.mockResolvedValueOnce({ rows: [DETAIL_ROW], rowCount: 1 });

        const res = await request(app)
            .get('/api/v1/donations/don-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            id:    'don-uuid-1',
            type:  'monetary',
            state: 'approved',
            delivery: {
                mode: 'donor_to_ngo'
            },
            timeline: {
                registered_at:  '2026-02-01T09:00:00.000Z',
                approved_at:    '2026-02-03T14:30:00.000Z',
                in_delivery_at: null
            }
        });
    });
});

// ── POST /api/v1/donations ─────────────────────────────────────────────────────

describe('POST /api/v1/donations', () => {
    it('returns 400 when required fields missing', async () => {
        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'd1', school_id: 's1', type: 'monetary' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('returns 400 when amount missing for monetary', async () => {
        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'd1', school_id: 's1', type: 'monetary', delivery: { mode: 'donor_to_ngo' } });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_AMOUNT');
    });

    it('returns 400 when estimated_value missing for material', async () => {
        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ donor_id: 'd1', school_id: 's1', type: 'material', delivery: { mode: 'donor_to_ngo' } });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_ESTIMATED_VALUE');
    });

    it('returns 404 when donor not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] }); // donor check

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                donor_id: 'missing', school_id: 's1', type: 'monetary',
                amount: 1000, delivery: { mode: 'donor_to_ngo' }
            });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 when school not found', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-1' }] })
            .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // school check

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                donor_id: 'donor-1', school_id: 'missing', type: 'monetary',
                amount: 1000, delivery: { mode: 'donor_to_ngo' }
            });
        expect(res.status).toBe(404);
    });

    it('returns 422 when school is archived', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-1' }] })
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'school-1', status: 'archived' }] });

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                donor_id: 'donor-1', school_id: 'school-1', type: 'monetary',
                amount: 1000, delivery: { mode: 'donor_to_ngo' }
            });
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('SCHOOL_ARCHIVED');
    });

    it('creates donation and returns 201 with full detail', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'donor-1' }] })
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'school-1', status: 'active' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'don-uuid-1' }], rowCount: 1 })
            .mockResolvedValueOnce({ rows: [DETAIL_ROW], rowCount: 1 });

        const res = await request(app)
            .post('/api/v1/donations')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({
                donor_id: 'donor-1', school_id: 'school-1', type: 'monetary',
                amount: 10000, delivery: { mode: 'donor_to_ngo' }
            });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe('don-uuid-1');
        expect(res.body.delivery).toBeDefined();
        expect(res.body.timeline).toBeDefined();
    });
});

// ── PUT /api/v1/donations/:id ──────────────────────────────────────────────────

describe('PUT /api/v1/donations/:id', () => {
    it('returns 404 when not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .put('/api/v1/donations/nonexistent')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ description: 'Updated' });
        expect(res.status).toBe(404);
    });

    it('updates editable fields', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1' }] })
            .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
            .mockResolvedValueOnce({ rows: [DETAIL_ROW], rowCount: 1 });

        const res = await request(app)
            .put('/api/v1/donations/don-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ description: 'Updated description' });

        expect(res.status).toBe(200);
    });

    it('returns 400 when no fields provided', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1' }] });

        const res = await request(app)
            .put('/api/v1/donations/don-uuid-1')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({});

        expect(res.status).toBe(400);
    });
});

// ── PATCH /api/v1/donations/:id/state ─────────────────────────────────────────

describe('PATCH /api/v1/donations/:id/state', () => {
    it('returns 404 when not found', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

        const res = await request(app)
            .patch('/api/v1/donations/nonexistent/state')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ state: 'approved' });
        expect(res.status).toBe(404);
    });

    it('returns 422 on invalid state transition', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', state: 'completed' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/state')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ state: 'in_delivery' });

        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('advances state from registered to approved', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', state: 'registered' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'don-uuid-1', state: 'approved', approved_at: '2026-02-03T14:30:00Z' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/state')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ state: 'approved' });

        expect(res.status).toBe(200);
        expect(res.body.state).toBe('approved');
        expect(res.body.approved_at).toBe('2026-02-03T14:30:00Z');
    });

    it('allows cancellation from approved state', async () => {
        pool.query
            .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', state: 'approved' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'don-uuid-1', state: 'cancelled', approved_at: null }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/state')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ state: 'cancelled' });

        expect(res.status).toBe(200);
        expect(res.body.state).toBe('cancelled');
    });

    it('rejects transition from terminal state completed', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', state: 'completed' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/state')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ state: 'approved' });

        expect(res.status).toBe(422);
    });

    it('rejects transition from terminal state cancelled', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'don-uuid-1', state: 'cancelled' }] });

        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/state')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({ state: 'approved' });

        expect(res.status).toBe(422);
    });

    it('returns 400 when state field is missing', async () => {
        const res = await request(app)
            .patch('/api/v1/donations/don-uuid-1/state')
            .set('Authorization', `Bearer ${staffToken}`)
            .send({});
        expect(res.status).toBe(400);
    });
});
