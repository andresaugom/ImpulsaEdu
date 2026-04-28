export interface SchoolNeed {
  id: number;
  itemName: string;
  quantity: number;
  unit: string;
  amount: number;
}

export interface SchoolStructure {
  id: string;
  region: string;
  school: string;
  name: string;
  employees: number;
  students: number;
  level: string;
  cct: string;
  mode: string;
  shift: string;
  address: string;
  location: string;
  category: 'Estatal' | 'Federal' | 'Federalizado';
  description: string | null;
  goal: number;
  progress: number;
  progress_pct: number;
  status: 'active' | 'archived';
  needs: SchoolNeed[];
}
