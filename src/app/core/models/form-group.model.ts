export interface FormGroups {
  id: string;
  sectionId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface FormGroupsCreate {
  sectionId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}

export interface FormGroupsUpdate {
  sectionId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
