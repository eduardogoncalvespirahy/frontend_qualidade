import { Type } from '@angular/core';

export interface ModalConfig<TData = any> {
  title?: string;
  data?: TData;

  size?: 'sm' | 'lg' | 'xl';

  centered?: boolean;
  backdrop?: boolean | 'static';

  keyboard?: boolean;

  component: Type<any>;
}
