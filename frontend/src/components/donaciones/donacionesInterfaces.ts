export interface Donation {
    id: string;
    donor: string;
    school: string;
    type: 'material' | 'monetary';
    deliveryMode: string;
    status: 'pending' | 'delivered' | 'cancelled';
  }