export interface InputUnits {
  id: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}
export interface InputUnitsCreate {
  nome?: string;
  descricao?: string | null;
  status?: number;
  dataCriacao?: Date;
  dataAlteracao?: Date;
}
export interface InputUnitsUpdate {
  nome?: string;
  descricao?: string | null;
  status?: number;
  dataCriacao?: Date;
  dataAlteracao?: Date;
}