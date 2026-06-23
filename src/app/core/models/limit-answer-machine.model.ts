export interface LimitAnswerMachine { //parametros/perguntas
  id: string;
  machineId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface LimitAnswerMachineCreate {
  machineId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface LimitAnswerMachineUpdate {
  machineId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
