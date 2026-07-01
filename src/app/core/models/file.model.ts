export interface File {
  id: string;
  nome: string;
  nomeOriginal: string;
  extensao: string;
  mimeType: string;
  tamanho: number;
  conteudo: string;
  hash: string;
  status: number;
  dataCriacao: Date;
  dataAlteracao: Date;
}

export interface CreateFileDTO {
  nome: string;
  nomeOriginal?: string;
  extensao?: string;
  mimeType?: string;
  tamanho?: number;
  conteudo?: string;
  hash?: string;
  status?: number;
}

export interface UpdateFileDTO {
  nome?: string;
  nomeOriginal?: string;
  extensao?: string;
  mimeType?: string;
  tamanho?: number;
  conteudo?: string;
  hash?: string;
  status?: number;
}
