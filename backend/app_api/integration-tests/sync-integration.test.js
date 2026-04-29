/**
 * Integration test for syncExcelToDB using a real DB connection.
 * Requires a running PostgreSQL instance with credentials from .env
 */

const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../db/pool');
const { syncExcelToDB } = require('../functions/sync-xslx-to-db');

const TEST_CCT = 'TEST_CCT_INTEGRATION_001';
const TEST_SCHOOL_NAME = 'Escuela de Integración Test';
const TEST_FILE = path.join(__dirname, 'test-sync-integration.xlsx');

function createTestExcel(schoolName = TEST_SCHOOL_NAME, cct = TEST_CCT) {
    const workbook = xlsx.utils.book_new();

    // Sheet: "Datos de las escuelas" 
    const schoolsData = [
        ['', '', '', '', '', '', '', '', '', '', '', ''],   // row 1
        ['', '', '', '', '', '', '', '', '', '', '', ''],   // row 2
        ['', '', '', '', '', '', '', '', '', '', '', ''],   // row 3
        ['', '', '', '', '', '', '', '', '', '', '', ''],   // row 4
        ['CCT', 'Municipio', 'Nombre de la Escuela', 'Personal escolar', 'Estudiantes', 'Nivel ed.', 'Modalidad', 'Turno', 'Dirección', 'Ubicación', 'Sostenimiento', 'Extra'], // row 5 = header
        [cct, 'Municipio Test', schoolName, 5, 100, 'Primaria', 'SEP-General', 'Matutino', 'Calle Falsa 123', 'Urbana', 'Estatal', ''],
    ];

    const schoolsWs = xlsx.utils.aoa_to_sheet(schoolsData);
    xlsx.utils.book_append_sheet(workbook, schoolsWs, 'Datos de las escuelas');

    // Sheet: "Necesidades" 
    const needsData = [
        ['', '', '', '', ''],   
        ['', '', '', '', ''],   
        ['', '', '', '', ''],   
        ['Propuesta', 'Escuela', 'Cantidad', 'Unidad', 'Monto'], 
        ['Sillas', schoolName, 10, 'Pza', 1500.00],
        ['Mesas', schoolName, 5, 'Pza', 2000.00],
    ];

    const needsWs = xlsx.utils.aoa_to_sheet(needsData);
    xlsx.utils.book_append_sheet(workbook, needsWs, 'Necesidades');

    xlsx.writeFile(workbook, TEST_FILE);
}

async function cleanupTestData(client) {
    if (!client) return;
    const { rows } = await client.query('SELECT id FROM schools WHERE cct = $1', [TEST_CCT]);
    for (const row of rows) {
        await client.query('DELETE FROM schools_needs WHERE school_id = $1', [row.id]);
    }
    await client.query('DELETE FROM schools WHERE cct = $1', [TEST_CCT]);
}

describe('syncExcelToDB — integration (real DB)', () => {
    let client;

    beforeAll(async () => {
        client = await pool.connect();
        await cleanupTestData(client);
        createTestExcel();
    });

    afterAll(async () => {
        await cleanupTestData(client);
        client.release();
        await pool.end();
        if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    });

    it('inserts a new school and its needs into the database', async () => {
        const result = await syncExcelToDB(TEST_FILE);

        expect(result.schools.inserted).toBeGreaterThanOrEqual(1);
        expect(result.needs.inserted).toBeGreaterThanOrEqual(2);

        const { rows: schools } = await client.query(
            'SELECT * FROM schools WHERE cct = $1',
            [TEST_CCT]
        );
        expect(schools).toHaveLength(1);
        expect(schools[0].name).toBe(TEST_SCHOOL_NAME);
        expect(schools[0].employees).toBe(5);
        expect(schools[0].students).toBe(100);

        const { rows: needs } = await client.query(
            'SELECT * FROM schools_needs WHERE school_id = $1 ORDER BY item_name',
            [schools[0].id]
        );
        expect(needs).toHaveLength(2);
        const itemNames = needs.map(n => n.item_name);
        expect(itemNames).toContain('Mesas');
        expect(itemNames).toContain('Sillas');
    });

    it('updates an existing school on a second sync', async () => {
        const updatedName = 'Escuela de Integración Actualizada';
        createTestExcel(updatedName, TEST_CCT);

        const result = await syncExcelToDB(TEST_FILE);

        expect(result.schools.updated).toBeGreaterThanOrEqual(1);

        const { rows: schools } = await client.query(
            'SELECT * FROM schools WHERE cct = $1',
            [TEST_CCT]
        );
        expect(schools).toHaveLength(1);
        expect(schools[0].name).toBe(updatedName);
    });

    it('removes a school that is no longer in the Excel file', async () => {
        // Build a file with a *different* CCT so TEST_CCT becomes absent
        const otherCct = 'TEST_CCT_OTHER_999';
        createTestExcel('Otra Escuela', otherCct);

        try {
            const result = await syncExcelToDB(TEST_FILE);
            expect(result.schools.deleted).toBeGreaterThanOrEqual(1);

            const { rows } = await client.query(
                'SELECT id FROM schools WHERE cct = $1',
                [TEST_CCT]
            );
            expect(rows).toHaveLength(0);
        } finally {
            // Clean up the other school too (needs first due to FK constraint)
            const { rows: other } = await client.query('SELECT id FROM schools WHERE cct = $1', [otherCct]);
            for (const row of other) {
                await client.query('DELETE FROM schools_needs WHERE school_id = $1', [row.id]);
            }
            await client.query('DELETE FROM schools WHERE cct = $1', [otherCct]);
        }
    });
});
