const xlsx = require('xlsx');
const pool = require('../db/pool');

async function syncExcelToDB(filePath) {
    const workbook = xlsx.readFile(filePath);
    
    // --- Sheet: "Datos de las escuelas" ---
    const schoolsSheetName = "Datos de las escuelas";
    const schoolsWorksheet = workbook.Sheets[schoolsSheetName];
    if (!schoolsWorksheet) {
        throw new Error(`Sheet "${schoolsSheetName}" not found.`);
    }
    const schoolsExcelData = xlsx.utils.sheet_to_json(schoolsWorksheet, { range: 4 });

    const sampleRowSchools = schoolsExcelData[0];
    if (sampleRowSchools && !sampleRowSchools['CCT']) {
        throw new Error("Column 'CCT' not found. Check if header is at Row 5.");
    }

    // --- Sheet: "Necesidades" ---
    const needsSheetName = "Necesidades";
    const needsWorksheet = workbook.Sheets[needsSheetName];
    if (!needsWorksheet) {
        throw new Error(`Sheet "${needsSheetName}" not found.`);
    }
    const needsExcelData = xlsx.utils.sheet_to_json(needsWorksheet, { range: 3 });

    const sampleRowNeeds = needsExcelData[0];
    if (sampleRowNeeds && !sampleRowNeeds['Propuesta']) {
        throw new Error("Column 'Propuesta' not found. Check if header is at Row 4.");
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Extract db lookups
        const { rows: dbSchools } = await client.query('SELECT id, region, school, name, cct FROM schools');
        const dbSchoolsMap = new Map(dbSchools.map(item => [item.cct, item]));
        const excelSchoolsMap = new Map(schoolsExcelData.map(item => [item.CCT, item]));
        
        const excelSchoolsByName = new Map(schoolsExcelData.map(item => [item['Nombre de la Escuela'], item.CCT]));

        // Filter valid ones
        const schoolsToInsert = schoolsExcelData.filter(item => item.CCT && !dbSchoolsMap.has(item.CCT));
        const schoolsToUpdate = schoolsExcelData.filter(item => item.CCT && dbSchoolsMap.has(item.CCT));
        
        // Correct deletion logic
        const schoolsToDelete = dbSchools.filter(item => {
            return item.cct && !excelSchoolsMap.has(item.cct);
        });

        // --- Execute Schools Sync ---
        for (const item of schoolsToInsert) {
            await client.query(
                `INSERT INTO schools(region, school, name, employees, students, level, cct, mode, shift, address, location, category, goal) 
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    item.Municipio || 'N/A', 
                    item['Nombre de la Escuela'] || 'N/A', 
                    item['Nombre de la Escuela'] || 'N/A', 
                    item['Personal escolar'] || 0, 
                    item.Estudiantes || 0, 
                    item['Nivel ed.'] || 'Primaria', 
                    item.CCT, 
                    item.Modalidad || 'Otro', 
                    item.Turno || 'Matutino', 
                    item.Dirección || 'N/A', 
                    item.Ubicación || 'N/A', 
                    item.Sostenimiento || 'Estatal', 
                    1000.00
                ]
            );
        }

        for (const item of schoolsToUpdate) {
            await client.query(
                `UPDATE schools SET region = $1, school = $2, name = $3, employees = $4, students = $5, level = $6, mode = $7, shift = $8, address = $9, location = $10, category = $11 
                 WHERE cct = $12`,
                [
                    item.Municipio || 'N/A', 
                    item['Nombre de la Escuela'] || 'N/A', 
                    item['Nombre de la Escuela'] || 'N/A', 
                    item['Personal escolar'] || 0, 
                    item.Estudiantes || 0, 
                    item['Nivel ed.'] || 'Primaria', 
                    item.Modalidad || 'Otro', 
                    item.Turno || 'Matutino', 
                    item.Dirección || 'N/A', 
                    item.Ubicación || 'N/A', 
                    item.Sostenimiento || 'Estatal',
                    item.CCT
                ]
            );
        }

        for (const dbSchool of schoolsToDelete) {
            if (dbSchool.id) {
                await client.query('DELETE FROM schools_needs WHERE school_id = $1', [dbSchool.id]);
                await client.query('DELETE FROM schools WHERE id = $1', [dbSchool.id]);
            }
        }

        const { rows: updatedDbSchools } = await client.query('SELECT id, cct FROM schools');
        const cctToIdMap = new Map(updatedDbSchools.map(s => [s.cct, s.id]));

        await client.query('DELETE FROM schools_needs');

        let needsInserted = 0;
        for (const item of needsExcelData) {
            const cct = excelSchoolsByName.get(item.Escuela);
            if (!cct) continue;
            
            const schoolId = cctToIdMap.get(cct);
            if (!schoolId) continue;

            const quantity = parseInt(item.Cantidad) || 1;
            const amount = 100.00;
            const category = item.Categoria || 'Sin categoría';
            // FIX: Added subcategory to avoid NOT NULL constraint violation
            const subcategory = item.Subcategoria || 'General'; 
            const itemName = item.Propuesta || 'Unknown Item';
            const unit = item.Unidad || 'Pza';

            await client.query(
                `INSERT INTO schools_needs(school_id, category, subcategory, item_name, quantity, unit, amount) 
                 VALUES($1, $2, $3, $4, $5, $6, $7)`,
                [schoolId, category, subcategory, itemName, quantity, unit, amount]
            );
            needsInserted++;
        }

        await client.query('COMMIT');

        return {
            schools: { inserted: schoolsToInsert.length, updated: schoolsToUpdate.length, deleted: schoolsToDelete.length },
            needs: { inserted: needsInserted, updated: 0, deleted: 'all_recreated' }
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error during sync:", error);
        throw error; 
    } finally {
        client.release();
    }
}

module.exports = {
    syncExcelToDB
};