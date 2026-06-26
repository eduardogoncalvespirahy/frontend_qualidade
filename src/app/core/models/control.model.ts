// Sessão de inspeção — gerada quando um usuário preenche um formulário
// Funciona como o "cabeçalho" da inspeção; as respostas ficam em answer_result
export interface Control {
  id: string;
  formId: string;
  userId: string;
  observacao: string | null;
  dataEmissao: Date;
  dataCriacao: Date;
  dataAlteracao: Date;
}

// Payload para abrir uma nova sessão de inspeção
export interface ControlCreate {
  formId: string;
  userId: string;
  observacao?: string | null;
  dataEmissao?: Date;
}

// Payload para atualizar uma sessão existente (ex: adicionar observação)
export interface ControlUpdate {
  observacao?: string | null;
  dataEmissao?: Date;
}
