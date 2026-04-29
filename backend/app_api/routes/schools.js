'use strict';

const router = require('express').Router();
const pool = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSchool(row) {
    const goal     = parseFloat(row.goal) || 0;
    const progress = parseFloat(row.progress) || 0;
    return {
        id:           row.id,
        region:       row.region,
        school:       row.school,
        name:         row.name,
        employees:    row.employees,
        students:     row.students,
        level:        row.level,
        cct:          row.cct,
        mode:         row.mode,
        shift:        row.shift,
        address:      row.address,
        location:     row.location,
        category:     row.category,
        description:  row.description || null,
        goal:         goal,
        progress:     progress,
        progress_pct: goal > 0 ? Math.round(progress / goal * 10000) / 100 : 0,
        status:       row.deleted_at ? 'archived' : 'active'
    };
}

const REQUIRED_FIELDS = ['region', 'school', 'name', 'level', 'cct', 'mode', 'shift', 'address', 'location', 'category', 'goal'];

// ── GET /api/v1/schools  (public) ─────────────────────────────────────────────

router.get('/', async (req, res) => {
    const { region, category, status } = req.query;
    const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
    const page    = Math.max(parseInt(req.query.page)     || 1, 1);
    const offset  = (page - 1) * perPage;

    const conditions = [];
    const params     = [];
    let   i          = 1;

    // Default to active unless explicitly requesting archived
    if (status === 'archived') {
        conditions.push('s.deleted_at IS NOT NULL');
    } else {
        conditions.push('s.deleted_at IS NULL');
    }

    if (region)   { conditions.push(`s.region   = $${i++}`); params.push(region); }
    if (category) { conditions.push(`s.category = $${i++}`); params.push(category); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    try {
        const [countRes, dataRes] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM schools s ${where}`, params),
            pool.query(
                `SELECT * FROM schools s ${where} ORDER BY s.name LIMIT $${i} OFFSET $${i + 1}`,
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
            'SELECT * FROM schools WHERE id = $1',
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
    const {
        region, school, name, employees, students,
        level, cct, mode, shift, address, location,
        category, description, goal
    } = req.body;

    const missing = REQUIRED_FIELDS.filter(f => req.body[f] === undefined || req.body[f] === null || req.body[f] === '');
    if (missing.length > 0) {
        return res.status(400).json(errBody('MISSING_FIELDS', `Required fields: ${missing.join(', ')}`));
    }

    try {
        const result = await pool.query(
            `INSERT INTO schools
                (region, school, name, employees, students, level, cct, mode, shift,
                 address, location, category, description, goal, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING *`,
            [
                region, school, name,
                employees ?? 0, students ?? 0,
                level, cct, mode, shift,
                address, location, category,
                description || null, goal,
                req.user.sub
            ]
        );
        res.status(201).json(formatSchool(result.rows[0]));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'A school with that region/school/name combination already exists'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PUT /api/v1/schools/:id  (staff+) ────────────────────────────────────────

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
        region, school, name, employees, students,
        level, cct, mode, shift, address, location,
        category, description, goal
    } = req.body;

    try {
        const existing = await pool.query(
            'SELECT id FROM schools WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (existing.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'School not found'));
        }

        const sets   = [];
        const params = [];
        let   i      = 1;

        const fields = { region, school, name, employees, students, level, cct, mode, shift, address, location, category, description, goal };
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                sets.push(`${key} = $${i++}`);
                params.push(val);
            }
        }

        if (sets.length === 0) {
            return res.status(400).json(errBody('MISSING_FIELDS', 'Provide at least one field to update'));
        }

        sets.push(`updated_at = NOW()`, `updated_by = $${i++}`);
        params.push(req.user.sub);
        params.push(id);

        const result = await pool.query(
            `UPDATE schools SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
            params
        );
        res.json(formatSchool(result.rows[0]));
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json(errBody('CONFLICT', 'A school with that region/school/name combination already exists'));
        }
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PATCH /api/v1/schools/:id/archive  (staff+) ──────────────────────────────

router.patch('/:id/archive', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `UPDATE schools
             SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW(), updated_by = $1
             WHERE id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [req.user.sub, req.params.id]
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

// ── GET /api/v1/schools/by_region  (public) ─────────────────────────────────

router.get('/by_region', async (req, res) => {
    const { region } = req.query;

    if (!region) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'Region is required'));
    }

    try {
        // Remove any reference to 'status' in schools query
        const query = `
          SELECT id, region, school, name, level, cct, mode, shift, address, location, category, goal
          FROM schools
          WHERE region = $1
        `;
        const result = await pool.query(query, [region]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
