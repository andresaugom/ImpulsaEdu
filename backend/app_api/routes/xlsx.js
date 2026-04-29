'use strict';

const router = require('express').Router();
const multer = require('multer');
const os = require('os');
const fs = require('fs');

const pool = require('../db/pool');
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
    const [schoolsRes, donationsRes] = await Promise.all([
      pool.query(
        `SELECT name, region, category FROM schools WHERE deleted_at IS NULL ORDER BY name`
      ),
      pool.query(
        `SELECT dn.donation_type, dn.description, dn.amount, dn.status,
                s.name AS school_name, s.region AS school_region
         FROM donations dn
         JOIN schools s ON dn.school_id = s.id
         WHERE dn.deleted_at IS NULL
         ORDER BY dn.created_at DESC`
      )
    ]);

    const schools = schoolsRes.rows.map(s => ({
      municipio: s.region,
      plantel: s.name,
      escuela: s.name,
      personal_escolar: null,
      estudiantes: null,
      nivel_educativo: s.category,
      cct: null,
      modalidad: null,
      turno: null,
      sostenimiento: null,
      direccion: null,
      ubicacion_mapa: null
    }));

    const needs = donationsRes.rows.map(d => ({
      municipio: d.school_region,
      escuela: d.school_name,
      categoria: d.donation_type,
      subcategoria: null,
      propuesta: d.description,
      cantidad: d.amount,
      unidad: d.donation_type === 'Monetaria' ? 'MXN' : 'unidad',
      estado: d.status,
      detalles: null
    }));

    const buffer = await exportFullDatabaseToExcel({ needs, schools });

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