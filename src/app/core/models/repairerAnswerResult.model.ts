export interface RepairerAnswerResult {
  answerResultId: string;
  userId: string;
  dataCriacao: Date;
}

export interface RepairerAnswerResultCreate {
  answerResultId: string;
  userId: string;
}

export interface RepairerAnswerResultUpdate {
  answerResultId?: string;
  userId?: string;
}
