import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Section } from '../../../../../core/models/section.model';
import { SectionService } from '../../../../../core/services/section.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { FormComponent } from './modals/form/form.component';

interface Filters {
  nome: string;
  descricao: string;
  employerId: string;
  status: 'all' | 'active' | 'inactive';
  criadoDe: string;
  criadoAte: string;
  alteradoDe: string;
  alteradoAte: string;
}

@Component({
  selector: 'app-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './section.component.html',
  styleUrl: './section.component.css',
})
export class SectionComponent implements OnInit {
  private readonly sectionService = inject(SectionService);
  private readonly modalService = inject(ModalService);

  readonly items = signal<Section[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    nome: '', descricao: '', employerId: '', status: 'all',
    criadoDe: '', criadoAte: '', alteradoDe: '', alteradoAte: '',
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
  private dateInRange(date: Date | string | null | undefined, from: string, to: string): boolean {
    if (!from && !to) return true;
    if (!date) return false;
    const d = new Date(date).getTime();
    if (from && d < new Date(from).getTime()) return false;
    if (to && d > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  }

  readonly filtered = computed(() => {
    const f = this.filters();
    return this.items().filter(
      (s) =>
        this.textMatch(s.nome, f.nome) &&
        this.textMatch(s.descricao, f.descricao) &&
        this.textMatch(s.employerId, f.employerId) &&
        this.statusMatch(s.status, f.status) &&
        this.dateInRange(s.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(s.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly employerIdOptions = computed(() =>
    Array.from(new Set(this.items().map((s) => s.employerId).filter(Boolean))).sort(),
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
    this.sectionService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.items.set(this.unwrap<Section>(res));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as seções.');
      },
    });
  }

  async novo(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Nova Seção',
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
    this.sectionService
      .create({ employerId: v.employerId, nome: v.nome, descricao: v.descricao, status: v.status })
      .subscribe({
        next: () => {
          this.success.set('Seção criada com sucesso.');
          this.load();
        },
        error: () => this.error.set('Erro ao criar a seção.'),
      });
  }

  async editar(item: Section): Promise<void> {
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
    this.sectionService
      .update(item.id, {
        employerId: v.employerId,
        nome: v.nome,
        descricao: v.descricao,
        status: v.status,
      })
      .subscribe({
        next: () => {
          this.success.set('Seção atualizada com sucesso.');
          this.load();
        },
        error: () => this.error.set('Erro ao atualizar a seção.'),
      });
  }

  async excluir(item: Section): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Excluir Seção',
      body: `Deseja realmente excluir "${item.nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    if (!(await ref.result)) return;

    this.sectionService.delete(item.id).subscribe({
      next: () => {
        this.success.set('Seção excluída.');
        this.load();
      },
      error: () => this.error.set('Erro ao excluir a seção.'),
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