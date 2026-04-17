'use strict';

const router = require('express').Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── State machine ─────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS = {
    registered:  ['approved', 'cancelled'],
    approved:    ['in_delivery', 'cancelled'],
    in_delivery: ['delivered', 'cancelled'],
    delivered:   ['completed'],
    completed:   [],
    cancelled:   []
};

/** Column name for the timestamp when entering a given state. */
const STATE_TIMESTAMP = {
    approved:    'approved_at',
    in_delivery: 'in_delivery_at',
    delivered:   'delivered_at',
    completed:   'completed_at',
    cancelled:   'cancelled_at'
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDonationSummary(row) {
    return {
        id:            row.id,
        donor:         { id: row.donor_id,  full_name: row.donor_name },
        school:        { id: row.school_id, name:      row.school_name },
        type:          row.type,
        amount:        row.amount          ? parseFloat(row.amount)          : null,
        estimated_value: row.estimated_value ? parseFloat(row.estimated_value) : null,
        state:         row.state,
        delivery_mode: row.delivery_mode || null,
        registered_at: row.registered_at
    };
}

function formatDonationDetail(row) {
    return {
        id:     row.id,
        donor:  { id: row.donor_id,  full_name: row.donor_name,   type: row.donor_type },
        school: { id: row.school_id, name:      row.school_name,  region: row.school_region },
        type:             row.type,
        description:      row.description      || null,
        amount:           row.amount           ? parseFloat(row.amount)          : null,
        estimated_value:  row.estimated_value  ? parseFloat(row.estimated_value) : null,
        state:            row.state,
        observations:     row.observations     || null,
        delivery: {
            mode:             row.delivery_mode    || null,
            shipping_address: row.shipping_address || null,
            tracking_info:    row.tracking_info    || null,
            notes:            row.delivery_notes   || null
        },
        timeline: {
            registered_at:  row.registered_at  || null,
            approved_at:    row.approved_at    || null,
            in_delivery_at: row.in_delivery_at || null,
            delivered_at:   row.delivered_at   || null,
            completed_at:   row.completed_at   || null,
            cancelled_at:   row.cancelled_at   || null
        }
    };
}

const SUMMARY_SELECT = `
    SELECT dn.id, dn.donor_id, d.full_name AS donor_name,
           dn.school_id, s.name AS school_name,
           dn.type, dn.amount, dn.estimated_value, dn.state,
           dn.delivery_mode, dn.registered_at
    FROM   donations dn
    JOIN   donors  d ON d.id = dn.donor_id
    JOIN   schools s ON s.id = dn.school_id
`;

const DETAIL_SELECT = `
    SELECT dn.*,
           d.full_name AS donor_name, d.type AS donor_type,
           s.name AS school_name, s.region AS school_region
    FROM   donations dn
    JOIN   donors  d ON d.id = dn.donor_id
    JOIN   schools s ON s.id = dn.school_id
`;

// ── GET /api/v1/donations  (staff+) ──────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
    const { school_id, donor_id, state, type } = req.query;
    const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
    const page    = Math.max(parseInt(req.query.page)     || 1, 1);
    const offset  = (page - 1) * perPage;

    const conditions = [];
    const params     = [];
    let   i          = 1;

    if (school_id) { conditions.push(`dn.school_id = $${i++}`); params.push(school_id); }
    if (donor_id)  { conditions.push(`dn.donor_id  = $${i++}`); params.push(donor_id); }
    if (state)     { conditions.push(`dn.state     = $${i++}`); params.push(state); }
    if (type)      { conditions.push(`dn.type      = $${i++}`); params.push(type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const [countRes, dataRes] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) FROM donations dn ${where}`,
                params
            ),
            pool.query(
                `${SUMMARY_SELECT} ${where} ORDER BY dn.registered_at DESC LIMIT $${i} OFFSET $${i + 1}`,
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
        const result = await pool.query(
            `${DETAIL_SELECT} WHERE dn.id = $1`,
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donation not found'));
        }
        res.json(formatDonationDetail(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /api/v1/donations  (staff+) ─────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
    const { donor_id, school_id, type, description, amount, estimated_value, observations, delivery } = req.body;

    if (!donor_id || !school_id || !type || !delivery) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'donor_id, school_id, type, and delivery are required'));
    }
    if (type === 'monetary' && (amount === undefined || amount === null)) {
        return res.status(400).json(errBody('MISSING_AMOUNT', 'amount is required for monetary donations'));
    }
    if (type === 'material' && (estimated_value === undefined || estimated_value === null)) {
        return res.status(400).json(errBody('MISSING_ESTIMATED_VALUE', 'estimated_value is required for material donations'));
    }

    try {
        // Verify donor exists
        const donorRes = await pool.query('SELECT id FROM donors WHERE id = $1', [donor_id]);
        if (donorRes.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donor not found'));
        }

        // Verify school exists and is active
        const schoolRes = await pool.query('SELECT id, status FROM schools WHERE id = $1', [school_id]);
        if (schoolRes.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'School not found'));
        }
        if (schoolRes.rows[0].status === 'archived') {
            return res.status(422).json(errBody('SCHOOL_ARCHIVED', 'Cannot create donation for an archived school'));
        }

        const result = await pool.query(
            `INSERT INTO donations
                (donor_id, school_id, type, description, amount, estimated_value,
                 observations, delivery_mode, shipping_address, tracking_info, delivery_notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             RETURNING id`,
            [
                donor_id, school_id, type,
                description      || null,
                amount           ?? null,
                estimated_value  ?? null,
                observations     || null,
                delivery?.mode             || null,
                delivery?.shipping_address || null,
                delivery?.tracking_info    || null,
                delivery?.notes            || null
            ]
        );

        const detailRes = await pool.query(
            `${DETAIL_SELECT} WHERE dn.id = $1`,
            [result.rows[0].id]
        );
        res.status(201).json(formatDonationDetail(detailRes.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PUT /api/v1/donations/:id  (staff+) ──────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { description, observations, delivery } = req.body;

    try {
        const existing = await pool.query('SELECT id FROM donations WHERE id = $1', [id]);
        if (existing.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donation not found'));
        }

        const sets   = [];
        const params = [];
        let   i      = 1;

        if (description  !== undefined) { sets.push(`description      = $${i++}`); params.push(description); }
        if (observations !== undefined) { sets.push(`observations     = $${i++}`); params.push(observations); }
        if (delivery) {
            if (delivery.mode             !== undefined) { sets.push(`delivery_mode    = $${i++}`); params.push(delivery.mode); }
            if (delivery.shipping_address !== undefined) { sets.push(`shipping_address = $${i++}`); params.push(delivery.shipping_address); }
            if (delivery.tracking_info    !== undefined) { sets.push(`tracking_info    = $${i++}`); params.push(delivery.tracking_info); }
            if (delivery.notes            !== undefined) { sets.push(`delivery_notes   = $${i++}`); params.push(delivery.notes); }
        }

        if (sets.length === 0) {
            return res.status(400).json(errBody('MISSING_FIELDS', 'Provide at least one field to update'));
        }

        sets.push(`updated_at = NOW()`);
        params.push(id);

        await pool.query(
            `UPDATE donations SET ${sets.join(', ')} WHERE id = $${i}`,
            params
        );

        const detailRes = await pool.query(`${DETAIL_SELECT} WHERE dn.id = $1`, [id]);
        res.json(formatDonationDetail(detailRes.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PATCH /api/v1/donations/:id/state  (staff+) ──────────────────────────────

router.patch('/:id/state', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { state: newState, observations } = req.body;

    if (!newState) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'state is required'));
    }

    try {
        const result = await pool.query(
            'SELECT id, state FROM donations WHERE id = $1',
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'Donation not found'));
        }

        const currentState = result.rows[0].state;
        const allowed = ALLOWED_TRANSITIONS[currentState] || [];

        if (!allowed.includes(newState)) {
            return res.status(422).json(errBody(
                'INVALID_STATE_TRANSITION',
                `Cannot transition from '${currentState}' to '${newState}'`
            ));
        }

        const tsCol  = STATE_TIMESTAMP[newState];
        const sets   = [`state = $1`, `updated_at = NOW()`];
        const params = [newState];
        let   i      = 2;

        if (tsCol) {
            sets.push(`${tsCol} = NOW()`);
        }
        if (observations !== undefined) {
            sets.push(`observations = $${i++}`);
            params.push(observations);
        }
        params.push(id);

        const updated = await pool.query(
            `UPDATE donations SET ${sets.join(', ')}
             WHERE  id = $${i}
             RETURNING id, state, approved_at`,
            params
        );

        res.json({
            id:          updated.rows[0].id,
            state:       updated.rows[0].state,
            approved_at: updated.rows[0].approved_at || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
