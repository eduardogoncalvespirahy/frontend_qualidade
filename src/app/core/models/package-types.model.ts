export interface PackageTypes {
  id: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}
export interface PackageTypesCreate {
  nome?: string;
  descricao?: string | null;
  status?: number;
  dataCriacao?: Date;
  dataAlteracao?: Date;
}
export interface PackageTypesUpdate {
  nome?: string;
  descricao?: string | null;
  status?: number;
  dataCriacao?: Date;
  dataAlteracao?: Date;
}