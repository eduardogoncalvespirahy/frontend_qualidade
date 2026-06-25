export interface LimitAnswer { //parametros/perguntas
  id: string;
  answerId: string;
<<<<<<< Updated upstream
  limitMax?: string | null;
  limitMin?: string | null;
=======
  limit_max?: string | null;
  limit_min?: string | null;
>>>>>>> Stashed changes
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface LimitAnswerCreate {
  answerId: string;
<<<<<<< Updated upstream
  limitMax?: string | null;
  limitMin?: string | null;
=======
  limit_max?: string | null;
  limit_min?: string | null;
>>>>>>> Stashed changes
  status?: number;
}

export interface LimitAnswerUpdate {
<<<<<<< Updated upstream
  answerId: string;
  limitMax?: string | null;
  limitMin?: string | null;
=======
  answerId?: string;
  limit_max?: string | null;
  limit_min?: string | null;
>>>>>>> Stashed changes
  status?: number;
}
