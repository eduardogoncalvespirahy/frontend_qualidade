export interface AnswerGroupItems {
  answerGroupId: string;
  answerId: string;
  ordem: number;
}

export interface AnswerGroupItemsCreate {
  answerGroupId: string;
  answerId: string;
  ordem?: number;  
}

export interface AnswerGroupItemsUpdate {
  answerGroupId: string;
  answerId: string;
  ordem?: number;  
}