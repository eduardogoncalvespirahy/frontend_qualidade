export interface BreakForm {
  id: string;
  formId: string;
  horaInicio: Date;
  horaFim: Date;
  motivo: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateBreakForm {
  formId: string;
  horaInicio: Date;
  horaFim: Date;
  motivo?: string | null;
  status?: number;
}

export interface UpdateBreakForm {
  formId?: string;
  horaInicio: Date;
  horaFim?: Date | null;
  motivo?: string | null;
  status?: number;
}
