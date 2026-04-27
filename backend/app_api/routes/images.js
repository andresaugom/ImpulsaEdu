const express = require('express');
const router = express.Router();
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

// Initialize Azure Blob Service Client
// Expose AZURE_STORAGE_CONNECTION_STRING in your .env
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'images';

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

        const urls = [];

        if (n) {
            // Check for specific image N
            const prefix = `${cct}/${n}`;
            let found = false;
            let blobUrl = '';
            
            // We search for blobs that start with the prefix in case there's an extension like .jpg or .png attached
            // The requirements say structure is schools/{CCT}/{N}. If extensions exist, they are found.
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                if (blob.name.startsWith(prefix)) {
                    found = true;
                    blobUrl = containerClient.getBlobClient(blob.name).url;
                    urls.push(blobUrl);
                    break; // stop at first match
                }
            }
            if(!found) {
                 return res.status(404).json({ error: 'NOT_FOUND', message: `Image ${n} for school ${cct} not found.` });
            }
            return res.status(200).json({ cct, n, urls });

        } else {
            // List all images for the school
            const prefix = `${cct}/`;
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
                const blobUrl = containerClient.getBlobClient(blob.name).url;
                urls.push(blobUrl);
            }
            return res.status(200).json({ cct, urls });
        }

    } catch (error) {
        console.error('Azure Storage Error:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Error retrieving images.' });
    }
});

module.exports = router;
