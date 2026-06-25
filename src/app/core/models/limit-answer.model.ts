export interface LimitAnswer { //parametros/perguntas
  id: string;
  answerId: string;
  limit_max?: string | null;
  limit_min?: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface LimitAnswerCreate {
  answerId: string;
  limit_max?: string | null;
  limit_min?: string | null;
  status?: number;
}

export interface LimitAnswerUpdate {
  answerId?: string;
  limit_max?: string | null;
  limit_min?: string | null;
  status?: number;
}
