'use strict';

const router = require('express').Router();
const multer = require('multer');
const os = require('os');
const fs = require('fs');

const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { errBody } = require('../utils/errors');

const exportFullDatabaseToExcel = require('../functions/exportToExcel');
const { syncExcelToDB } = require('../functions/sync-xslx-to-db');

// protect endpoints
router.use(authenticateToken, requireAdmin);

// temp storage (Azure friendly)
const upload = multer({
  dest: os.tmpdir()
});

// POST /api/v1/xlsx/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json(
      errBody('FILE_REQUIRED', 'Excel file is required')
    );
  }

  try {
    const result = await syncExcelToDB(req.file.path);

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      message: 'Excel uploaded successfully',
      result
    });

  } catch (err) {
    console.error(err);

    res.status(500).json(
      errBody('UPLOAD_ERROR', 'Failed to process Excel file')
    );
  }
});

// GET /api/v1/xlsx/download
router.get('/download', async (req, res) => {
  try {
    const mockData = {
      needs: [],
      schools: []
    };

    const buffer = await exportFullDatabaseToExcel(mockData);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="impulsaedu.xlsx"'
    );

    res.send(buffer);

  } catch (err) {
    console.error(err);

    res.status(500).json(
      errBody('DOWNLOAD_ERROR', 'Failed to generate Excel file')
    );
  }
});

module.exports = router;