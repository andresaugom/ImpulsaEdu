export interface Donor {
    id: string;
    name: string;
    type: 'individual' | 'corporate';
    email: string;
    phone: string;
    totalDonations: number;
    status: 'active' | 'inactive';
  }