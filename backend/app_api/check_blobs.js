const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

async function main() {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME || 'schools');
    let count = 0;
    for await (const blob of containerClient.listBlobsFlat()) {
        console.log(blob.name);
        count++;
        if (count >= 10) break;
    }
}
main().catch(console.error);
