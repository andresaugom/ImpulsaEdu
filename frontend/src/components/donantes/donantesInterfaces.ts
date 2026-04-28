export interface Donor {
    id: string;
    name: string;
    region: string;
    donor_type: 'Fisica' | 'Moral';
    email: string | null;
    phone: string | null;
    totalDonations: number;
    status: 'active' | 'inactive';
  }