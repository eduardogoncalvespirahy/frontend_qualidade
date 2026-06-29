export interface AnswerGroups {
  id: string;
  formId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface AnswerGroupsCreate {
  formId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}

export interface AnswerGroupsUpdate {
  formId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
