export interface CategorieAnswer {
  id: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CategorieAnswerCreate {
  nome?: string;
  descricao?: string | null;
  status?: number;
}

export interface CategorieAnswerUpdate {
  nome?: string;
  descricao?: string | null;
  status?: number;
}
