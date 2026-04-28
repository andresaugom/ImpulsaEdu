'use strict';

const router = require('express').Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── State machine ─────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS = {
    'Registrado': ['Aprobado', 'Cancelado'],
    'Aprobado':   ['Entregando', 'Cancelado'],
    'Entregando': ['Entregado', 'Cancelado'],
    'Entregado':  ['Finalizado'],
    'Finalizado': [],
    'Cancelado':  []
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDonationSummary(row) {
    return {
        id:            row.id,
        donor:         { id: row.donor_id, name: row.donor_name },
        school:        { id: row.school_id, name: row.school_name },
        donation_type: row.donation_type,
        amount:        row.amount ? parseFloat(row.amount) : null,
        status:        row.status,
        description:   row.description || null,
        created_at:    row.created_at
    };
}

function formatDonationDetail(row, items) {
    return {
        id:            row.id,
        donor:         { id: row.donor_id, name: row.donor_name, donor_type: row.donor_type },
        school:        { id: row.school_id, name: row.school_name, region: row.school_region },
        donation_type: row.donation_type,
        amount:        row.amount ? parseFloat(row.amount) : null,
        status:        row.status,
        description:   row.description || null,
        items:         items.map(i => ({
            id:        i.id,
            item_name: i.item_name,
            quantity:  i.quantity,
            amount:    parseFloat(i.amount)
        }))
    };
}

const SUMMARY_SELECT = `
    SELECT dn.id, dn.donor_id, d.name AS donor_name,
           dn.school_id, s.name AS school_name,
           dn.donation_type, dn.amount, dn.status,
           dn.description, dn.created_at
    FROM   donations dn
    JOIN   donors  d ON d.id = dn.donor_id
    JOIN   schools s ON s.id = dn.school_id
    WHERE  dn.deleted_at IS NULL
`;

const DETAIL_SELECT = `
    SELECT dn.*,
           d.name AS donor_name, d.donor_type AS donor_type,
           s.name AS school_name, s.region AS school_region
    FROM   donations dn
    JOIN   donors  d ON d.id = dn.donor_id
    JOIN   schools s ON s.id = dn.school_id
    WHERE  dn.deleted_at IS NULL
`;

// ── GET /api/v1/donations  (staff+) ──────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
    const { school_id, donor_id, status, donation_type } = req.query;
    const parsedPerPage = Number.parseInt(req.query.per_page, 10);
    const parsedPage    = Number.parseInt(req.query.page, 10);
    const perPage = Number.isNaN(parsedPerPage)
        ? 20
        : Math.min(Math.max(parsedPerPage, 1), 100);
    const page = Number.isNaN(parsedPage)
        ? 1
        : Math.max(parsedPage, 1);
    const offset = (page - 1) * perPage;

    const conditions = [];
    const params     = [];
    let   i          = 1;

    if (school_id)     { conditions.push(`dn.school_id    = $${i++}`); params.push(school_id); }
    if (donor_id)      { conditions.push(`dn.donor_id     = $${i++}`); params.push(donor_id); }
    if (status)        { conditions.push(`dn.status       = $${i++}`); params.push(status); }
    if (donation_type) { conditions.push(`dn.donation_type = $${i++}`); params.push(donation_type); }

    const extraWhere = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

    try {
        const [countRes, dataRes] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) FROM donations dn WHERE dn.deleted_at IS NULL ${extraWhere}`,
                params
            ),
            pool.query(
                `${SUMMARY_SELECT} ${extraWhere} ORDER BY dn.created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
                [...params, perPage, offset]
            )
        ]);

        res.json({
            items:    dataRes.rows.map(formatDonationSummary),
            total:    parseInt(countRes.rows[0].count),
            page,
            per_page: perPage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/donations/:id  (staff+) ──────────────────────────────────────

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [donationRes, itemsRes] = await Promise.all([
            pool.query(`${DETAIL_SELECT} AND dn.id = $1`, [req.params.id]),
            pool.query(
                `SELECT id, item_name, quantity, amount
                 FROM   donation_items
                 WHERE  donation_id = $1 AND deleted_at IS NULL
                 ORDER  BY id`,
                [req.params.id]
            )
        ]);
        if (donationRes.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donation not found'));
        }
        res.json(formatDonationDetail(donationRes.rows[0], itemsRes.rows));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /api/v1/donations  (staff+) ─────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
    const { donor_id, school_id, donation_type, description, amount, items } = req.body;

    if (!donor_id || !school_id || !donation_type) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'donor_id, school_id, and donation_type are required'));
    }
    if (!['Material', 'Monetaria'].includes(donation_type)) {
        return res.status(400).json(errBody('INVALID_TYPE', 'donation_type must be "Material" or "Monetaria"'));
    }
    if (donation_type === 'Monetaria' && (amount === undefined || amount === null)) {
        return res.status(400).json(errBody('MISSING_AMOUNT', 'amount is required for Monetaria donations'));
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const donorRes = await client.query(
            'SELECT id FROM donors WHERE id = $1 AND deleted_at IS NULL',
            [donor_id]
        );
        if (donorRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json(errBody('NOT_FOUND', 'Donor not found'));
        }

        const schoolRes = await client.query(
            'SELECT id FROM schools WHERE id = $1 AND deleted_at IS NULL',
            [school_id]
        );
        if (schoolRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json(errBody('NOT_FOUND', 'School not found'));
        }

        const result = await client.query(
            `INSERT INTO donations (donor_id, school_id, donation_type, description, amount, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [donor_id, school_id, donation_type, description || null, amount ?? 0, req.user.sub]
        );
        const donationId = result.rows[0].id;

        if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                if (!item.item_name || item.amount === undefined) continue;
                await client.query(
                    `INSERT INTO donation_items (donation_id, item_name, quantity, amount, created_by)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [donationId, item.item_name, item.quantity ?? null, item.amount, req.user.sub]
                );
            }
        }

        await client.query('COMMIT');

        const [donationRes2, itemsRes] = await Promise.all([
            pool.query(`${DETAIL_SELECT} AND dn.id = $1`, [donationId]),
            pool.query(
                'SELECT id, item_name, quantity, amount FROM donation_items WHERE donation_id = $1 AND deleted_at IS NULL ORDER BY id',
                [donationId]
            )
        ]);
        res.status(201).json(formatDonationDetail(donationRes2.rows[0], itemsRes.rows));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    } finally {
        client.release();
    }
});

// ── PUT /api/v1/donations/:id  (staff+) ──────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { description, items } = req.body;

    if (description === undefined && items === undefined) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'Provide description or items to update'));
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM donations WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (existing.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json(errBody('NOT_FOUND', 'Donation not found'));
        }

        if (description !== undefined) {
            await client.query(
                `UPDATE donations SET description = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`,
                [description, req.user.sub, id]
            );
        }

        if (Array.isArray(items)) {
            // Replace all items
            await client.query(
                'UPDATE donation_items SET deleted_at = NOW(), deleted_by = $1 WHERE donation_id = $2 AND deleted_at IS NULL',
                [req.user.sub, id]
            );
            for (const item of items) {
                if (!item.item_name || item.amount === undefined) continue;
                await client.query(
                    `INSERT INTO donation_items (donation_id, item_name, quantity, amount, created_by)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [id, item.item_name, item.quantity ?? null, item.amount, req.user.sub]
                );
            }
        }

        await client.query('COMMIT');

        const [donationRes, itemsRes] = await Promise.all([
            pool.query(`${DETAIL_SELECT} AND dn.id = $1`, [id]),
            pool.query(
                'SELECT id, item_name, quantity, amount FROM donation_items WHERE donation_id = $1 AND deleted_at IS NULL ORDER BY id',
                [id]
            )
        ]);
        res.json(formatDonationDetail(donationRes.rows[0], itemsRes.rows));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    } finally {
        client.release();
    }
});

// ── PATCH /api/v1/donations/:id/status  (staff+) ─────────────────────────────

router.patch('/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!newStatus) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'status is required'));
    }

    try {
        const result = await pool.query(
            'SELECT id, status FROM donations WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donation not found'));
        }

        const currentStatus = result.rows[0].status;
        const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

        if (!allowed.includes(newStatus)) {
            return res.status(422).json(errBody(
                'INVALID_STATUS_TRANSITION',
                `Cannot transition from '${currentStatus}' to '${newStatus}'`
            ));
        }

        const updated = await pool.query(
            `UPDATE donations
             SET status = $1, updated_at = NOW(), updated_by = $2
             WHERE id = $3
             RETURNING id, status`,
            [newStatus, req.user.sub, id]
        );

        res.json({ id: updated.rows[0].id, status: updated.rows[0].status });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
