export interface WorkstationGroup { // Grupo de Trabalho
  id: string;
  name: string | null;
}

export interface WorkstationGroupCreate {
  id: string;
  name?: string | null;
}

export interface WorkstationGroupUpdate {
  name?: string | null;
}
