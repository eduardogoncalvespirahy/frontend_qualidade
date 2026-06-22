import {
  Injectable,
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  ComponentRef,
} from '@angular/core';

import { ModalHostComponent } from '../modals/modal-host/modal-host.component';
import { ModalConfig } from '../models/modal-config.model';
import { ModalRef } from '../modals/modal-ref';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector,
  ) {}

  open<TComponent, TResult = any>(config: ModalConfig): ModalRef<TResult> {
    const modalRef = new ModalRef<TResult>();

    const hostRef = createComponent(ModalHostComponent, {
      environmentInjector: this.injector,
    });

    hostRef.instance.title.set(config.title ?? '');

    hostRef.instance.size.set(config.size);

    hostRef.instance.centered.set(config.centered ?? true);

    hostRef.instance.close = () => {
      modalRef.close();

      this.destroy(hostRef);
    };

    const dynamicComponent = hostRef.instance.container.createComponent(config.component);

    if (config.data) {
      Object.assign(dynamicComponent.instance, config.data);
    }

    if ('modalRef' in dynamicComponent.instance) {
      dynamicComponent.instance.modalRef = modalRef;
    }

    this.appRef.attachView(hostRef.hostView);

    document.body.appendChild(hostRef.location.nativeElement);

    modalRef.result.finally(() => {
      this.destroy(hostRef);
    });

    return modalRef;
  }

  private destroy(ref: ComponentRef<any>) {
    this.appRef.detachView(ref.hostView);

    ref.destroy();
  }
}
