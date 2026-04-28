'use strict';

const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { rateLimit } = require('express-rate-limit');
const pool     = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Strict limits for sensitive write operations (login / register)
const authWriteRateLimit = rateLimit({
    windowMs: 15 * 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: errBody('TOO_MANY_REQUESTS', 'Too many requests')
});

// Moderate limit for token refresh
const authRefreshRateLimit = rateLimit({
    windowMs: 15 * 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: errBody('TOO_MANY_REQUESTS', 'Too many requests')
});

// Lighter limit for read/logout operations
const authReadRateLimit = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: errBody('TOO_MANY_REQUESTS', 'Too many requests')
});

// ── POST /auth/register ───────────────────────────────────────────────────────

router.post('/register', authWriteRateLimit, async (req, res) => {
    const { email, password, firstname, lastname } = req.body;

    if (!email || !password || !firstname || !lastname) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'email, password, firstname, and lastname are required'));
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
        if (existing.rowCount > 0) {
            return res.status(409).json(errBody('EMAIL_CONFLICT', 'Email is already registered'));
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const adminDomain  = process.env.ADMIN_EMAIL_DOMAIN || '@impulsaedu.org';
        const role         = normalizedEmail.endsWith(adminDomain) ? 'admin' : 'staff';

        const result = await pool.query(
            `INSERT INTO users (firstname, lastname, email, password_hash, role)
             VALUES ($1, $2, $3, $4, $5) RETURNING id, role`,
            [firstname.trim(), lastname.trim(), normalizedEmail, passwordHash, role]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

router.post('/login', authWriteRateLimit, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'email and password are required'));
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
            [normalizedEmail]
        );
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json(errBody('INVALID_CREDENTIALS', 'Invalid email or password'));
        }

        const accessToken = jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = crypto.randomBytes(32).toString('hex');
        const tokenHash    = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const expiresAt    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, tokenHash, expiresAt]
        );

        res.json({ accessToken, refreshToken });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────

router.post('/refresh', authRefreshRateLimit, async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'refreshToken is required'));
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    try {
        // Atomic delete + validation — prevents race conditions on concurrent refresh
        const deleted = await pool.query(
            `DELETE FROM refresh_tokens
             WHERE token_hash = $1 AND expires_at > NOW() AND revoked = FALSE
             RETURNING user_id`,
            [tokenHash]
        );

        if (deleted.rowCount === 0) {
            return res.status(401).json(errBody('INVALID_TOKEN', 'Invalid or expired refresh token'));
        }

        const userId  = deleted.rows[0].user_id;
        const userRes = await pool.query(
            'SELECT id, email, role FROM users WHERE id = $1 AND deleted_at IS NULL',
            [userId]
        );

        if (userRes.rowCount === 0) {
            return res.status(401).json(errBody('UNAUTHORIZED', 'User account is inactive or deleted'));
        }

        const user = userRes.rows[0];

        const newAccessToken  = jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        const newRefreshToken = crypto.randomBytes(32).toString('hex');
        const newTokenHash    = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

        await pool.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, newTokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        );

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────

router.get('/me', authReadRateLimit, authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, firstname, lastname, email, role, created_at
             FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [req.user.sub]
        );

        if (result.rowCount === 0) {
            return res.status(404).json(errBody('NOT_FOUND', 'User not found'));
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────

router.post('/logout', authReadRateLimit, async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json(errBody('MISSING_FIELDS', 'refreshToken is required'));
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
