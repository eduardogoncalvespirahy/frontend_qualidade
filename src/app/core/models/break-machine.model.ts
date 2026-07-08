export interface BreakMachine {
  id: string;
  machineId: string;
  horaInicio: Date;
  horaFim?: Date  | null;
  motivo: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateBreakMachine {
  machineId: string;
  horaInicio: Date | string;
  horaFim?: Date | string | null;
  motivo?: string;
  status?: number;
}

export interface UpdateBreakMachine {
  machineId?: string;
  horaInicio: Date | string;
  horaFim?: Date | string | null;
  motivo?: string;
  status?: number;
}


