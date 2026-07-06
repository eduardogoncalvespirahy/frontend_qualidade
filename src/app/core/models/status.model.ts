export interface Status {
  id: string;
  nome: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface StatusCreate {
  nome: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface StatusUpdate {
  nome: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}
