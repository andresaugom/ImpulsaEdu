import * as xlsx from 'xlsx';
import pool from '../db/pool';

export async function syncExcelToDB(filePath: string) {
    // 1. Read Workbook
    const workbook = xlsx.readFile(filePath);
    
    // --- Extraction: Schools ---
    const schoolsWorksheet = workbook.Sheets["Datos de las escuelas"];
    if (!schoolsWorksheet) throw new Error('Sheet "Datos de las escuelas" not found.');
    const schoolsExcelData: any[] = xlsx.utils.sheet_to_json(schoolsWorksheet, { range: 4 });

    // Validate School Columns (Fail Fast)
    if (schoolsExcelData.length > 0 && !schoolsExcelData[0]['CCT']) {
        throw new Error("Column 'CCT' not found at Row 5. Check Schools sheet.");
    }

    // --- Extraction: Needs ---
    const needsWorksheet = workbook.Sheets["Necesidades"];
    if (!needsWorksheet) throw new Error('Sheet "Necesidades" not found.');
    const needsExcelData: any[] = xlsx.utils.sheet_to_json(needsWorksheet, { range: 3 });

    // Validate Needs Columns (Fail Fast)
    if (needsExcelData.length > 0 && !needsExcelData[0]['ID / Clave']) {
        throw new Error("Column 'ID / Clave' not found at Row 4. Check Needs sheet.");
    }

    // 2. Optimization: Lookup Maps (Performance Fix)
    const schoolNameToCctMap = new Map<string, string>(
        schoolsExcelData.map(s => [s['Nombre de la Escuela'], s.CCT])
    );
    const excelSchoolsMap = new Map(schoolsExcelData.map(s => [s.CCT, s]));
    const excelNeedsMap = new Map(needsExcelData.map(n => [n['ID / Clave'], n]));

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // --- PHASE 1: SYNC SCHOOLS ---
        const { rows: dbSchools } = await client.query('SELECT cct FROM schools');
        const dbSchoolsMap = new Map(dbSchools.map(s => [s.cct, s]));

        const schoolsToInsert = schoolsExcelData.filter(s => s.CCT && !dbSchoolsMap.has(s.CCT));
        const schoolsToUpdate = schoolsExcelData.filter(s => s.CCT && dbSchoolsMap.has(s.CCT));
        const schoolsToDelete = dbSchools.filter(s => !excelSchoolsMap.has(s.cct));

        // DELETE (Child needs first, then schools)
        for (const school of schoolsToDelete) {
            await client.query('DELETE FROM schools_needs WHERE school_cct = $1', [school.cct]);
            await client.query('DELETE FROM schools WHERE cct = $1', [school.cct]);
        }

        // INSERT SCHOOLS
        for (const item of schoolsToInsert) {
            await client.query({
                text: `INSERT INTO schools (municipality, name, personnel, students, level, cct, mode, shift, sostenimiento, address, location) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                values: [item.Municipio, item['Nombre de la Escuela'], item['Personal escolar'], item.Estudiantes, item['Nivel ed.'], item.CCT, item.Modalidad, item.Turno, item.Sostenimiento, item.Dirección, item.Ubicación]
            });
        }

        // UPDATE SCHOOLS
        for (const item of schoolsToUpdate) {
            await client.query({
                text: `UPDATE schools SET municipality=$1, name=$2, personnel=$3, students=$4, level=$5, mode=$6, shift=$7, sostenimiento=$8, address=$9, location=$10 WHERE cct=$11`,
                values: [item.Municipio, item['Nombre de la Escuela'], item['Personal escolar'], item.Estudiantes, item['Nivel ed.'], item.Modalidad, item.Turno, item.Sostenimiento, item.Dirección, item.Ubicación, item.CCT]
            });
        }

        // --- PHASE 2: SYNC NEEDS ---
        const { rows: dbNeeds } = await client.query('SELECT id_excel FROM schools_needs');
        const dbNeedsMap = new Map(dbNeeds.map(n => [n.id_excel, n]));

        const needsToInsert = needsExcelData.filter(n => n['ID / Clave'] && !dbNeedsMap.has(n['ID / Clave']));
        const needsToUpdate = needsExcelData.filter(n => n['ID / Clave'] && dbNeedsMap.has(n['ID / Clave']));
        const needsToDelete = dbNeeds.filter(n => n.id_excel && !excelNeedsMap.has(n.id_excel));

        // DELETE NEEDS
        for (const need of needsToDelete) {
            await client.query('DELETE FROM schools_needs WHERE id_excel = $1', [need.id_excel]);
        }

        // INSERT NEEDS
        for (const item of needsToInsert) {
            const schoolCct = schoolNameToCctMap.get(item.Escuela);
            if (!schoolCct) continue; 
            await client.query({
                text: `INSERT INTO schools_needs (id_excel, school_cct, municipality, school_name, category, subcategory, proposal, quantity, unit, status, details) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                values: [item['ID / Clave'], schoolCct, item.Municipio, item.Escuela, item.Categoría, item.Subcategoría, item.Propuesta, item.Cantidad, item.Unidad, item.Estado, item.Detalles]
            });
        }

        // UPDATE NEEDS
        for (const item of needsToUpdate) {
            const schoolCct = schoolNameToCctMap.get(item.Escuela);
            if (!schoolCct) continue;
            await client.query({
                text: `UPDATE schools_needs SET school_cct=$1, municipality=$2, school_name=$3, category=$4, subcategory=$5, proposal=$6, quantity=$7, unit=$8, status=$9, details=$10 WHERE id_excel=$11`,
                values: [schoolCct, item.Municipio, item.Escuela, item.Categoría, item.Subcategoría, item.Propuesta, item.Cantidad, item.Unidad, item.Estado, item.Detalles, item['ID / Clave']]
            });
        }

        await client.query('COMMIT');
        return { success: true, message: "Synchronization complete." };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Critical Sync Error:", error);
        throw error;
    } finally {
        client.release();
    }
}