export interface BreakForm {
  id: string;
  formId: string;
  horaInicio: Date;
  horaFim: Date | null;
  motivo: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateBreakForm {
  formId: string;
  horaInicio: Date;
  horaFim?: Date | null;
  motivo?: string;
  status?: number;
}

export interface UpdateBreakForm {
  formId?: string;
  horaInicio: Date;
  horaFim?: Date | null;
  motivo?: string;
  status?: number;
}
