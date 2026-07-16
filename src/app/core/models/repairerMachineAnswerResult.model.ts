export interface RepairerMachineAnswerResult {
  machineAnswerResultId: string;
  userId: string;
  dataCriacao: Date;
  observacao?: string;
}

export interface RepairerMachineAnswerResultCreate {
  machineAnswerResultId: string;
  userId: string;
  observacao?: string;
}

export interface RepairerMachineAnswerResultUpdate {
  machineAnswerResultId?: string;
  userId?: string;
  observacao?: string;
}
