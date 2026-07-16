export interface RepairerAnswerResult {
  answerResultId: string;
  userId: string;
  dataCriacao: Date;
  observacao?: string;
}

export interface RepairerAnswerResultCreate {
  answerResultId: string;
  userId: string;
  observacao?: string;
}

export interface RepairerAnswerResultUpdate {
  answerResultId?: string;
  userId?: string;
  observacao?: string;
}
