'use strict';

require('dotenv').config();

const express = require('express');
const initDatabase = require('./db/init');

const usersRouter     = require('./routes/users');
const schoolsRouter   = require('./routes/schools');
const donorsRouter    = require('./routes/donors');
const donationsRouter = require('./routes/donations');
const reportsRouter   = require('./routes/reports');

const app = express();
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/v1/users',     usersRouter);
app.use('/api/v1/schools',   schoolsRouter);
app.use('/api/v1/donors',    donorsRouter);
app.use('/api/v1/donations', donationsRouter);
app.use('/api/v1/reports',   reportsRouter);

// ── Start ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const dbConfig = {
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port:     process.env.DB_PORT
    };

    initDatabase(dbConfig)
        .then(() => {
            const PORT = process.env.PORT || 4000;
            app.listen(PORT, () => console.log(`app_api running on port ${PORT}`));
        })
        .catch(err => {
            console.error('Failed to initialise database:', err);
            process.exit(1);
        });
}

module.exports = app;
