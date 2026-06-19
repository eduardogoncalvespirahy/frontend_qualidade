export interface Form { // Formularios
  id: string;
  sectionId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface FormCreate {
  sectionId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface FormUpdate {
  sectionId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
