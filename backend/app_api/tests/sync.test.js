const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Mock middlewares
jest.mock('../middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        if (authHeader === 'Bearer valid-admin-token') {
            req.user = { role: 'admin' };
            next();
        } else if (authHeader === 'Bearer valid-user-token') {
            req.user = { role: 'staff' };
            next();
        } else {
            return res.status(401).json({ error: 'UNAUTHORIZED' });
        }
    },
    requireAdmin: (req, res, next) => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        next();
    }
}));

// Mock the sync function
jest.mock('../functions/sync-xslx-to-db', () => ({
    syncExcelToDB: jest.fn()
}));
jest.mock('../functions/exportToExcel', () => jest.fn());

const { syncExcelToDB } = require('../functions/sync-xslx-to-db');

// Create a mock app mounting the actual router
const app = express();
app.use(express.json());
app.use('/api/v1/xlsx', require('../routes/xlsx'));

describe('POST /api/v1/xlsx/upload', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if no auth token is provided', async () => {
        const response = await request(app).post('/api/v1/xlsx/upload');
        expect(response.status).toBe(401);
    });

    it('should return 403 if user is not admin', async () => {
        const response = await request(app)
            .post('/api/v1/xlsx/upload')
            .set('Authorization', 'Bearer valid-user-token');
        expect(response.status).toBe(403);
    });

    it('should return 400 if no file is uploaded', async () => {
        const response = await request(app)
            .post('/api/v1/xlsx/upload')
            .set('Authorization', 'Bearer valid-admin-token');
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('FILE_REQUIRED');
    });

    it('should return 200 on successful sync', async () => {
        syncExcelToDB.mockResolvedValue({
            schools: { inserted: 1, updated: 0, deleted: 0 },
            needs: { inserted: 2, updated: 0, deleted: 'all_recreated' }
        });

        // Create a dummy file to upload securely
        const dummyFilePath = path.join(__dirname, 'dummy.xlsx');
        fs.writeFileSync(dummyFilePath, 'dummy data');

        const response = await request(app)
            .post('/api/v1/xlsx/upload')
            .set('Authorization', 'Bearer valid-admin-token')
            .attach('file', dummyFilePath);

        expect(response.status).toBe(200);
        expect(response.body.result.schools.inserted).toBe(1);
        
        if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    });

    it('should return 500 containing the rollback error message on sync failure', async () => {
        const rollbackErrorMsg = 'Sync failed and transaction was rolled back. Details: Sheet "Datos de las escuelas" not found.';
        syncExcelToDB.mockRejectedValue(new Error(rollbackErrorMsg));

        const dummyFilePath = path.join(__dirname, 'dummy.xlsx');
        fs.writeFileSync(dummyFilePath, 'dummy data');

        const response = await request(app)
            .post('/api/v1/xlsx/upload')
            .set('Authorization', 'Bearer valid-admin-token')
            .attach('file', dummyFilePath);

        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe('UPLOAD_ERROR');
        expect(response.body.error.message).toBe(rollbackErrorMsg);

        if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    });
});
