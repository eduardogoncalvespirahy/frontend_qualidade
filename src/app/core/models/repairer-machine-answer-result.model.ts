export interface RepairerMachineAnswerResult {
  machineAnswerResultId: string;
  userId: string;
  dataCriacao: Date;
}

export interface CreateRepairerMachineAnswerResult {
  machineAnswerResultId: string;
  userId: string;
}

export interface UpdateRepairerMachineAnswerResult {
  machineAnswerResultId?: string;
  userId?: string;
}