export interface LimitAnswer { //parametros/perguntas
  id: string;
  answerId: string;
  limitMax?: string | null;
  limitMin?: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface LimitAnswerCreate {
  answerId: string;
  limitMax?: string | null;
  limitMin?: string | null;
  status?: number;
}

export interface LimitAnswerUpdate {
  answerId: string;
  limitMax?: string | null;
  limitMin?: string | null;
  status?: number;
}
