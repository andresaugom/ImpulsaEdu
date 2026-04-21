const ExcelJS = require('exceljs');

const exportFullDatabaseToExcel = async (allData) => {
    try {
        const workbook = new ExcelJS.Workbook();
        
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { 
                type: 'pattern', 
                pattern: 'solid', 
                fgColor: { argb: 'FF2A6325' } 
            },
            alignment: { horizontal: 'center', vertical: 'middle' }
        };

        // --- Hoja 1: Necesidades ---
        const wsNeeds = workbook.addWorksheet('Necesidades');
        
        wsNeeds.getRow(2).getCell(1).value = 'NECESIDADES DE ESCUELAS';
        wsNeeds.getRow(2).getCell(1).font = { bold: true, size: 14 };

        wsNeeds.columns = [
            { key: 'municipio', width: 20 }, 
            { key: 'escuela', width: 30 },
            { key: 'categoria', width: 20 }, 
            { key: 'subcategoria', width: 25 },
            { key: 'propuesta', width: 40 }, 
            { key: 'cantidad', width: 10 },
            { key: 'unidad', width: 15 }, 
            { key: 'estado', width: 15 }, 
            { key: 'detalles', width: 30 }
        ];

        const needsHeader = wsNeeds.getRow(4);
        const labelsNeeds = ['Municipio', 'Escuela', 'Categoría', 'Subcategoría', 'Propuesta', 'Cantidad', 'Unidad', 'Estado', 'Detalles'];
        needsHeader.values = labelsNeeds;
        
        labelsNeeds.forEach((_, i) => {
            needsHeader.getCell(i + 1).style = headerStyle;
        });

        allData.needs.forEach(item => {
            wsNeeds.addRow([
                item.municipio, 
                item.escuela, 
                item.categoria, 
                item.subcategoria, 
                item.propuesta, 
                item.cantidad, 
                item.unidad, 
                item.estado, 
                item.detalles
            ]);
        });


        // --- Hoja 2: Datos de las escuelas ---
        const wsSchools = workbook.addWorksheet('Datos de las escuelas');
        
        wsSchools.getRow(2).getCell(1).value = 'DATOS DE ESCUELAS';
        wsSchools.getRow(2).getCell(1).font = { bold: true, size: 14 };
        
        wsSchools.getRow(3).getCell(1).value = 'CICLO 2025-2026';
        wsSchools.getRow(3).getCell(1).font = { bold: true, size: 11 };

        wsSchools.columns = [
            { key: 'muni', width: 20 }, { key: 'plantel', width: 25 }, { key: 'esc', width: 25 },
            { key: 'personal', width: 18 }, { key: 'estud', width: 12 }, { key: 'nivel', width: 15 },
            { key: 'cct', width: 15 }, { key: 'mod', width: 15 }, { key: 'turno', width: 12 },
            { key: 'sost', width: 15 }, { key: 'dir', width: 40 }, { key: 'map', width: 30 }
        ];

        const schoolsHeader = wsSchools.getRow(5);
        const labelsSchools = ['Municipio', 'Plantel', 'Escuela', 'Personal escolar', 'Estudiantes', 'Nivel ed.', 'CCT', 'Modalidad', 'Turno', 'Sostenimiento', 'Dirección', 'Ubicación'];
        schoolsHeader.values = labelsSchools;
        
        labelsSchools.forEach((_, i) => {
            schoolsHeader.getCell(i + 1).style = headerStyle;
        });

        allData.schools.forEach(s => {
            wsSchools.addRow([
                s.municipio, s.plantel, s.escuela, s.personal_escolar, s.estudiantes, 
                s.nivel_educativo, s.cct, s.modalidad, s.turno, s.sostenimiento, 
                s.direccion, s.ubicacion_mapa
            ]);
        });

        return await workbook.xlsx.writeBuffer();
    } catch (error) {
        throw new Error(`Error en la generación de Excel: ${error.message}`);
    }
};

module.exports = exportFullDatabaseToExcel;