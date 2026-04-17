'use strict';

const jwt = require('jsonwebtoken');
const { errBody } = require('../utils/errors');

/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to req.user.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json(errBody('UNAUTHORIZED', 'Authentication required'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json(errBody('INVALID_TOKEN', 'Invalid or expired access token'));
        }
        req.user = user;
        next();
    });
};

/**
 * Requires the authenticated user to have the 'admin' role.
 * Must be used after authenticateToken.
 */
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json(errBody('FORBIDDEN', 'Admin role required'));
    }
    next();
};

module.exports = { authenticateToken, requireAdmin };
