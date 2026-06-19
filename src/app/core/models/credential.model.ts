export interface Credential { // credenciais
  id: string;
  userId: string;
  systemId: string;
  senhaHash: string;
  status: number;
  dataUltimoLogin: Date;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CredentialCreate {
  userId: string;
  systemId: string;
  senha: string;
  status?: number;
}

export interface CredentialUpdate {
  senha?: string;
  status?: number;
}
