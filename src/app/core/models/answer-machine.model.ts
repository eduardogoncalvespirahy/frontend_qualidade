export interface AnswerMachine { //parametros/perguntas
  id: string;
  machineId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface AnswerMachineCreate {
  machineId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface AnswerMachineUpdate {
  machineId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
