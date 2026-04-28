import { DonationStatus, DonationType, DonationItem } from '../../lib/donationsService';

export interface Donation {
    id: string;
    donor: string;
    school: string;
    donation_type: DonationType;
    status: DonationStatus;
    items: DonationItem[];
  }