'use strict';

const router = require('express').Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDonor(row) {
    return {
        id:                row.id,
        full_name:         row.full_name,
        email:             row.email,
        tax_id:            row.tax_id    || null,
        phone:             row.phone     || null,
        type:              row.type,
        organization_name: row.organization_name || null,
        notes:             row.notes     || null,
        is_active:         row.is_active,
        donation_count:    parseInt(row.donation_count) || 0
    };
}

function formatDonorDetail(row, donations) {
    return {
        ...formatDonor(row),
        donations: donations.map(d => ({
            id:            d.id,
            school_name:   d.school_name,
            type:          d.type,
            amount:        d.amount    ? parseFloat(d.amount)    : null,
            state:         d.state,
            registered_at: d.registered_at
        }))
    };
}

const DONOR_SELECT = `
    SELECT d.*,
           (SELECT COUNT(*) FROM donations dn WHERE dn.donor_id = d.id) AS donation_count
    FROM   donors d
`;

// ── GET /api/v1/donors  (staff+) ─────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
    const { type, name, is_active } = req.query;
    const parsedPerPage = Number.parseInt(req.query.per_page, 10);
    const parsedPage    = Number.parseInt(req.query.page, 10);
    const perPage = Number.isNaN(parsedPerPage)
        ? 20
        : Math.min(Math.max(parsedPerPage, 1), 100);
    const page = Number.isNaN(parsedPage)
        ? 1
        : Math.max(parsedPage, 1);
    const offset  = (page - 1) * perPage;

    const conditions = [];
    const params     = [];
    let   i          = 1;

    if (type !== undefined) {
        conditions.push(`d.type = $${i++}`);
        params.push(type);
    }
    if (name !== undefined) {
        conditions.push(`d.full_name ILIKE $${i++}`);
        params.push(`%${name}%`);
    }
    if (is_active !== undefined) {
        conditions.push(`d.is_active = $${i++}`);
        params.push(is_active === 'true');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const [countRes, dataRes] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM donors d ${where}`, params),
            pool.query(
                `${DONOR_SELECT} ${where} ORDER BY d.full_name LIMIT $${i} OFFSET $${i + 1}`,
                [...params, perPage, offset]
            )
        ]);

        res.json({
            items:    dataRes.rows.map(formatDonor),
            total:    parseInt(countRes.rows[0].count),
            page,
            per_page: perPage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/donors/:id  (staff+) ─────────────────────────────────────────

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [donorRes, donationsRes] = await Promise.all([
            pool.query(`${DONOR_SELECT} WHERE d.id = $1`, [req.params.id]),
            pool.query(
                `SELECT dn.id, s.name AS school_name, dn.type,
                        dn.amount, dn.state, dn.registered_at
                 FROM   donations dn
                 JOIN   schools s ON s.id = dn.school_id
                 WHERE  dn.donor_id = $1
                 ORDER  BY dn.registered_at DESC`,
                [req.params.id]
            )
        ]);

        if (donorRes.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donor not found'));
        }
        res.json(formatDonorDetail(donorRes.rows[0], donationsRes.rows));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /api/v1/donors  (staff+) ────────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
    const { full_name, email, tax_id, phone, type, organization_name, notes } = req.body;

    if (!full_name || !email || !type) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'full_name, email, and type are required'));
    }
    if (!['individual', 'corporate'].includes(type)) {
        return res.status(400).json(errBody('INVALID_TYPE', 'type must be "individual" or "corporate"'));
    }

    try {
        const result = await pool.query(
            `INSERT INTO donors (full_name, email, tax_id, phone, type, organization_name, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *, 0 AS donation_count`,
            [full_name, email, tax_id || null, phone || null, type, organization_name || null, notes || null]
        );
        res.status(201).json(formatDonor(result.rows[0]));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'Email or tax_id already exists'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PUT /api/v1/donors/:id  (staff+) ─────────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { full_name, email, tax_id, phone, type, organization_name, notes } = req.body;

    try {
        const existing = await pool.query('SELECT id FROM donors WHERE id = $1', [id]);
        if (existing.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donor not found'));
        }

        const sets   = [];
        const params = [];
        let   i      = 1;

        const fields = { full_name, email, tax_id, phone, type, organization_name, notes };
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                sets.push(`${key} = $${i++}`);
                params.push(val ?? null);
            }
        }

        if (sets.length === 0) {
            return res.status(400).json(errBody('MISSING_FIELDS', 'Provide at least one field to update'));
        }

        sets.push(`updated_at = NOW()`);
        params.push(id);

        const result = await pool.query(
            `UPDATE donors SET ${sets.join(', ')}
             WHERE  id = $${i}
             RETURNING *`,
            params
        );

        // Fetch donation count
        const countRes = await pool.query(
            'SELECT COUNT(*) FROM donations WHERE donor_id = $1',
            [id]
        );
        res.json(formatDonor({ ...result.rows[0], donation_count: countRes.rows[0].count }));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'Email or tax_id already exists'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PATCH /api/v1/donors/:id/deactivate  (staff+) ────────────────────────────

router.patch('/:id/deactivate', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE donors SET is_active = FALSE, updated_at = NOW()
             WHERE  id = $1
             RETURNING id`,
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donor not found'));
        }
        res.json({ message: 'Donor deactivated' });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
