'use strict';

const router = require('express').Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDonor(row) {
    return {
        id:             row.id,
        name:           row.name,
        region:         row.region,
        donor_type:     row.donor_type,
        description:    row.description || null,
        email:          row.email  || null,
        phone:          row.phone  || null,
        is_active:      row.deleted_at === null || row.deleted_at === undefined,
        donation_count: parseInt(row.donation_count) || 0
    };
}

function formatDonorDetail(row, donations) {
    return {
        ...formatDonor(row),
        donations: donations.map(d => ({
            id:          d.id,
            school_name: d.school_name,
            donation_type: d.donation_type,
            amount:      d.amount ? parseFloat(d.amount) : null,
            status:      d.status,
            created_at:  d.created_at
        }))
    };
}

/** Upserts the contact record for a donor (first contact by id). */
async function upsertContact(client, donorId, email, phone) {
    const existing = await client.query(
        'SELECT id FROM contacts WHERE donor_id = $1 ORDER BY id LIMIT 1',
        [donorId]
    );
    if (existing.rowCount > 0) {
        await client.query(
            'UPDATE contacts SET email = $1, phone = $2 WHERE id = $3',
            [email || null, phone || null, existing.rows[0].id]
        );
    } else {
        await client.query(
            'INSERT INTO contacts (donor_id, email, phone) VALUES ($1, $2, $3)',
            [donorId, email || null, phone || null]
        );
    }
}

const DONOR_SELECT = `
    SELECT d.*,
           (SELECT COUNT(*) FROM donations dn WHERE dn.donor_id = d.id AND dn.deleted_at IS NULL) AS donation_count,
           (SELECT email FROM contacts WHERE donor_id = d.id ORDER BY id LIMIT 1) AS email,
           (SELECT phone FROM contacts WHERE donor_id = d.id ORDER BY id LIMIT 1) AS phone
    FROM   donors d
`;

// ── GET /api/v1/donors  (staff+) ─────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
    const { donor_type, name, is_active } = req.query;
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

    if (donor_type !== undefined) {
        conditions.push(`d.donor_type = $${i++}`);
        params.push(donor_type);
    }
    if (name !== undefined) {
        conditions.push(`d.name ILIKE $${i++}`);
        params.push(`%${name}%`);
    }
    if (is_active !== undefined) {
        conditions.push(is_active === 'true' ? 'd.deleted_at IS NULL' : 'd.deleted_at IS NOT NULL');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : 'WHERE d.deleted_at IS NULL';

    try {
        const [countRes, dataRes] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM donors d ${where}`, params),
            pool.query(
                `${DONOR_SELECT} ${where} ORDER BY d.name LIMIT $${i} OFFSET $${i + 1}`,
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
                `SELECT dn.id, s.name AS school_name, dn.donation_type,
                        dn.amount, dn.status, dn.created_at
                 FROM   donations dn
                 JOIN   schools s ON s.id = dn.school_id
                 WHERE  dn.donor_id = $1 AND dn.deleted_at IS NULL
                 ORDER  BY dn.created_at DESC`,
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
    const { name, region, donor_type, description, email, phone } = req.body;

    if (!name || !region || !donor_type) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'name, region, and donor_type are required'));
    }
    if (!['Fisica', 'Moral'].includes(donor_type)) {
        return res.status(400).json(errBody('INVALID_TYPE', 'donor_type must be "Fisica" or "Moral"'));
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO donors (name, region, donor_type, description, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, region, donor_type, description || null, req.user.sub]
        );
        const donor = result.rows[0];

        if (email || phone) {
            await client.query(
                'INSERT INTO contacts (donor_id, email, phone) VALUES ($1, $2, $3)',
                [donor.id, email || null, phone || null]
            );
        }

        await client.query('COMMIT');

        const fullRow = {
            ...donor,
            donation_count: 0,
            email: email || null,
            phone: phone || null
        };
        res.status(201).json(formatDonor(fullRow));
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'A donor with that name already exists in that region'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    } finally {
        client.release();
    }
});

// ── PUT /api/v1/donors/:id  (staff+) ─────────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, region, donor_type, description, email, phone } = req.body;

    if (donor_type !== undefined && !['Fisica', 'Moral'].includes(donor_type)) {
        return res.status(400).json(errBody('INVALID_TYPE', 'donor_type must be "Fisica" or "Moral"'));
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM donors WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (existing.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json(errBody('NOT_FOUND', 'Donor not found'));
        }

        const sets   = [];
        const params = [];
        let   i      = 1;

        if (name        !== undefined) { sets.push(`name = $${i++}`);        params.push(name); }
        if (region      !== undefined) { sets.push(`region = $${i++}`);      params.push(region); }
        if (donor_type  !== undefined) { sets.push(`donor_type = $${i++}`);  params.push(donor_type); }
        if (description !== undefined) { sets.push(`description = $${i++}`); params.push(description); }

        if (sets.length === 0 && email === undefined && phone === undefined) {
            await client.query('ROLLBACK');
            return res.status(400).json(errBody('MISSING_FIELDS', 'Provide at least one field to update'));
        }

        if (sets.length > 0) {
            sets.push(`updated_at = NOW()`, `updated_by = $${i++}`);
            params.push(req.user.sub);
            params.push(id);
            await client.query(
                `UPDATE donors SET ${sets.join(', ')} WHERE id = $${i}`,
                params
            );
        }

        if (email !== undefined || phone !== undefined) {
            await upsertContact(client, id, email, phone);
        }

        await client.query('COMMIT');

        const fullRes = await pool.query(`${DONOR_SELECT} WHERE d.id = $1`, [id]);
        res.json(formatDonor(fullRes.rows[0]));
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'A donor with that name already exists in that region'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    } finally {
        client.release();
    }
});

// ── PATCH /api/v1/donors/:id/deactivate  (staff+) ────────────────────────────

router.patch('/:id/deactivate', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE donors
             SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW(), updated_by = $1
             WHERE id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [req.user.sub, req.params.id]
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
