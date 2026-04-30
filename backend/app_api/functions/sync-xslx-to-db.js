const xlsx = require('xlsx');
const pool = require('../db/pool');

// Normalize strings for fuzzy matching: lowercase, strip accents, collapse whitespace
function normalize(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

// Map Excel 'Estado' values to the school_need_status enum.
// The sheet has a third value 'Cubierto parcialmente' not in the enum — we map it to 'Aun no cubierto'
// as a conservative fallback (partially covered != fully covered).
function mapNeedStatus(estado) {
    switch (estado) {
        case 'Cubierto': return 'Cubierto';
        case 'Aun no cubierto': return 'Aun no cubierto';
        case 'Cubierto parcialmente': return 'Aun no cubierto'; // no matching enum value
        default: return 'Aun no cubierto';
    }
}

async function syncExcelToDB(filePath) {
    const workbook = xlsx.readFile(filePath);

    // --- Sheet: "Datos de las escuelas" (header on row 5, range: 4) ---
    const schoolsSheet = workbook.Sheets['Datos de las escuelas'];
    if (!schoolsSheet) throw new Error('Sheet "Datos de las escuelas" not found.');

    // range:4 skips rows 0-3 (0-indexed), making row 5 the header
    const schoolsRaw = xlsx.utils.sheet_to_json(schoolsSheet, { range: 4 });
    if (schoolsRaw.length && !('CCT' in schoolsRaw[0])) {
        throw new Error("Column 'CCT' not found in schools sheet. Check header row.");
    }

    // --- Sheet: "Necesidades" (header on row 4, range: 3) ---
    const needsSheet = workbook.Sheets['Necesidades'];
    if (!needsSheet) throw new Error('Sheet "Necesidades" not found.');

    // range:3 skips rows 0-2, making row 4 the header
    const needsRaw = xlsx.utils.sheet_to_json(needsSheet, { range: 3 });
    if (needsRaw.length && !('Propuesta' in needsRaw[0])) {
        throw new Error("Column 'Propuesta' not found in needs sheet. Check header row.");
    }

    // Build a lookup from normalized (Municipio, Plantel) -> CCT for resolving needs rows.
    // The needs sheet uses 'Plantel' (short name) in its 'Escuela' column, not the full 'Escuela' name.
    // Join key: normalize(needs.Municipio) + normalize(needs.Escuela) -> normalize(schools.Municipio) + normalize(schools.Plantel)
    const plantelToCCT = new Map();
    for (const row of schoolsRaw) {
        if (!row.CCT) continue;
        const key = normalize(row.Municipio) + '|' + normalize(row.Plantel);
        plantelToCCT.set(key, row.CCT);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // --- Schools sync ---
        const { rows: dbSchools } = await client.query(
            'SELECT id, cct FROM schools WHERE deleted_at IS NULL'
        );
        const dbByCCT = new Map(dbSchools.map(r => [r.cct, r]));
        const excelCCTs = new Set(schoolsRaw.filter(r => r.CCT).map(r => r.CCT));

        const toInsert = schoolsRaw.filter(r => r.CCT && !dbByCCT.has(r.CCT));
        const toUpdate = schoolsRaw.filter(r => r.CCT && dbByCCT.has(r.CCT));
        const toDelete = dbSchools.filter(r => r.cct && !excelCCTs.has(r.cct));

        for (const row of toInsert) {
            await client.query(
                `INSERT INTO schools
                    (region, school, name, employees, students, level, cct, mode, shift, address, location, category, goal)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [
                    row.Municipio          || 'N/A',
                    row.Plantel            || row['Nombre de la Escuela'] || 'N/A',
                    row.Escuela            || row['Nombre de la Escuela'] || 'N/A',
                    row['Personal escolar'] || 0,
                    row.Estudiantes         || 0,
                    row['Nivel ed.']        || 'Primaria',
                    row.CCT,
                    row.Modalidad           || 'Otro',
                    row.Turno               || 'Matutino',
                    row.Dirección           || 'N/A',
                    row.Ubicación           || 'N/A',
                    row.Sostenimiento       || 'Estatal',
                    1000.00,
                ]
            );
        }

        for (const row of toUpdate) {
            await client.query(
                `UPDATE schools
                 SET region=$1, school=$2, name=$3, employees=$4, students=$5,
                     level=$6, mode=$7, shift=$8, address=$9, location=$10, category=$11,
                     updated_at=NOW()
                 WHERE cct=$12 AND deleted_at IS NULL`,
                [
                    row.Municipio           || 'N/A',
                    row.Plantel             || row['Nombre de la Escuela'] || 'N/A',
                    row.Escuela             || row['Nombre de la Escuela'] || 'N/A',
                    row['Personal escolar']  || 0,
                    row.Estudiantes          || 0,
                    row['Nivel ed.']         || 'Primaria',
                    row.Modalidad            || 'Otro',
                    row.Turno                || 'Matutino',
                    row.Dirección            || 'N/A',
                    row.Ubicación            || 'N/A',
                    row.Sostenimiento        || 'Estatal',
                    row.CCT,
                ]
            );
        }

        for (const dbRow of toDelete) {
            if (!dbRow.id) continue;
            // Cascade-delete needs first, then soft-delete the school.
            // Hard-delete needs since they have no independent lifecycle.
            await client.query('DELETE FROM schools_needs WHERE school_id = $1', [dbRow.id]);
            await client.query(
                'UPDATE schools SET deleted_at = NOW() WHERE id = $1',
                [dbRow.id]
            );
        }

        // Refresh cct -> id map after inserts
        const { rows: updatedSchools } = await client.query(
            'SELECT id, cct FROM schools WHERE deleted_at IS NULL'
        );
        const cctToId = new Map(updatedSchools.map(r => [r.cct, r.id]));

        // --- Needs sync: full replace strategy ---
        // Collect all school_ids that appear in the new Excel data to scope the delete.
        // This avoids wiping needs for schools not present in the current file.
        const affectedSchoolIds = new Set();
        for (const row of needsRaw) {
            const key = normalize(row.Municipio) + '|' + normalize(row.Escuela);
            const cct = plantelToCCT.get(key);
            if (!cct) continue;
            const id = cctToId.get(cct);
            if (id) affectedSchoolIds.add(id);
        }

        // Delete only needs for schools actually present in this file
        for (const schoolId of affectedSchoolIds) {
            await client.query('DELETE FROM schools_needs WHERE school_id = $1', [schoolId]);
        }

        let needsInserted = 0;
        let needsSkipped = 0;
        for (const row of needsRaw) {
            if (!row.Propuesta) continue;

            const key = normalize(row.Municipio) + '|' + normalize(row.Escuela);
            const cct = plantelToCCT.get(key);
            if (!cct) {
                needsSkipped++;
                continue;
            }
            const schoolId = cctToId.get(cct);
            if (!schoolId) {
                needsSkipped++;
                continue;
            }

            await client.query(
                `INSERT INTO schools_needs
                    (school_id, category, subcategory, item_name, quantity, unit, amount, status)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [
                    schoolId,
                    row['Categoría']    || 'Sin categoría',
                    row['Subcategoría'] || 'Sin subcategoría',
                    row.Propuesta,
                    parseInt(row.Cantidad) || 1,
                    row.Unidad || 'Pza',
                    100.00,                         // amount unknown in source; placeholder
                    mapNeedStatus(row.Estado),
                ]
            );
            needsInserted++;
        }

        await client.query('COMMIT');

        return {
            schools: {
                inserted: toInsert.length,
                updated:  toUpdate.length,
                deleted:  toDelete.length,
            },
            needs: {
                inserted: needsInserted,
                skipped:  needsSkipped,  // rows where school name couldn't be resolved
            },
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { syncExcelToDB };
