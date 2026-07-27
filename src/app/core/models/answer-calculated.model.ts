export interface AnswerCalculated {
  answerId: string;
  antesAnswerId: string;
  depoisAnswerId: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface AnswerCalculatedCreate {
  answerId: string;
  antesAnswerId: string;
  depoisAnswerId: string;
  status?: number;
}

export interface AnswerCalculatedUpdate {
  antesAnswerId?: string;
  depoisAnswerId?: string;
  status?: number;
}
