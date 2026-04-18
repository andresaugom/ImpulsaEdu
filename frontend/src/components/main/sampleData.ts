// Mock data for schools
export const mockSchools = [
  {
    id: 1,
    name: "Escuela Primaria A",
    region: "Guadalajara",
    status: "Activa",
    progress: 65,
    statusColor: "success",
  },
  {
    id: 2,
    name: "Escuela Secundaria B",
    region: "Zapopan",
    status: "En Progreso",
    progress: 45,
    statusColor: "warning",
  },
  {
    id: 3,
    name: "Escuela Pública C",
    region: "Tlaquepaque",
    status: "Completada",
    progress: 100,
    statusColor: "success",
  },
];

// Mock data for donations
export const mockDonations = [
  {
    id: "#DON-001",
    donor: "Corporativo Educativo Jalisco",
    school: "Escuela Primaria A",
    type: "Material",
    status: "En Transporte",
    value: "$1,500",
  },
  {
    id: "#DON-002",
    donor: "Fundación México Solidario",
    school: "Escuela Secundaria B",
    type: "Monetaria",
    status: "Aprobada",
    value: "$5,000",
  },
  {
    id: "#DON-003",
    donor: "Asociación Educadores Unidos",
    school: "Escuela Pública C",
    type: "Material",
    status: "Entregada",
    value: "$800",
  },
];
