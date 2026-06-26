export interface AnswerResult {
  id: string,
  AnswerId: string;
  resposta: string;
  limitsAnswerId: string | null;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface AnswerResultCreate {
  AnswerId: string;
  resposta: string;
  limitsAnswerId?: string | null;
  dataCriacao?: Date;
  dataAlteracao?: Date;  
}

export interface AnswerResultUpdate {
  id: string;
  AnswerId: string;
  resposta: string;
  limitsAnswerId?: string | null;
  dataCriacao?: Date;
  dataAlteracao?: Date
}
