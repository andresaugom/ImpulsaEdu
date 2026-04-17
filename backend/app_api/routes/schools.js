'use strict';

const router = require('express').Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Subquery that computes confirmed_value for a school:
 * sum of amount + estimated_value for donations in active states.
 */
const CONFIRMED_VALUE_SQL = `
    COALESCE((
        SELECT SUM(COALESCE(d.amount, 0) + COALESCE(d.estimated_value, 0))
        FROM   donations d
        WHERE  d.school_id = s.id
          AND  d.state IN ('approved', 'in_delivery', 'delivered', 'completed')
    ), 0)
`;

function formatSchool(row) {
    const goal      = parseFloat(row.funding_goal) || 0;
    const confirmed = parseFloat(row.confirmed_value) || 0;
    return {
        id:              row.id,
        name:            row.name,
        region:          row.region,
        category:        row.category,
        description:     row.description || null,
        funding_goal:    goal,
        confirmed_value: confirmed,
        progress_pct:    goal > 0 ? Math.round(confirmed / goal * 10000) / 100 : 0,
        status:          row.status
    };
}

// ── GET /api/v1/schools  (public) ─────────────────────────────────────────────

router.get('/', async (req, res) => {
    const { region, category, status = 'active' } = req.query;
    const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
    const page    = Math.max(parseInt(req.query.page)     || 1, 1);
    const offset  = (page - 1) * perPage;

    const conditions = ['s.status = $1'];
    const params     = [status];
    let   i          = 2;

    if (region)   { conditions.push(`s.region = $${i++}`);   params.push(region); }
    if (category) { conditions.push(`s.category = $${i++}`); params.push(category); }

    const where = conditions.join(' AND ');

    try {
        const [countRes, dataRes] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM schools s WHERE ${where}`, params),
            pool.query(
                `SELECT s.id, s.name, s.region, s.category, s.description,
                        s.funding_goal, s.status, ${CONFIRMED_VALUE_SQL} AS confirmed_value
                 FROM   schools s
                 WHERE  ${where}
                 ORDER  BY s.name
                 LIMIT  $${i} OFFSET $${i + 1}`,
                [...params, perPage, offset]
            )
        ]);

        res.json({
            items:    dataRes.rows.map(formatSchool),
            total:    parseInt(countRes.rows[0].count),
            page,
            per_page: perPage
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/schools/:id  (public) ────────────────────────────────────────

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT s.id, s.name, s.region, s.category, s.description,
                    s.funding_goal, s.status, ${CONFIRMED_VALUE_SQL} AS confirmed_value
             FROM   schools s
             WHERE  s.id = $1`,
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'School not found'));
        }
        res.json(formatSchool(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /api/v1/schools  (staff+) ───────────────────────────────────────────

router.post('/', authenticateToken, async (req, res) => {
    const { name, region, category, description, funding_goal } = req.body;

    if (!name || !region || !category || !funding_goal) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'name, region, category, and funding_goal are required'));
    }

    try {
        const result = await pool.query(
            `INSERT INTO schools (name, region, category, description, funding_goal)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, region, category, description, funding_goal, status`,
            [name, region, category, description || null, funding_goal]
        );
        const row = result.rows[0];
        res.status(201).json(formatSchool({ ...row, confirmed_value: 0 }));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'A school with that name already exists in that region'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PUT /api/v1/schools/:id  (staff+) ────────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, region, category, description, funding_goal } = req.body;

    if (!name && !region && !category && description === undefined && !funding_goal) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'Provide at least one field to update'));
    }

    try {
        const existing = await pool.query('SELECT id FROM schools WHERE id = $1', [id]);
        if (existing.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'School not found'));
        }

        const sets   = [];
        const params = [];
        let   i      = 1;

        if (name)              { sets.push(`name = $${i++}`);         params.push(name); }
        if (region)            { sets.push(`region = $${i++}`);       params.push(region); }
        if (category)          { sets.push(`category = $${i++}`);     params.push(category); }
        if (description !== undefined) { sets.push(`description = $${i++}`); params.push(description); }
        if (funding_goal)      { sets.push(`funding_goal = $${i++}`); params.push(funding_goal); }
        sets.push(`updated_at = NOW()`);
        params.push(id);

        const result = await pool.query(
            `UPDATE schools SET ${sets.join(', ')}
             WHERE  id = $${i}
             RETURNING id, name, region, category, description, funding_goal, status`,
            params
        );

        const row = result.rows[0];
        // Re-fetch confirmed_value for the updated school
        const cvRes = await pool.query(
            `SELECT COALESCE((
                SELECT SUM(COALESCE(d.amount, 0) + COALESCE(d.estimated_value, 0))
                FROM   donations d
                WHERE  d.school_id = $1
                  AND  d.state IN ('approved', 'in_delivery', 'delivered', 'completed')
             ), 0) AS confirmed_value`,
            [id]
        );
        res.json(formatSchool({ ...row, confirmed_value: cvRes.rows[0]?.confirmed_value || 0 }));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'A school with that name already exists in that region'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PATCH /api/v1/schools/:id/archive  (staff+) ──────────────────────────────

router.patch('/:id/archive', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE schools SET status = 'archived', updated_at = NOW()
             WHERE  id = $1
             RETURNING id`,
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'School not found'));
        }
        res.json({ message: 'School archived' });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
