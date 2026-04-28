import { Donor } from "./donantesInterfaces";

export const mockDonors: Donor[] = [
  {
    id: "1",
    name: "María García López",
    region: "Guadalajara",
    donor_type: "Fisica",
    email: "maria@ejemplo.com",
    phone: "+52 (33) 1234-5678",
    totalDonations: 3500,
    status: "active",
  },
  {
    id: "2",
    name: "Corporativo Educativo Jalisco",
    region: "Zapopan",
    donor_type: "Moral",
    email: "contacto@corporativo.com",
    phone: "+52 (33) 9876-5432",
    totalDonations: 15000,
    status: "active",
  },
  {
    id: "3",
    name: "Carlos Hernández Rodríguez",
    region: "Tlaquepaque",
    donor_type: "Fisica",
    email: "carlos@ejemplo.com",
    phone: "+52 (33) 5555-1234",
    totalDonations: 2000,
    status: "inactive",
  },
];
