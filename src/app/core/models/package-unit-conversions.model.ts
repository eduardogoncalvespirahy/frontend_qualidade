export interface PackageUnitConversion {
  id: string;
  packageTypeId: string;
  inputUnitId: string;
  quantidadePorSaco: number;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
  ordem:number;
}
export interface PackageUnitConversionCreate {
  packageTypeId?: string;
  inputUnitId?: string;
  quantidadePorSaco?: number;
  descricao?: string | null;
  status?: number;
  dataCriacao?: Date;
  dataAlteracao?: Date;
  ordem?:number;
}
export interface PackageUnitConversionUpdate {
  packageTypeId?: string;
  inputUnitId?: string;
  quantidadePorSaco?: number;
  descricao?: string | null;
  status?: number;
  dataCriacao?: Date;
  dataAlteracao?: Date;
  ordem?:number;
}