export interface FormTime {
  formId: string;
  tempoExecucao: string;
  tempoTolerancia: string;
  tempoAntecedencia: string;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateFormTime {
  formId: string;
  tempoExecucao: string;
  tempoTolerancia: string;
  tempoAntecedencia?: string;
}

export interface UpdateFormTime {
  tempoExecucao?: string;
  tempoTolerancia?: string;
  tempoAntecedencia?: string;
}
