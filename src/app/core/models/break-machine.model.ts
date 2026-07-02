export interface BreakMachine {
  id: string;
  machineId: string;
  horaInicio: Date;
  horaFim: Date;
  motivo: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateBreakMachine {
  machineId: string;
  horaInicio: Date;
  horaFim: Date;
  motivo?: string | null;
  status?: number;
}

export interface UpdateBreakMachine {
  machineId?: string;
  horaInicio: Date;
  horaFim: Date;  
  motivo?: string | null;
  status?: number;
}
