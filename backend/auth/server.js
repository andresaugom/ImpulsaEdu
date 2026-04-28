'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const initDatabase = require('./db/init');

const authRouter = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/auth', authRouter);

// ── Start ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const dbConfig = {
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port:     process.env.DB_PORT,
        ssl:      process.env.DB_SSL
    };

    initDatabase(dbConfig)
        .then(() => {
            const PORT = process.env.PORT || 3000;
            app.listen(PORT, () => console.log(`auth running on port ${PORT}`));
        })
        .catch(err => {
            console.error('Failed to initialise database:', err);
            process.exit(1);
        });
}

module.exports = app;