export interface SchoolNeed {
  id: number;
  itemName: string;
  quantity: number;
  unit: string;
  amount: number;
}

export interface SchoolStructure {
  id: number;
  region: string;
  school: string;
  name: string;
  employees: string;
  students: string;
  level: string;
  cct: string;
  mode: string;
  shift: string;
  address: string;
  location: string;
  type: "Publica" | "Privada";
  category: string;
  notes: string;
  progress: number;
  needs: SchoolNeed[];
}
