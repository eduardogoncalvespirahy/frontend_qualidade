import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ⚠️ Ajuste os caminhos conforme a localização real deste componente no projeto.
import { Location } from '../../../../../core/models/location.model';
import { LocationService } from '../../../../../core/services/location.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { FormComponent } from './modals/form/form.component';

interface Filters {
  nome: string;
  descricao: string;
  employerId: string;
  status: 'all' | 'active' | 'inactive';
}

@Component({
  selector: 'app-location',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location.component.html',
  styleUrl: './location.component.css',
})
export class LocationComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly modalService = inject(ModalService);

  readonly items = signal<Location[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // filtros
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = { nome: '', descricao: '', employerId: '', status: 'all' };
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
      (l) =>
        this.textMatch(l.nome, f.nome) &&
        this.textMatch(l.descricao, f.descricao) &&
        this.textMatch(l.employerId, f.employerId) &&
        this.statusMatch(l.status, f.status),
    );
  });

  readonly employerIdOptions = computed(() =>
    Array.from(new Set(this.items().map((l) => l.employerId).filter(Boolean))).sort(),
  );

  ngOnInit(): void {
    this.load();
  }

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r?.['data'] ?? r?.['items'] ?? r?.['results'] ?? []) as T[];
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.locationService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.items.set(this.unwrap<Location>(res));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar os locais.');
      },
    });
  }

  async novo(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Novo Local',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new' },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = ref.instance.value();
    this.locationService
      .create({ employerId: v.employerId, nome: v.nome, descricao: v.descricao, status: v.status })
      .subscribe({
        next: () => {
          this.success.set('Local criado com sucesso.');
          this.load();
        },
        error: () => this.error.set('Erro ao criar o local.'),
      });
  }

  async editar(item: Location): Promise<void> {
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

    const v = ref.instance.value();
    this.locationService
      .update(item.id, {
        employerId: v.employerId,
        nome: v.nome,
        descricao: v.descricao,
        status: v.status,
      })
      .subscribe({
        next: () => {
          this.success.set('Local atualizado com sucesso.');
          this.load();
        },
        error: () => this.error.set('Erro ao atualizar o local.'),
      });
  }

  async excluir(item: Location): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Excluir Local',
      body: `Deseja realmente excluir "${item.nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    if (!(await ref.result)) return;

    this.locationService.delete(item.id).subscribe({
      next: () => {
        this.success.set('Local excluído.');
        this.load();
      },
      error: () => this.error.set('Erro ao excluir o local.'),
    });
  }

  isAtivo(status: number): boolean {
    return status === 1;
  }
  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
  }
  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}