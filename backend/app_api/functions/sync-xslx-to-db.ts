import * as xlsx from 'xlsx';
import pool from '../db/pool';

interface School {
    municipality: string;
    name: string;
    personnel: number;
    students: number;
    level: string;
    cct: string;
    mode: string;
    shift: string;
    sostenimiento: string;
    address: string;
    location: string;
}

interface SchoolNeed {
    id_excel: string; // Changed to match your usage later
    school_cct: string;
    municipality: string;
    school_name: string;
    category: string;
    subcategory: string;
    proposal: string;
    quantity: number;
    unit: string;
    status: string;
    details: string;
}

async function getSchoolsFromDB(client: any): Promise<School[]> {
    const { rows } = await client.query('SELECT * FROM schools');
    return rows;
}

async function getNeedsFromDB(client: any): Promise<SchoolNeed[]> {
    const { rows } = await client.query('SELECT * FROM schools_needs');
    return rows;
}

export async function syncExcelToDB(filePath: string) {
    const workbook = xlsx.readFile(filePath);
    
    // --- Sheet: "Datos de las escuelas" ---
    const schoolsSheetName = "Datos de las escuelas";
    const schoolsWorksheet = workbook.Sheets[schoolsSheetName];
    if (!schoolsWorksheet) {
        throw new Error(`Sheet "${schoolsSheetName}" not found.`);
    }
    const schoolsExcelData: any[] = xlsx.utils.sheet_to_json(schoolsWorksheet, { range: 4 });

    const sampleRowSchools = schoolsExcelData[0]; // Renamed
    if (sampleRowSchools && !sampleRowSchools['CCT']) {
        throw new Error("Column 'CCT' not found. Check if header is at Row 5.");
    }

    // --- Sheet: "Necesidades" ---
    const needsSheetName = "Necesidades";
    const needsWorksheet = workbook.Sheets[needsSheetName];
    if (!needsWorksheet) {
        throw new Error(`Sheet "${needsSheetName}" not found.`);
    }
    const needsExcelData: any[] = xlsx.utils.sheet_to_json(needsWorksheet, { range: 3 });

    const sampleRowNeeds = needsExcelData[0]; // Renamed to avoid syntax error
    if (sampleRowNeeds && !sampleRowNeeds['ID / Clave']) {
        throw new Error("Column 'ID / Clave' not found. Check if header is at Row 4.");
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create lookups for faster processing
        const dbSchools = await getSchoolsFromDB(client);
        const dbSchoolsMap = new Map(dbSchools.map(item => [item.cct, item]));
        const excelSchoolsMap = new Map(schoolsExcelData.map(item => [item.CCT, item]));
        
        // Helper Map to find CCT by Name (for the Needs sync)
        const excelSchoolsByName = new Map(schoolsExcelData.map(item => [item['Nombre de la Escuela'], item.CCT]));

        const schoolsToInsert = schoolsExcelData.filter(item => item.CCT && !dbSchoolsMap.has(item.CCT));
        const schoolsToUpdate = schoolsExcelData.filter(item => item.CCT && dbSchoolsMap.has(item.CCT));
        const schoolsToDelete = dbSchools.filter(item => !excelSchoolsMap.has(item.cct));

        // --- Execute Schools Sync ---
        for (const item of schoolsToInsert) {
            await client.query(
                'INSERT INTO schools(municipality, name, personnel, students, level, cct, mode, shift, sostenimiento, address, location) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [item.Municipio, item['Nombre de la Escuela'], item['Personal escolar'], item.Estudiantes, item['Nivel ed.'], item.CCT, item.Modalidad, item.Turno, item.Sostenimiento, item.Dirección, item.Ubicación]
            );
        }

        for (const item of schoolsToUpdate) {
            await client.query(
                'UPDATE schools SET municipality = $1, name = $2, personnel = $3, students = $4, level = $5, mode = $6, shift = $7, sostenimiento = $8, address = $9, location = $10 WHERE cct = $11',
                [item.Municipio, item['Nombre de la Escuela'], item['Personal escolar'], item.Estudiantes, item['Nivel ed.'], item.Modalidad, item.Turno, item.Sostenimiento, item.Dirección, item.Ubicación, item.CCT]
            );
        }

        for (const item of schoolsToDelete) {
            await client.query('DELETE FROM schools_needs WHERE school_cct = $1', [item.cct]);
            await client.query('DELETE FROM schools WHERE cct = $1', [item.cct]);
        }

        // --- Sync Needs ---
        const dbNeeds = await getNeedsFromDB(client);
        const dbNeedsMap = new Map(dbNeeds.map(item => [item.id_excel, item]));
        const excelNeedsMap = new Map(needsExcelData.map(item => [item['ID / Clave'], item]));

        const needsToInsert = needsExcelData.filter(item => item['ID / Clave'] && !dbNeedsMap.has(item['ID / Clave']));
        const needsToUpdate = needsExcelData.filter(item => item['ID / Clave'] && dbNeedsMap.has(item['ID / Clave']));
        const needsToDelete = dbNeeds.filter(item => !excelNeedsMap.has(item.id_excel));

        for (const item of needsToInsert) {
            const cct = excelSchoolsByName.get(item.Escuela);
            if (!cct) continue;

            await client.query(
                'INSERT INTO schools_needs(id_excel, school_cct, municipality, school_name, category, subcategory, proposal, quantity, unit, status, details) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
                [item['ID / Clave'], cct, item.Municipio, item.Escuela, item.Categoría, item.Subcategoría, item.Propuesta, item.Cantidad, item.Unidad, item.Estado, item.Detalles]
            );
        }

        for (const item of needsToUpdate) {
            const cct = excelSchoolsByName.get(item.Escuela);
            if (!cct) continue;

            await client.query(
                'UPDATE schools_needs SET school_cct = $1, municipality = $2, school_name = $3, category = $4, subcategory = $5, proposal = $6, quantity = $7, unit = $8, status = $9, details = $10 WHERE id_excel = $11',
                [cct, item.Municipio, item.Escuela, item.Categoría, item.Subcategoría, item.Propuesta, item.Cantidad, item.Unidad, item.Estado, item.Detalles, item['ID / Clave']]
            );
        }

        for (const item of needsToDelete) {
            await client.query('DELETE FROM schools_needs WHERE id_excel = $1', [item.id_excel]);
        }

        await client.query('COMMIT');

        return {
            schools: { inserted: schoolsToInsert.length, updated: schoolsToUpdate.length, deleted: schoolsToDelete.length },
            needs: { inserted: needsToInsert.length, updated: needsToUpdate.length, deleted: needsToDelete.length }
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error during sync:", error);
        throw error; 
    } finally {
        client.release();
    }
}