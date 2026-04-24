const request = require('supertest');
const express = require('express');

// 1. Mock Environment variables BEFORE requiring the router to hit the init path
process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=fake;AccountKey=fake;EndpointSuffix=core.windows.net';

// 2. Setup mock blob data returning from the flat list
const mockBlobs = [
    { name: 'schools/12345/1.jpg' },
    { name: 'schools/12345/2.png' },
    { name: 'schools/67890/1.jpg' }
];

// 3. Fully mock the Azure Storage Blob dependency behavior
jest.mock('@azure/storage-blob', () => {
    return {
        BlobServiceClient: {
            fromConnectionString: jest.fn(() => ({
                getContainerClient: jest.fn(() => ({
                    listBlobsFlat: async function* ({ prefix }) {
                        for (const blob of mockBlobs) {
                            if (blob.name.startsWith(prefix)) {
                                yield blob;
                            }
                        }
                    },
                    getBlobClient: jest.fn((name) => ({
                        url: `https://fake.blob.core.windows.net/public-images/${name}`
                    }))
                }))
            }))
        }
    };
});

const imagesRouter = require('../routes/images');

const app = express();
app.use(express.json());
app.use('/api/v1/images', imagesRouter);

describe('GET /api/v1/images (Azure Blob Storage Mocks)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if cct is missing', async () => {
        const response = await request(app).get('/api/v1/images');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('BAD_REQUEST');
    });

    it('should return all image URLs for a valid cct', async () => {
        const response = await request(app).get('/api/v1/images?cct=12345');
        expect(response.status).toBe(200);
        expect(response.body.cct).toBe('12345');
        expect(response.body.urls).toHaveLength(2);
        expect(response.body.urls[0]).toBe('https://fake.blob.core.windows.net/public-images/schools/12345/1.jpg');
        expect(response.body.urls[1]).toBe('https://fake.blob.core.windows.net/public-images/schools/12345/2.png');
    });

    it('should return empty list if cct has no images', async () => {
        const response = await request(app).get('/api/v1/images?cct=99999');
        expect(response.status).toBe(200);
        expect(response.body.cct).toBe('99999');
        expect(response.body.urls).toEqual([]);
    });

    it('should return the specific image URL if n matches', async () => {
        const response = await request(app).get('/api/v1/images?cct=12345&n=2');
        expect(response.status).toBe(200);
        expect(response.body.cct).toBe('12345');
        expect(response.body.n).toBe('2');
        expect(response.body.urls).toHaveLength(1);
        expect(response.body.urls[0]).toBe('https://fake.blob.core.windows.net/public-images/schools/12345/2.png');
    });

    it('should return 404 if specific image n is not found in a valid cct', async () => {
        const response = await request(app).get('/api/v1/images?cct=12345&n=99');
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('NOT_FOUND');
    });
});
