export interface Session { // Sessão
  id: string;
  credentialId: string;
  refreshtoken: string;
  expira: Date;
  revogado: boolean;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface SessionCreate {
  credentialId: string;
  refreshtoken: string;
  expira: string | Date;
}
