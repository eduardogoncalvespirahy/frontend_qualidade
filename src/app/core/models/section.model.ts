export interface Section { //seção
  id: string;
  employerId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface SectionCreate {
  employerId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface SectionUpdate {
  employerId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
