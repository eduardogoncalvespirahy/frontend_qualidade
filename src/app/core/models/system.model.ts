export interface System { // Sistema
  id: string;
  nome: string;
  descricao: string | null;
  url: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface SystemCreate {
  nome: string;
  descricao?: string | null;
  url?: string | null;
  status?: number;
}

export interface SystemUpdate {
  nome?: string;
  descricao?: string | null;
  url?: string | null;
  status?: number;
}
