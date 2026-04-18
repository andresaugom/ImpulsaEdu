import { Donor } from "./donantesInterfaces";

export const mockDonors: Donor[] = [
  {
    id: "1",
    name: "María García López",
    type: "individual",
    email: "maria@ejemplo.com",
    phone: "+52 (33) 1234-5678",
    totalDonations: 3500,
    status: "active",
  },
  {
    id: "2",
    name: "Corporativo Educativo Jalisco",
    type: "corporate",
    email: "contacto@corporativo.com",
    phone: "+52 (33) 9876-5432",
    totalDonations: 15000,
    status: "active",
  },
  {
    id: "3",
    name: "Carlos Hernández Rodríguez",
    type: "individual",
    email: "carlos@ejemplo.com",
    phone: "+52 (33) 5555-1234",
    totalDonations: 2000,
    status: "inactive",
  },
];
