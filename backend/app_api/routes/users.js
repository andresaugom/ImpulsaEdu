'use strict';

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUser(row) {
    return {
        id: row.id,
        email: row.email,
        full_name: `${row.firstname} ${row.lastname}`.trim(),
        role: row.role,
        is_active: row.deleted_at === null
    };
}

/**
 * Splits "First Middle Last" into { firstname, lastname }.
 * Everything before the last space becomes firstname.
 */
function splitFullName(full_name) {
    const trimmed = full_name.trim();
    const idx = trimmed.lastIndexOf(' ');
    if (idx === -1) return { firstname: trimmed, lastname: '' };
    return {
        firstname: trimmed.slice(0, idx),
        lastname: trimmed.slice(idx + 1)
    };
}

// ── GET /api/v1/users  (admin only) ──────────────────────────────────────────

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    const { role, is_active } = req.query;

    const conditions = [];
    const params = [];
    let i = 1;

    if (role !== undefined) {
        conditions.push(`u.role = $${i++}`);
        params.push(role);
    }
    if (is_active !== undefined) {
        const active = is_active === 'true';
        conditions.push(active ? 'u.deleted_at IS NULL' : 'u.deleted_at IS NOT NULL');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const result = await pool.query(
            `SELECT id, firstname, lastname, email, role, deleted_at
             FROM users u ${where} ORDER BY u.email`,
            params
        );
        res.json({
            items: result.rows.map(formatUser),
            total: result.rowCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /api/v1/users  (admin only) ─────────────────────────────────────────

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name || !role) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'email, password, full_name, and role are required'));
    }
    if (!['staff', 'admin'].includes(role)) {
        return res.status(400).json(errBody('INVALID_ROLE', 'role must be "staff" or "admin"'));
    }

    const { firstname, lastname } = splitFullName(full_name);

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rowCount > 0) {
            return res.status(409).json(errBody('EMAIL_CONFLICT', 'Email already exists'));
        }

        const password_hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (firstname, lastname, email, password_hash, role, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, firstname, lastname, email, role, deleted_at`,
            [firstname, lastname, email, password_hash, role, req.user.sub]
        );
        res.status(201).json(formatUser(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/users/:id ──────────────────────────────────────────────────────
// Admin can read any user; staff can only read their own profile.

router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user.sub !== id) {
        return res.status(403).json(errBody('FORBIDDEN', 'You can only view your own profile'));
    }

    try {
        const result = await pool.query(
            `SELECT id, firstname, lastname, email, role, deleted_at
             FROM users
             WHERE id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'User not found'));
        }
        res.json(formatUser(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PUT /api/v1/users/:id ─────────────────────────────────────────────────────
// Admin can update any user; staff can only update their own profile.

router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { full_name, password } = req.body;

    if (req.user.role !== 'admin' && req.user.sub !== id) {
        return res.status(403).json(errBody('FORBIDDEN', 'You can only update your own profile'));
    }

    if (!full_name && !password) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'Provide at least full_name or password'));
    }

    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );
        if (existing.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'User not found'));
        }

        const sets = [];
        const params = [];
        let i = 1;

        if (full_name) {
            const { firstname, lastname } = splitFullName(full_name);
            sets.push(`firstname = $${i++}`, `lastname = $${i++}`);
            params.push(firstname, lastname);
        }
        if (password) {
            const password_hash = await bcrypt.hash(password, 10);
            sets.push(`password_hash = $${i++}`);
            params.push(password_hash);
        }
        sets.push(`updated_at = NOW()`, `updated_by = $${i++}`);
        params.push(req.user.sub);
        params.push(id);

        const result = await pool.query(
            `UPDATE users SET ${sets.join(', ')}
             WHERE id = $${i}
             RETURNING id, firstname, lastname, email, role, deleted_at`,
            params
        );
        res.json(formatUser(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── PATCH /api/v1/users/:id/deactivate  (admin only) ─────────────────────────

router.patch('/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE users
             SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
             WHERE id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [req.user.sub, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'User not found'));
        }
        res.json({ message: 'User deactivated' });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
