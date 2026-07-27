import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InputUnits } from '../../../../../core/models/input-units.model';
import { InputUnitService } from '../../../../../core/services/input-unit.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';
import { FormComponent } from './modals/form/form.component';

interface Filters {
  nome: string;
  descricao: string;
  status: 'all' | 'active' | 'inactive';
}

@Component({
  selector: 'app-input-units',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './input-units.component.html',
  styleUrl: './input-units.component.css',
})
export class InputUnitsComponent implements OnInit {
  private readonly service = inject(InputUnitService);
  private readonly modalService = inject(ModalService);

  readonly items = signal<InputUnits[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // filtros
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    nome: '',
    descricao: '',
    status: 'all',
  };
  readonly filters = signal<Filters>({ ...this.emptyFilters });

  updateFilter<K extends keyof Filters>(key: K, value: Filters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    let n = f.status !== 'all' ? 1 : 0;
    for (const [k, v] of Object.entries(f)) if (k !== 'status' && v !== '') n++;
    return n;
  });
  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

  private textMatch(value: string | null | undefined, term: string): boolean {
    if (!term.trim()) return true;
    return (value ?? '').toLowerCase().includes(term.trim().toLowerCase());
  }

  private statusMatch(status: number, f: Filters['status']): boolean {
    if (f === 'all') return true;
    return f === 'active' ? status === 1 : status !== 1;
  }

  readonly filtered = computed(() => {
    const f = this.filters();
    return this.items().filter(
      (item) =>
        this.textMatch(item.nome, f.nome) &&
        this.textMatch(item.descricao, f.descricao) &&
        this.statusMatch(item.status, f.status),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r['result'] as T[]) || (r['data'] as T[]) || [];
  }

  private load(): void {
    this.loading.set(true);
    this.service.getAll(1000, 1).subscribe({
      next: (res) => {
        this.items.set(this.unwrap<InputUnits>(res));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar unidades de entrada');
        this.loading.set(false);
      },
    });
  }

  async novo(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Nova Unidade de Entrada',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new' },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = (ref.instance as any).value();
    this.service.create({ nome: v.nome, descricao: v.descricao, status: v.status }).subscribe({
      next: () => {
        this.success.set('Unidade de entrada criada com sucesso.');
        this.load();
      },
      error: (err: any) => this.error.set(`Erro ao criar. (${err.error?.message})`),
    });
  }

  async editar(item: InputUnits): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: `Editar: ${item.nome}`,
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'edit', item },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Salvar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = (ref.instance as any).value();
    this.service.update(item.id, { nome: v.nome, descricao: v.descricao, status: v.status }).subscribe({
      next: () => {
        this.success.set('Unidade de entrada atualizada com sucesso.');
        this.load();
      },
      error: (err: any) => this.error.set(`Erro ao atualizar. (${err.error?.message})`),
    });
  }

  async excluir(item: InputUnits): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Excluir Unidade de Entrada',
      body: `Deseja realmente excluir "${item.nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    if (!(await ref.result)) return;

    this.service.delete(item.id).subscribe({
      next: () => {
        this.success.set('Unidade de entrada excluída.');
        this.load();
      },
      error: (err: any) => this.error.set(`Erro ao excluir. (${err.error?.message})`),
    });
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }

  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
  }

  trackById(_: number, item: InputUnits): string {
    return item.id;
  }
}
