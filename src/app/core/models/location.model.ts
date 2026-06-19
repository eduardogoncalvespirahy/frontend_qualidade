export interface Location { //local
  id: string;
  employerId: string;
  nome: string;
  descricao: string | null;
  status: number;
}


export interface LocationCreate {
  employerId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface LocationUpdate {
  employerId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}