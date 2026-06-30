export interface Control {
  id: string;
  formId: string;
  userId: string;
  fileId: string;
  observacao: string | null;
  dataEmissao: Date;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface ControlCreate {
  formId: string;
  userId: string;
  fileId: string;  
  observacao?: string | null;
  dataEmissao?: Date;
}

export interface ControlUpdate {
  formId?: string;
  userId: string;
  fileId: string;  
  observacao?: string | null;
  dataEmissao?: Date;  
}
