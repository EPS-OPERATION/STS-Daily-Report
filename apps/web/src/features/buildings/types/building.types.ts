export interface Building {
  id: string;
  code: string;
  name: string;
  nameTh: string | null;
  sortOrder: number;
}

// Admin list (/buildings): hidden buildings included, with how many report activities use each.
export interface ManagedBuilding extends Building {
  status: "active" | "inactive";
  usage: number;
}

export interface BuildingInput {
  code: string;
  name: string;
  nameTh: string | null;
}
