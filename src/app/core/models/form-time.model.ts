export interface FormTime {
  formId?: string;
  tempoExecucao: string;
  tempoTolerancia?: string;
  tempoAntecependem?: string;
}

export interface CreateFormTime {
  formId?: string;
  tempoExecucao: string | null;
  tempoTolerancia?: string | null;
  tempoAntecependem?: string | null;
}

export interface UpdateFormTime {
  formId?: string;
  tempoExecucao?: string | null;
  tempoTolerancia?: string | null;
  tempoAntecependem?: string | null;
}
