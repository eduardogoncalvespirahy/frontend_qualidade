export interface FormGroupItems {
  formGroupId: string;
  formId: string;
  ordem: number;
}

export interface FormGroupItemsCreate {
  formGroupId: string;
  formId: string;
  ordem?: number;
}

export interface FormGroupItemsUpdate {
  formGroupId: string;
  formId: string;
  ordem?: number;
}
