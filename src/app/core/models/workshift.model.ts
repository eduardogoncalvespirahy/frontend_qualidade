export interface Workshift { //Modelo de Trabalho
  id: string;
  description: string | null;
}

export interface WorkshiftCreate {
  id: string;
  description?: string | null;
}

export interface WorkshiftUpdate {
  description?: string | null;
}
