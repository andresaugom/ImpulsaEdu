const request = require('supertest');
const express = require('express');
require('dotenv').config();

// We are testing an actual connection to Azure Storage
// Make sure .env has valid AZURE_STORAGE_CONNECTION_STRING & AZURE_STORAGE_CONTAINER_NAME=schools

const imagesRouter = require('../routes/images');

const app = express();
app.use(express.json());
app.use('/api/v1/images', imagesRouter);

describe('GET /api/v1/images (Real Azure Storage Integration)', () => {
    // Increase timeout since real network requests to Azure might take longer
    jest.setTimeout(15000);

    it('should return 400 if cct is missing', async () => {
        const response = await request(app).get('/api/v1/images');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('BAD_REQUEST');
    });

    it('should return all image URLs for a valid real CCT (e.g. 14EPR1614C)', async () => {
        const cct = '14EPR1614C';
        const response = await request(app).get(`/api/v1/images?cct=${cct}`);
        expect(response.status).toBe(200);
        expect(response.body.cct).toBe(cct);
        expect(Array.isArray(response.body.urls)).toBe(true);
        expect(response.body.urls.length).toBeGreaterThan(0);
        
        // Check if one of the real URLs looks correct
        const firstUrl = response.body.urls[0];
        expect(firstUrl).toContain(`stimpulsaedu.blob.core.windows.net/schools/${cct}/`);
    });

    it('should return empty list if cct has no images', async () => {
        const response = await request(app).get('/api/v1/images?cct=FAKECCT999');
        expect(response.status).toBe(200);
        expect(response.body.cct).toBe('FAKECCT999');
        expect(response.body.urls).toEqual([]);
    });

    it('should return the specific image URL if n matches a real file (e.g. n=15 for 14EPR1614C)', async () => {
        const cct = '14EPR1614C';
        const n = '15.jpg'; // We can test filtering by actual string n
        
        const response = await request(app).get(`/api/v1/images?cct=${cct}&n=15`);
        expect(response.status).toBe(200);
        expect(response.body.cct).toBe(cct);
        expect(response.body.urls.length).toBeGreaterThan(0);
        expect(response.body.urls.some(url => url.includes('15.jpg') || url.includes('15'))).toBe(true);
    });

    it('should return 404 if specific image n is not found in a valid cct', async () => {
        const response = await request(app).get('/api/v1/images?cct=14EPR1614C&n=99999'); // Non existent file
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('NOT_FOUND');
    });
});