'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../db/pool', () => ({ query: jest.fn() }));

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../server');
const pool    = require('../db/pool');

const adminToken = jwt.sign({ sub: 'admin-1', email: 'admin@test.com', role: 'admin' }, 'test-secret');
const staffToken = jwt.sign({ sub: 'staff-1', email: 'staff@test.com', role: 'staff' }, 'test-secret');

beforeEach(() => pool.query.mockReset());

// ── GET /api/v1/reports/donations-by-school ────────────────────────────────────

describe('GET /api/v1/reports/donations-by-school', () => {
    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/v1/reports/donations-by-school');
        expect(res.status).toBe(401);
    });

    it('returns 403 for staff role', async () => {
        const res = await request(app)
            .get('/api/v1/reports/donations-by-school')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(403);
    });

    it('returns aggregated report for admin', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                school_id:        'school-1',
                school_name:      'Escuela Juárez',
                total_monetary:   '30000',
                total_donations:  '5',
                pending:          '2',
                completed:        '3'
            }]
        });

        const res = await request(app)
            .get('/api/v1/reports/donations-by-school')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({
            school_id:        'school-1',
            school_name:      'Escuela Juárez',
            total_monetary:   30000,
            total_donations:  5,
            pending:          2,
            completed:        3
        });
    });

    it('accepts optional school_id filter', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/reports/donations-by-school?school_id=school-1')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(pool.query.mock.calls[0][1]).toContain('school-1');
    });
});

// ── GET /api/v1/reports/donations-by-donor ─────────────────────────────────────

describe('GET /api/v1/reports/donations-by-donor', () => {
    it('returns 403 for staff', async () => {
        const res = await request(app)
            .get('/api/v1/reports/donations-by-donor')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(403);
    });

    it('returns aggregated report for admin', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                donor_id:          'donor-1',
                donor_name:        'Empresa XYZ',
                total_donations:   '3',
                total_value:       '70000',
                schools_supported: '2'
            }]
        });

        const res = await request(app)
            .get('/api/v1/reports/donations-by-donor')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body[0]).toMatchObject({
            donor_name:        'Empresa XYZ',
            total_donations:   3,
            total_value:       70000,
            schools_supported: 2
        });
    });

    it('accepts optional donor_id filter', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/reports/donations-by-donor?donor_id=donor-1')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(pool.query.mock.calls[0][1]).toContain('donor-1');
    });
});

// ── GET /api/v1/reports/pending-deliveries ─────────────────────────────────────

describe('GET /api/v1/reports/pending-deliveries', () => {
    it('returns 403 for staff', async () => {
        const res = await request(app)
            .get('/api/v1/reports/pending-deliveries')
            .set('Authorization', `Bearer ${staffToken}`);
        expect(res.status).toBe(403);
    });

    it('returns donations in Aprobado and Entregando states', async () => {
        const row = {
            id:            'don-1',
            donor_id:      'donor-1',
            donor_name:    'Juan',
            school_id:     'school-1',
            school_name:   'Escuela',
            donation_type: 'Monetaria',
            amount:        '5000',
            status:        'Aprobado',
            description:   null,
            created_at:    '2026-01-01T00:00:00Z'
        };
        pool.query.mockResolvedValueOnce({ rows: [row] });

        const res = await request(app)
            .get('/api/v1/reports/pending-deliveries')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].status).toBe('Aprobado');
    });

    it("queries only 'Aprobado' and 'Entregando' statuses", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/reports/pending-deliveries')
            .set('Authorization', `Bearer ${adminToken}`);

        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain("'Aprobado', 'Entregando'");
    });
});

// ── GET /api/v1/reports/completed ─────────────────────────────────────────────

describe('GET /api/v1/reports/completed', () => {
    it('returns completed donations', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id:            'don-2',
                donor_id:      'donor-1',
                donor_name:    'Juan',
                school_id:     'school-1',
                school_name:   'Escuela',
                donation_type: 'Monetaria',
                amount:        '10000',
                status:        'Finalizado',
                description:   null,
                created_at:    '2026-01-01T00:00:00Z'
            }]
        });

        const res = await request(app)
            .get('/api/v1/reports/completed')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body[0].status).toBe('Finalizado');
    });

    it("queries only 'Finalizado' status", async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await request(app)
            .get('/api/v1/reports/completed')
            .set('Authorization', `Bearer ${adminToken}`);

        const sql = pool.query.mock.calls[0][0];
        expect(sql).toContain("'Finalizado'");
    });
});

// ── GET /api/v1/reports/export ────────────────────────────────────────────────

describe('GET /api/v1/reports/export', () => {
    it('returns 400 for missing report param', async () => {
        const res = await request(app)
            .get('/api/v1/reports/export')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('INVALID_REPORT');
    });

    it('returns 400 for invalid report type', async () => {
        const res = await request(app)
            .get('/api/v1/reports/export?report=invalid-type')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(400);
    });

    it('exports donations-by-school as CSV', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                school_id:        'school-1',
                school_name:      'Escuela',
                total_monetary:   '30000',
                total_donations:  '3',
                pending:          '1',
                completed:        '2'
            }]
        });

        const res = await request(app)
            .get('/api/v1/reports/export?report=donations-by-school')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.headers['content-disposition']).toMatch(/attachment/);
        expect(res.text).toContain('school_id');
        expect(res.text).toContain('Escuela');
    });

    it('exports donations-by-donor as CSV', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                donor_id: 'donor-1', donor_name: 'Juan',
                total_donations: '3', total_value: '70000',
                schools_supported: '2'
            }]
        });

        const res = await request(app)
            .get('/api/v1/reports/export?report=donations-by-donor')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.text).toContain('donor_id');
        expect(res.text).toContain('Juan');
    });

    it('exports pending-deliveries as CSV', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .get('/api/v1/reports/export?report=pending-deliveries')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.text).toContain('donor_name');
    });

    it('exports completed as CSV', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .get('/api/v1/reports/export?report=completed')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.text).toContain('school_name');
    });

    it('CSV values with commas are quoted', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                school_id:        'school-1',
                school_name:      'Escuela, Del Valle',
                total_monetary:   '0',
                total_donations:  '0',
                pending:          '0',
                completed:        '0'
            }]
        });

        const res = await request(app)
            .get('/api/v1/reports/export?report=donations-by-school')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.text).toContain('"Escuela, Del Valle"');
    });
});
