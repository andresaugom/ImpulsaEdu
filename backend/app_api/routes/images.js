const express = require('express');
const router = express.Router();
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

// Initialize Azure Blob Service Client
// Expose AZURE_STORAGE_CONNECTION_STRING in your .env
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'schools';

// Extensions that browsers can display natively
const BROWSER_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);

function isBrowserImage(blobName) {
    const ext = blobName.slice(blobName.lastIndexOf('.')).toLowerCase();
    return BROWSER_IMAGE_EXTS.has(ext);
}

// Sort blob names numerically by the filename stem (e.g. "14/2.jpg" < "14/10.jpg")
function numericBlobSort(a, b) {
    const stemA = a.split('/').pop().replace(/\.[^.]+$/, '');
    const stemB = b.split('/').pop().replace(/\.[^.]+$/, '');
    const numA = parseInt(stemA, 10);
    const numB = parseInt(stemB, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return stemA.localeCompare(stemB);
}

let blobServiceClient;
if (AZURE_CONNECTION_STRING) {
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);
} else {
    // Optionally connect without connection string if you fall back to public URLs only,
    // but we need it to verify files exist.
    console.error("AZURE_STORAGE_CONNECTION_STRING is not set.");
}

router.get('/', async (req, res) => {
    try {
        const { cct, n } = req.query;

        if (!cct) {
            return res.status(400).json({ error: 'BAD_REQUEST', message: 'The "cct" parameter is required.' });
        }

        if (!blobServiceClient) {
            return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Azure Storage not configured.' });
        }

        const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

        const blobs = [];

        if (n) {
            // Check for specific image N
            const prefix = `${cct}/${n}`;
            let found = false;
            
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                if (blob.name.startsWith(prefix) && isBrowserImage(blob.name)) {
                    found = true;
                    const blobUrl = containerClient.getBlobClient(blob.name).url;
                    return res.status(200).json({ cct, n, urls: [blobUrl] });
                }
            }
            if (!found) {
                return res.status(404).json({ error: 'NOT_FOUND', message: `Image ${n} for school ${cct} not found.` });
            }

        } else {
            // List all browser-displayable images for the school, sorted numerically
            const prefix = `${cct}/`;
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                if (isBrowserImage(blob.name)) {
                    blobs.push(blob.name);
                }
            }
            blobs.sort(numericBlobSort);
            const urls = blobs.map(name => containerClient.getBlobClient(name).url);
            return res.status(200).json({ cct, urls });
        }

    } catch (error) {
        console.error('Azure Storage Error:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving images.' });
    }
});

module.exports = router;
