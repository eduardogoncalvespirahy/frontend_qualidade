export interface LimitAnswer { //parametros/perguntas
  id: string;
  machineId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface LimitAnswerCreate {
  machineId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface LimitAnswerUpdate {
  machineId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
