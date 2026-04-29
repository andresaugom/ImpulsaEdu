export interface Donor {
  id: number;
  name: string;
  type: "individual" | "corporate";
  email: string;
  phone: string;
  totalDonations: number;
  status: "active" | "inactive";
}
