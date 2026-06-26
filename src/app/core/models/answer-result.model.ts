export interface AnswerResult {
  id: string;
  answerId: string;
  resposta: string;
  limitsAnswerId: string | null;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface AnswerResultCreate {
  answerId: string;
  resposta: string;
  limitsAnswerId?: string | null;
}
