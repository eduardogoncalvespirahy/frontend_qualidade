export interface Answer { //parametros/perguntas
  id: string;
  formId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
  categoryId: number;
}

export interface AnswerCreate {
  formId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
  categoryId: number;
}

export interface AnswerUpdate {
  formId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
  categoryId?: number;
}
