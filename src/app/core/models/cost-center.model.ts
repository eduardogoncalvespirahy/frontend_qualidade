export interface CostCenter { //centro de custo - senior
  id: string;
  name: string | null;
}

export interface CostCenterCreate {
  id: string;
  name?: string | null;
}

export interface CostCenterUpdate {
  name?: string | null;
}
