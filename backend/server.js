const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const initDatabase = require('./db/init');

const app = express();
app.use(express.json());

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

// Inicializar tablas
initDatabase(dbConfig).catch(console.error);

const dbPool = new Pool(dbConfig);
const JWT_SECRET = process.env.JWT_SECRET;

// POST /auth/register
app.post('/auth/register', async (req, res) => {
    const { email, password, firstname, lastname } = req.body;

    if (!email || !password || !firstname || !lastname) {
        return res.status(400).json({ error: "missing_fields" });
    }

    try {
        const userExists = await dbPool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userExists.rowCount > 0) {
            return res.status(400).json({ error: "user_exists" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        // El rol se asigna dependiendo del dominio del email
        const role = email.endsWith('@schoolfinder.org') ? 'admin' : 'staff';

        const result = await dbPool.query(
            `INSERT INTO users (firstname, lastname, email, password_hash, role) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id, role`,
            [firstname, lastname, email, passwordHash, role]
        );

        res.status(201).json({ message: "Usuario creado", user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "db_error" });
    }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await dbPool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "invalid_credentials" });
        }

        const accessToken = jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Generar el token aleatorio
        const refreshToken = crypto.randomBytes(32).toString('hex');
        
        // Generar el HASH
        const tokenHashForDB = crypto.createHash('sha256').update(refreshToken).digest('hex');
        
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Insertar usando la variable del hash
        await dbPool.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, tokenHashForDB, expiresAt]
        );

        // Enviar el refreshToken plano al cliente
        res.json({ accessToken, refreshToken });
    } catch (error) {
        console.error("Error en Login:", error);
        res.status(500).json({ error: "db_error" });
    }
});

// POST /auth/refresh
app.post('/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    try {
        const tokenRes = await dbPool.query(
            'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW() AND revoked = FALSE',
            [tokenHash]
        );

        if (tokenRes.rowCount === 0) return res.status(401).json({ error: "invalid_token" });

        const userId = tokenRes.rows[0].user_id;
        await dbPool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);

        const userRes = await dbPool.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];

        const newAccessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
        const newRefreshToken = crypto.randomBytes(32).toString('hex');
        const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        
        await dbPool.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, newTokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        );

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
        res.status(500).json({ error: "refresh_error" });
    }
});

app.listen(3000, () => console.log('Backend ImpulsaEdu en puerto 5432'));