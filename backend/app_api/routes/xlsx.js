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
      const schoolsResult = await pool.query(`
          SELECT
              region       AS municipio,
              school       AS plantel,
              name         AS escuela,
              employees    AS personal_escolar,
              students     AS estudiantes,
              level        AS nivel_educativo,
              cct,
              mode         AS modalidad,
              shift        AS turno,
              category     AS sostenimiento,
              address      AS direccion,
              location     AS ubicacion_mapa
          FROM schools
          ORDER BY name
      `);

      const needsResult = await pool.query(`
          SELECT
              s.region      AS municipio,
              s.name        AS escuela,
              'General'     AS categoria,
              'General'     AS subcategoria,
              sn.item_name  AS propuesta,
              sn.quantity   AS cantidad,
              sn.unit       AS unidad,
              'Pendiente'   AS estado,
              ''            AS detalles
          FROM schools_needs sn
          JOIN schools s ON s.id = sn.school_id
          ORDER BY s.name
      `);

      const data = {
          needs: needsResult.rows,
          schools: schoolsResult.rows
      };

      const buffer = await exportFullDatabaseToExcel(data);

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