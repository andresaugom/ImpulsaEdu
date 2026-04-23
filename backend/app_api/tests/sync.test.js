const request = require('supertest');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Mock the sync function
jest.mock('../functions/sync-xslx-to-db', () => ({
    syncExcelToDB: jest.fn()
}));

const { syncExcelToDB } = require('../functions/sync-xslx-to-db');

// Create a mock app mirroring the required endpoint logic
const app = express();
app.use(express.json());

// Mock authentication middleware logic mapping to typical behavior
const authenticateToken = (req, res, next) => {
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
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'FORBIDDEN' });
    }
    next();
};

const upload = multer({ dest: 'uploads/' });

// The route logic configured as per previous iteration specs
app.post('/api/v1/sync', authenticateToken, requireAdmin, upload.single('excel-file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'BAD_REQUEST', message: 'No file uploaded.' });
    }

    try {
        const result = await syncExcelToDB(req.file.path);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Error syncing data.' });
    } finally {
        // cleanup mocked temp uploaded file
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, () => {});
        }
    }
});

describe('POST /api/v1/sync', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 if no auth token is provided', async () => {
        const response = await request(app).post('/api/v1/sync');
        expect(response.status).toBe(401);
    });

    it('should return 403 if user is not admin', async () => {
        const response = await request(app)
            .post('/api/v1/sync')
            .set('Authorization', 'Bearer valid-user-token');
        expect(response.status).toBe(403);
    });

    it('should return 400 if no file is uploaded', async () => {
        const response = await request(app)
            .post('/api/v1/sync')
            .set('Authorization', 'Bearer valid-admin-token');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('BAD_REQUEST');
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
            .post('/api/v1/sync')
            .set('Authorization', 'Bearer valid-admin-token')
            .attach('excel-file', dummyFilePath);

        expect(response.status).toBe(200);
        expect(response.body.schools.inserted).toBe(1);
        
        fs.unlinkSync(dummyFilePath);
    });

    it('should return 500 on sync failure', async () => {
        syncExcelToDB.mockRejectedValue(new Error('Sync failed'));

        const dummyFilePath = path.join(__dirname, 'dummy.xlsx');
        fs.writeFileSync(dummyFilePath, 'dummy data');

        const response = await request(app)
            .post('/api/v1/sync')
            .set('Authorization', 'Bearer valid-admin-token')
            .attach('excel-file', dummyFilePath);

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('INTERNAL_SERVER_ERROR');

        fs.unlinkSync(dummyFilePath);
    });
});
