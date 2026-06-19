export interface Machine {
  id: string;
  formId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface MachineCreate {
  formId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface MachineUpdate {
  formId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
