export interface Role { // Regra
  id: string;
  systemId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface RoleCreate {
  systemId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface RoleUpdate {
  systemId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
