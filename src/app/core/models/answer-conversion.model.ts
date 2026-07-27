export interface AnswerConversion {
  answerId: string;
  conversionId: string;
  dataCriacao: Date;
  dataAlteracao: Date;
}
export interface AnswerConversionCreate {
  answerId: string;
  conversionId: string;
}
export interface AnswerConversionUpdate {
  conversionId?: string;
}
