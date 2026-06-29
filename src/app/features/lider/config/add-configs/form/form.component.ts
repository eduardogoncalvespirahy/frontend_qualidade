import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Form } from '../../../../../core/models/form.model';
import { Section } from '../../../../../core/models/section.model';
import { FormService } from '../../../../../core/services/form.service';
import { SectionService } from '../../../../../core/services/section.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { FormularioFormComponent  } from './modals/form/form.component';

interface Filters {
  nome: string;
  descricao: string;
  sectionId: string;
  status: 'all' | 'active' | 'inactive';
  criadoDe: string;
  criadoAte: string;
  alteradoDe: string;
  alteradoAte: string;
}

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
})
export class FormComponent implements OnInit {
  private readonly formService = inject(FormService);
  private readonly sectionService = inject(SectionService);
  private readonly modalService = inject(ModalService);

  readonly items = signal<Form[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    nome: '', descricao: '', sectionId: '', status: 'all',
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

  /** Mapa sectionId -> nome, para exibir o nome da seção nos cards/filtros. */
  readonly sectionsById = computed(() => new Map(this.sections().map((s) => [s.id, s.nome])));

  sectionNome(sectionId: string): string {
    return this.sectionsById().get(sectionId) ?? sectionId;
  }

  /** Seções presentes nos formulários carregados (para o select de filtro). */
  readonly sectionIdOptions = computed(() => {
    const ids = Array.from(new Set(this.items().map((f) => f.sectionId).filter(Boolean))).sort();
    const byId = this.sectionsById();
    return ids.map((id) => ({ value: id, label: byId.get(id) ?? id }));
  });

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
      (fm) =>
        this.textMatch(fm.nome, f.nome) &&
        this.textMatch(fm.descricao, f.descricao) &&
        (!f.sectionId || fm.sectionId === f.sectionId) &&
        this.statusMatch(fm.status, f.status) &&
        this.dateInRange(fm.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(fm.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  ngOnInit(): void {
    this.loadSections();
    this.load();
  }

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r?.['data'] ?? r?.['items'] ?? r?.['results'] ?? []) as T[];
  }

  private loadSections(): void {
    this.sectionService.getAll(1000, 1).subscribe({
      next: (res) => this.sections.set(this.unwrap<Section>(res)),
      error: () => this.sections.set([]),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.formService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.items.set(this.unwrap<Form>(res));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar os formulários.');
      },
    });
  }

  async novo(): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormularioFormComponent, {
      title: 'Novo Formulário',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new', sections: this.sections() },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = ref.instance.value();
    this.formService
      .create({ sectionId: v.sectionId, nome: v.nome, descricao: v.descricao, status: v.status })
      .subscribe({
        next: () => {
          this.success.set('Formulário criado com sucesso.');
          this.load();
        },
        error: () => this.error.set('Erro ao criar o formulário.'),
      });
  }

  async editar(item: Form): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.openComponent(FormularioFormComponent, {
      title: `Editar: ${item.nome}`,
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'edit', item, sections: this.sections() },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Salvar', variant: 'primary', value: true, submit: true },
      ],
    });
    if (!(await ref.result)) return;

    const v = ref.instance.value();
    this.formService
      .update(item.id, {
        sectionId: v.sectionId,
        nome: v.nome,
        descricao: v.descricao,
        status: v.status,
      })
      .subscribe({
        next: () => {
          this.success.set('Formulário atualizado com sucesso.');
          this.load();
        },
        error: () => this.error.set('Erro ao atualizar o formulário.'),
      });
  }

  async excluir(item: Form): Promise<void> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Excluir Formulário',
      body: `Deseja realmente excluir "${item.nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    if (!(await ref.result)) return;

    this.formService.delete(item.id).subscribe({
      next: () => {
        this.success.set('Formulário excluído.');
        this.load();
      },
      error: () => this.error.set('Erro ao excluir o formulário.'),
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