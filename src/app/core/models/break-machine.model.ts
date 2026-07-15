export interface BreakMachine {
  id: string;
  machineId: string;
  userId: string;
  horaInicio: Date;
  horaFim?: Date  | null;
  motivo: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateBreakMachine {
  machineId: string;
  userId: string;  
  horaInicio: Date | string;
  horaFim?: Date | string | null;
  motivo?: string;
  status?: number;
}

export interface UpdateBreakMachine {
  machineId?: string;
  userId?: string;  
  horaInicio: Date | string;
  horaFim?: Date | string | null;
  motivo?: string;
  status?: number;
}


