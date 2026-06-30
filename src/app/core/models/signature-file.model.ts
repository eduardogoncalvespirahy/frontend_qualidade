export interface SignatureFile {
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

export interface SignatureFileCreate {
  nome: string;
  nomeOriginal?: string;
  extensao?: string;
  mimeType?: string;
  tamanho?: number;
  conteudo?: string;
  hash?: string;
  status?: number;
}
