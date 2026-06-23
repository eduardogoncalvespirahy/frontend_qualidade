import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  PLATFORM_ID,
  Type,
  createComponent,
  inject,
} from '@angular/core';
import { Modal } from 'bootstrap';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

/* -------------------------------------------------------------------------- */
/* Blocos de conteúdo (modo declarativo)                                       */
/* -------------------------------------------------------------------------- */

export interface ModalTextContent {
  type: 'text';
  text: string;
}

export interface ModalHtmlContent {
  type: 'html';
  /** HTML confiável (não escapado). */
  html: string;
}

export interface ModalListContent {
  type: 'list';
  items: Array<string | { text: string; muted?: string }>;
  ordered?: boolean;
  flush?: boolean;
}

export interface ModalTableColumn {
  key: string;
  label: string;
}

export interface ModalTableContent {
  type: 'table';
  columns: ModalTableColumn[];
  rows: Array<Record<string, unknown>>;
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  small?: boolean;
}

export type ModalFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox';

export interface ModalField {
  name: string;
  label?: string;
  type?: ModalFieldType;
  value?: string | number | boolean;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  help?: string;
}

export interface ModalFormContent {
  type: 'form';
  fields: ModalField[];
}

export type ModalContent =
  | ModalTextContent
  | ModalHtmlContent
  | ModalListContent
  | ModalTableContent
  | ModalFormContent;

/* -------------------------------------------------------------------------- */
/* Configuração / referência                                                   */
/* -------------------------------------------------------------------------- */

export interface ModalButton<T = unknown> {
  text: string;
  /** Variante Bootstrap: 'primary', 'danger', 'outline-secondary', etc. Padrão: 'secondary'. */
  variant?: string;
  value?: T;
  /** Fecha o modal ao clicar. Padrão: true. */
  dismiss?: boolean;
  /** Valida o formulário (HTML nativo) antes de fechar; aborta se inválido. */
  submit?: boolean;
  onClick?: (ref: ModalRef<T>) => void;
}

/** Campos comuns da "casca" do modal (compartilhados pelos dois modos). */
export interface ModalShellConfig<T = unknown> {
  title?: string;
  size?: ModalSize;
  centered?: boolean;
  scrollable?: boolean;
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  showClose?: boolean;
  buttons?: ModalButton<T>[];
}

/** Configuração do modo declarativo (open). */
export interface ModalConfig<T = unknown> extends ModalShellConfig<T> {
  body?: string;
  bodyHtml?: string;
  content?: ModalContent[];
}

/** Configuração do modo componente (openComponent). */
export interface ComponentModalConfig<C, T = unknown> extends ModalShellConfig<T> {
  /** Inputs do componente (chave = nome do @Input/input()). */
  inputs?: Partial<Record<string, unknown>>;
  /** Handlers de outputs (chave = nome do @Output/output()). */
  outputs?: Record<string, (value: unknown) => void>;
}

export interface ModalRef<T = unknown> {
  /** Resolve ao fechar, com o `value` do botão clicado (ou undefined). */
  readonly result: Promise<T | undefined>;
  /** Valores atuais do formulário (snapshot persiste após o fechamento). */
  getFormData(): Record<string, unknown>;
  /** Fecha o modal programaticamente. */
  close(result?: T): void;
}

/** Referência do modal com componente: dá acesso à instância criada. */
export interface ComponentModalRef<C, T = unknown> extends ModalRef<T> {
  readonly instance: C;
}

interface BodyMount {
  getData?: () => Record<string, unknown>;
  cleanup?: () => void;
}

interface SubscriptionLike {
  unsubscribe(): void;
}

let uid = 0;

/**
 * Cria e exibe modais do Bootstrap 5 de forma programática, em dois modos:
 *
 *  - `open(config)`         — conteúdo declarativo: text, html, list, table, form.
 *  - `openComponent(Cmp, c)`— renderiza um COMPONENTE Angular dentro do modal,
 *                             com inputs/outputs e destruição automática.
 *
 * Requer o CSS do Bootstrap 5 (configurado em angular.json).
 */
@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly appRef = inject(ApplicationRef);
  private readonly envInjector = inject(EnvironmentInjector);

  /* ----------------------------- modo declarativo -------------------------- */

  open<T = unknown>(config: ModalConfig<T> = {}): ModalRef<T> {
    if (!this.isBrowser) {
      return this.noopRef<T>();
    }

    const { body, bodyHtml, content = [] } = config;

    return this.mount<T>(config, (bodyEl) => {
      const formState: Record<string, unknown> = {};

      if (bodyHtml !== undefined) {
        bodyEl.innerHTML = bodyHtml;
      } else if (body !== undefined) {
        const p = this.document.createElement('p');
        p.className = 'mb-0';
        p.textContent = body;
        bodyEl.appendChild(p);
      }

      for (const block of content) {
        bodyEl.appendChild(this.renderBlock(block, formState));
      }

      return { getData: () => ({ ...formState }) };
    }).ref;
  }

  /* ------------------------------ modo componente -------------------------- */

  openComponent<C, T = unknown>(
    component: Type<C>,
    config: ComponentModalConfig<C, T> = {},
  ): ComponentModalRef<C, T> {
    if (!this.isBrowser) {
      return { ...this.noopRef<T>(), instance: null as unknown as C };
    }

    let instance!: C;

    const { ref } = this.mount<T>(config, (bodyEl) => {
      const host = this.document.createElement('div');
      bodyEl.appendChild(host);

      const componentRef = createComponent(component, {
        environmentInjector: this.envInjector,
        hostElement: host,
      });

      if (config.inputs) {
        for (const [key, value] of Object.entries(config.inputs)) {
          componentRef.setInput(key, value);
        }
      }

      const subs: SubscriptionLike[] = [];
      if (config.outputs) {
        const inst = componentRef.instance as Record<string, unknown>;
        for (const [name, handler] of Object.entries(config.outputs)) {
          const emitter = inst[name] as
            | { subscribe(fn: (v: unknown) => void): SubscriptionLike }
            | undefined;
          if (emitter && typeof emitter.subscribe === 'function') {
            subs.push(emitter.subscribe(handler));
          }
        }
      }

      this.appRef.attachView(componentRef.hostView);
      instance = componentRef.instance;

      return {
        cleanup: () => {
          subs.forEach((s) => s.unsubscribe());
          this.appRef.detachView(componentRef.hostView);
          componentRef.destroy();
        },
      };
    });

    return { ...ref, instance };
  }

  /* --------------------------- montagem da casca --------------------------- */

  private mount<T>(
    config: ModalShellConfig<T>,
    fillBody: (bodyEl: HTMLElement, ref: ModalRef<T>) => BodyMount,
  ): { ref: ModalRef<T> } {
    const {
      title,
      size,
      centered = false,
      scrollable = false,
      backdrop = true,
      keyboard = true,
      showClose = true,
      buttons = [],
    } = config;

    const doc = this.document;

    const modalEl = doc.createElement('div');
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');

    const dialog = doc.createElement('div');
    dialog.className = 'modal-dialog';
    if (centered) dialog.classList.add('modal-dialog-centered');
    if (scrollable) dialog.classList.add('modal-dialog-scrollable');
    if (size === 'fullscreen') {
      dialog.classList.add('modal-fullscreen');
    } else if (size) {
      dialog.classList.add(`modal-${size}`);
    }

    const contentEl = doc.createElement('div');
    contentEl.className = 'modal-content';
    contentEl.style.height = '100%';

    if (title || showClose) {
      const header = doc.createElement('div');
      header.className = 'modal-header';
      if (title) {
        const titleEl = doc.createElement('h5');
        titleEl.className = 'modal-title';
        titleEl.textContent = title;
        header.appendChild(titleEl);
      }
      if (showClose) {
        const closeBtn = doc.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('aria-label', 'Fechar');
        closeBtn.setAttribute('data-bs-dismiss', 'modal');
        header.appendChild(closeBtn);
      }
      contentEl.appendChild(header);
    }

    const bodyEl = doc.createElement('div');
    bodyEl.className = 'modal-body p-0';
    bodyEl.style.display = 'flex';
    bodyEl.style.flexDirection = 'column';
    bodyEl.style.minHeight = '0';

    contentEl.appendChild(bodyEl);

    let footer: HTMLElement | null = null;
    if (buttons.length) {
      footer = doc.createElement('div');
      footer.className = 'modal-footer';
      contentEl.appendChild(footer);
    }

    dialog.appendChild(contentEl);
    modalEl.appendChild(dialog);
    doc.body.appendChild(modalEl);

    const instance = new Modal(modalEl, { backdrop, keyboard });

    let resolveResult!: (value: T | undefined) => void;
    const result = new Promise<T | undefined>((resolve) => {
      resolveResult = resolve;
    });
    let pending: T | undefined;
    let dataGetter: () => Record<string, unknown> = () => ({});

    const ref: ModalRef<T> = {
      result,
      getFormData: () => dataGetter(),
      close: (value?: T) => {
        if (value !== undefined) pending = value;
        instance.hide();
      },
    };

    const mounted = fillBody(bodyEl, ref);
    if (mounted.getData) dataGetter = mounted.getData;

    for (const button of buttons) {
      const btnEl = doc.createElement('button');
      btnEl.type = 'button';
      btnEl.className = `btn btn-${button.variant ?? 'secondary'}`;
      btnEl.textContent = button.text;
      btnEl.addEventListener('click', () => {
        const formEl = bodyEl.querySelector('form');
        if (button.submit && formEl && !formEl.reportValidity()) {
          return;
        }
        if (button.value !== undefined) pending = button.value;
        button.onClick?.(ref);
        if (button.dismiss !== false) instance.hide();
      });
      footer!.appendChild(btnEl);
    }

    // a11y: tira o foco de elementos internos antes do aria-hidden
    modalEl.addEventListener('hide.bs.modal', () => {
      const active = doc.activeElement as HTMLElement | null;
      if (active && modalEl.contains(active)) active.blur();
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      mounted.cleanup?.();
      instance.dispose();
      modalEl.remove();
      resolveResult(pending);
    });

    instance.show();
    return { ref };
  }

  /* ------------------------------ renderizadores --------------------------- */

  private renderBlock(block: ModalContent, formState: Record<string, unknown>): HTMLElement {
    const doc = this.document;
    switch (block.type) {
      case 'text': {
        const p = doc.createElement('p');
        p.textContent = block.text;
        return p;
      }
      case 'html': {
        const div = doc.createElement('div');
        div.innerHTML = block.html;
        return div;
      }
      case 'list':
        return this.renderList(block);
      case 'table':
        return this.renderTable(block);
      case 'form':
        return this.renderForm(block, formState);
    }
  }

  private renderList(block: ModalListContent): HTMLElement {
    const doc = this.document;
    const list = doc.createElement(block.ordered ? 'ol' : 'ul');
    list.className = 'list-group';
    if (block.ordered) list.classList.add('list-group-numbered');
    if (block.flush) list.classList.add('list-group-flush');

    for (const item of block.items) {
      const li = doc.createElement('li');
      li.className = 'list-group-item';
      if (typeof item === 'string') {
        li.textContent = item;
      } else {
        li.classList.add('d-flex', 'justify-content-between', 'align-items-center');
        const span = doc.createElement('span');
        span.textContent = item.text;
        li.appendChild(span);
        if (item.muted) {
          const small = doc.createElement('small');
          small.className = 'text-muted';
          small.textContent = item.muted;
          li.appendChild(small);
        }
      }
      list.appendChild(li);
    }
    return list;
  }

  private renderTable(block: ModalTableContent): HTMLElement {
    const doc = this.document;
    const wrapper = doc.createElement('div');
    wrapper.className = 'table-responsive';

    const table = doc.createElement('table');
    table.className = 'table';
    if (block.striped) table.classList.add('table-striped');
    if (block.bordered) table.classList.add('table-bordered');
    if (block.hover) table.classList.add('table-hover');
    if (block.small) table.classList.add('table-sm');

    const thead = doc.createElement('thead');
    const headRow = doc.createElement('tr');
    for (const col of block.columns) {
      const th = doc.createElement('th');
      th.scope = 'col';
      th.textContent = col.label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    for (const row of block.rows) {
      const tr = doc.createElement('tr');
      for (const col of block.columns) {
        const td = doc.createElement('td');
        const cell = row[col.key];
        td.textContent = cell === null || cell === undefined ? '' : String(cell);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    wrapper.appendChild(table);
    return wrapper;
  }

  private renderForm(block: ModalFormContent, formState: Record<string, unknown>): HTMLElement {
    const doc = this.document;
    const form = doc.createElement('form');

    for (const field of block.fields) {
      const type = field.type ?? 'text';
      const id = `aqm-${field.name}-${++uid}`;
      const group = doc.createElement('div');
      group.className = 'mb-3';

      if (type === 'checkbox') {
        group.classList.add('form-check');
        const input = doc.createElement('input');
        input.type = 'checkbox';
        input.className = 'form-check-input';
        input.id = id;
        input.name = field.name;
        input.checked = field.value === true;
        formState[field.name] = input.checked;
        input.addEventListener('change', () => (formState[field.name] = input.checked));
        group.appendChild(input);
        if (field.label) {
          const label = doc.createElement('label');
          label.className = 'form-check-label';
          label.htmlFor = id;
          label.textContent = field.label;
          group.appendChild(label);
        }
        form.appendChild(group);
        continue;
      }

      if (field.label) {
        const label = doc.createElement('label');
        label.className = 'form-label';
        label.htmlFor = id;
        label.textContent = field.label;
        group.appendChild(label);
      }

      let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

      if (type === 'textarea') {
        const textarea = doc.createElement('textarea');
        textarea.className = 'form-control';
        if (field.placeholder) textarea.placeholder = field.placeholder;
        textarea.value = field.value !== undefined ? String(field.value) : '';
        control = textarea;
      } else if (type === 'select') {
        const select = doc.createElement('select');
        select.className = 'form-select';
        for (const opt of field.options ?? []) {
          const option = doc.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (field.value !== undefined && String(field.value) === opt.value) {
            option.selected = true;
          }
          select.appendChild(option);
        }
        control = select;
      } else {
        const input = doc.createElement('input');
        input.type = type;
        input.className = 'form-control';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.value !== undefined) input.value = String(field.value);
        control = input;
      }

      control.id = id;
      control.name = field.name;
      if (field.required) control.required = true;

      formState[field.name] = this.readControl(control, type);
      const update = () => (formState[field.name] = this.readControl(control, type));
      control.addEventListener('input', update);
      control.addEventListener('change', update);

      group.appendChild(control);

      if (field.help) {
        const help = doc.createElement('div');
        help.className = 'form-text';
        help.textContent = field.help;
        group.appendChild(help);
      }

      form.appendChild(group);
    }

    return form;
  }

  private readControl(
    control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    type: ModalFieldType,
  ): unknown {
    if (type === 'number') {
      return control.value === '' ? null : Number(control.value);
    }
    return control.value;
  }

  private noopRef<T>(): ModalRef<T> {
    return { result: Promise.resolve(undefined), getFormData: () => ({}), close: () => {} };
  }
}
