export interface FormTime {
  formId: string;
  tempoExecucao: string; // time "HH:MM:SS" (NOT NULL)
  tempoTolerancia: string; // time "HH:MM:SS" (NOT NULL)
  tempoAntecedencia: string; // time "HH:MM:SS" (default 00:05:00)
  dataCriacao: Date | string;
  dataAlteracao: Date | string;
}

export interface CreateFormTime {
  formId: string;
  tempoExecucao: string; // "HH:MM:SS"
  tempoTolerancia: string; // "HH:MM:SS"
  tempoAntecedencia?: string; // opcional — banco assume 00:05:00
}

export interface UpdateFormTime {
  tempoExecucao?: string;
  tempoTolerancia?: string;
  tempoAntecedencia?: string;
}
