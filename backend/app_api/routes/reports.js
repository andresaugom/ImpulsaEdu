'use strict';

const router = require('express').Router();
const pool = require('../db/pool');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

// All report endpoints require admin role.
router.use(authenticateToken, requireAdmin);

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function toCSV(headers, rows) {
    const head = headers.join(',');
    const body = rows.map(row => headers.map(h => escapeCSV(row[h])).join(',')).join('\n');
    return `${head}\n${body}`;
}

function donationSummaryRow(row) {
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

const DONATION_SUMMARY_SELECT = `
    SELECT dn.id, dn.donor_id, d.name AS donor_name,
           dn.school_id, s.name AS school_name,
           dn.donation_type, dn.amount, dn.status,
           dn.description, dn.created_at
    FROM   donations dn
    JOIN   donors  d ON d.id = dn.donor_id
    JOIN   schools s ON s.id = dn.school_id
    WHERE  dn.deleted_at IS NULL
`;

// ── GET /api/v1/reports/donations-by-school ───────────────────────────────────

router.get('/donations-by-school', async (req, res) => {
    const { school_id } = req.query;
    const params = [];
    let   where  = '';

    if (school_id) {
        where = 'AND dn.school_id = $1';
        params.push(school_id);
    }

    try {
        const result = await pool.query(
            `SELECT
                s.id   AS school_id,
                s.name AS school_name,
                COALESCE(SUM(CASE WHEN dn.donation_type = 'Monetaria' THEN dn.amount ELSE 0 END), 0) AS total_monetary,
                COUNT(dn.id)                                                                           AS total_donations,
                COUNT(dn.id) FILTER (WHERE dn.status IN ('Registrado','Aprobado','Entregando','Entregado')) AS pending,
                COUNT(dn.id) FILTER (WHERE dn.status = 'Finalizado')                                   AS completed
             FROM   schools s
             LEFT   JOIN donations dn ON dn.school_id = s.id AND dn.deleted_at IS NULL
             WHERE  s.deleted_at IS NULL ${where}
             GROUP  BY s.id, s.name
             ORDER  BY s.name`,
            params
        );

        res.json(result.rows.map(row => ({
            school_id:       row.school_id,
            school_name:     row.school_name,
            total_monetary:  parseFloat(row.total_monetary),
            total_donations: parseInt(row.total_donations),
            pending:         parseInt(row.pending),
            completed:       parseInt(row.completed)
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/reports/donations-by-donor ────────────────────────────────────

router.get('/donations-by-donor', async (req, res) => {
    const { donor_id } = req.query;
    const params = [];
    let   where  = '';

    if (donor_id) {
        where = 'AND dn.donor_id = $1';
        params.push(donor_id);
    }

    try {
        const result = await pool.query(
            `SELECT
                d.id   AS donor_id,
                d.name AS donor_name,
                COUNT(dn.id)                         AS total_donations,
                COALESCE(SUM(dn.amount), 0)          AS total_value,
                COUNT(DISTINCT dn.school_id)         AS schools_supported
             FROM   donors d
             LEFT   JOIN donations dn ON dn.donor_id = d.id AND dn.deleted_at IS NULL
             WHERE  d.deleted_at IS NULL ${where}
             GROUP  BY d.id, d.name
             ORDER  BY d.name`,
            params
        );

        res.json(result.rows.map(row => ({
            donor_id:          row.donor_id,
            donor_name:        row.donor_name,
            total_donations:   parseInt(row.total_donations),
            total_value:       parseFloat(row.total_value),
            schools_supported: parseInt(row.schools_supported)
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/reports/pending-deliveries ────────────────────────────────────

router.get('/pending-deliveries', async (req, res) => {
    try {
        const result = await pool.query(
            `${DONATION_SUMMARY_SELECT}
             AND dn.status IN ('Aprobado', 'Entregando')
             ORDER BY dn.created_at`
        );
        res.json(result.rows.map(donationSummaryRow));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/reports/completed ────────────────────────────────────────────

router.get('/completed', async (req, res) => {
    try {
        const result = await pool.query(
            `${DONATION_SUMMARY_SELECT}
             AND dn.status = 'Finalizado'
             ORDER BY dn.created_at`
        );
        res.json(result.rows.map(donationSummaryRow));
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

// ── GET /api/v1/reports/export ────────────────────────────────────────────────

const REPORT_TYPES = ['donations-by-school', 'donations-by-donor', 'pending-deliveries', 'completed'];

router.get('/export', async (req, res) => {
    const { report } = req.query;

    if (!report || !REPORT_TYPES.includes(report)) {
        return res.status(400).json(errBody('INVALID_REPORT', `report must be one of: ${REPORT_TYPES.join(', ')}`));
    }

    try {
        let csvData = '';
        const date = new Date().toISOString().slice(0, 10);

        if (report === 'donations-by-school') {
            const result = await pool.query(
                `SELECT s.id AS school_id, s.name AS school_name,
                        COALESCE(SUM(CASE WHEN dn.donation_type='Monetaria' THEN dn.amount ELSE 0 END),0) AS total_monetary,
                        COUNT(dn.id)                                                                        AS total_donations,
                        COUNT(dn.id) FILTER (WHERE dn.status IN ('Registrado','Aprobado','Entregando','Entregado')) AS pending,
                        COUNT(dn.id) FILTER (WHERE dn.status = 'Finalizado')                               AS completed
                 FROM   schools s
                 LEFT JOIN donations dn ON dn.school_id = s.id AND dn.deleted_at IS NULL
                 WHERE  s.deleted_at IS NULL
                 GROUP  BY s.id, s.name ORDER BY s.name`
            );
            csvData = toCSV(
                ['school_id', 'school_name', 'total_monetary', 'total_donations', 'pending', 'completed'],
                result.rows
            );
        } else if (report === 'donations-by-donor') {
            const result = await pool.query(
                `SELECT d.id AS donor_id, d.name AS donor_name,
                        COUNT(dn.id)                AS total_donations,
                        COALESCE(SUM(dn.amount),0)  AS total_value,
                        COUNT(DISTINCT dn.school_id) AS schools_supported
                 FROM   donors d
                 LEFT JOIN donations dn ON dn.donor_id = d.id AND dn.deleted_at IS NULL
                 WHERE  d.deleted_at IS NULL
                 GROUP  BY d.id, d.name ORDER BY d.name`
            );
            csvData = toCSV(
                ['donor_id', 'donor_name', 'total_donations', 'total_value', 'schools_supported'],
                result.rows
            );
        } else if (report === 'pending-deliveries') {
            const result = await pool.query(
                `${DONATION_SUMMARY_SELECT} AND dn.status IN ('Aprobado','Entregando') ORDER BY dn.created_at`
            );
            csvData = toCSV(
                ['id', 'donor_name', 'school_name', 'donation_type', 'amount', 'status', 'created_at'],
                result.rows
            );
        } else if (report === 'completed') {
            const result = await pool.query(
                `${DONATION_SUMMARY_SELECT} AND dn.status = 'Finalizado' ORDER BY dn.created_at`
            );
            csvData = toCSV(
                ['id', 'donor_name', 'school_name', 'donation_type', 'amount', 'status', 'created_at'],
                result.rows
            );
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="report-${date}.csv"`);
        res.send(csvData);
    } catch (err) {
        console.error(err);
        res.status(500).json(errBody('SERVER_ERROR', 'Internal server error'));
    }
});

module.exports = router;
