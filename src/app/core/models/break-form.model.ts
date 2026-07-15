export interface BreakForm {
  id: string;
  formId: string;
  userId: string;  
  horaInicio: Date;
  horaFim: Date | null;
  motivo: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateBreakForm {
  formId: string;
  userId: string;  
  horaInicio: Date;
  horaFim?: Date | null;
  motivo?: string;
  status?: number;
}

export interface UpdateBreakForm {
  formId?: string;
  userId?: string;  
  horaInicio: Date;
  horaFim?: Date | null;
  motivo?: string;
  status?: number;
}
