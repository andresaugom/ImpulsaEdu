import React, { useState } from "react";
import { Box } from "@mui/material";
import EditableTable from "@/components/ReusableTable/ReusableTable";
import { ColumnDefinition, EditableField } from "@/app/uitools/interfaces";

export interface School {
    id: string;
    name: string;
    location: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    status: "Active" | "Pending" | "Archived";
    progress: number;
    notes?: string;
  }


const initialSchools: School[] = [
    {
      id: "1",
      name: "Escuela Primaria Benito Juárez",
      location: "Guadalajara, Jalisco",
      contactName: "María López",
      contactEmail: "maria.lopez@escuela.mx",
      contactPhone: "33 1234 5678",
      status: "Active",
      progress: 75,
      notes: "Waiting for final donation batch",
    },
    {
      id: "2",
      name: "Escuela Rural San Pedro",
      location: "Zapopan, Jalisco",
      contactName: "Juan Pérez",
      contactEmail: "juan.perez@escuela.mx",
      contactPhone: "33 8765 4321",
      status: "Pending",
      progress: 30,
    },
    {
      id: "3",
      name: "Colegio Independencia",
      location: "Tlaquepaque, Jalisco",
      contactName: "Ana Torres",
      contactEmail: "ana.torres@colegio.mx",
      contactPhone: "33 9988 7766",
      status: "Active",
      progress: 55,
    },
  ];

const columns: ColumnDefinition<School>[] = [
    { key: "name", label: "School Name", sortable: true },
  
    { key: "location", label: "Location", sortable: true },
  
    { key: "contactName", label: "Contacto" },
  
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterOptions: ["Active", "Pending", "Archived"],
    },
  
    {
      key: "progress",
      label: "Progress (%)",
      sortable: true,
      render: (value) => `${value}%`,
    },
  ];

const editableFields: EditableField<School>[] = [
    { key: "name", label: "School Name" },
  
    { key: "location", label: "Location" },
  
    { key: "contactName", label: "Contact Person" },
  
    { key: "contactEmail", label: "Contact Email", type: "email" },
  
    { key: "contactPhone", label: "Contact Phone" },
  
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Pending", label: "Pending" },
        { value: "Archived", label: "Archived" },
      ],
    },
  
    {
      key: "progress",
      label: "Progress (%)",
      type: "number",
    },
  
    {
      key: "notes",
      label: "Notes",
      multiline: true,
    },
  ];

export default function TablaEscuelas() {
    const [schools, setSchools] = useState<School[]>(initialSchools);
  
    const handleSave = (updated: School, isNew?: boolean) => {
      setSchools((prev) => {
        if (isNew) {
          return [{ ...updated, id: `school-${Date.now()}` }, ...prev];
        }
  
        return prev.map((s) => (s.id === updated.id ? updated : s));
      });
    };
  
    const handleArchive = (deletedSchool: School) => {
        setSchools((prev) =>
          prev.map((s) =>
            s.id === deletedSchool.id ? { ...s, status: "Archived" } : s
          )
        );
      };
  
    return (
      <Box sx={{ mt: 4 }}>
        <EditableTable
          title="Registered Schools"
          data={schools}
          columns={columns}
          editableFields={editableFields}
          searchPlaceholder="Search school by name, location, or contact"
          onSave={handleSave}
          onDelete={handleArchive}
        />
      </Box>
    );
  }