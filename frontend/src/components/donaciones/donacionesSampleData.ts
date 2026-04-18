import { Donation } from "./donacionesInterfaces";

export const mockDonations: Donation[] = [
    {
      id: '#DN001',
      donor: 'María García López',
      school: 'Escuela Primaria San José',
      type: 'material',
      deliveryMode: 'Entrega Directa',
      status: 'delivered',
    },
    {
      id: '#DN002',
      donor: 'Carlos Hernández Rodríguez',
      school: 'Escuela Secundaria Morelos',
      type: 'monetary',
      deliveryMode: 'Transferencia Bancaria',
      status: 'pending',
    },
    {
      id: '#DN003',
      donor: 'Corporativo Educativo Jalisco',
      school: 'Escuela Técnica Regional',
      type: 'material',
      deliveryMode: 'Entrega a Domicilio',
      status: 'delivered',
    },
  ];