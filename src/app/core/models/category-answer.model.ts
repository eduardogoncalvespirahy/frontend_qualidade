export interface Category { //parametros/perguntas
  id: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CategoryCreate {
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface CategoryUpdate {
  nome?: string;
  descricao?: string | null;
  status?: number;
}
