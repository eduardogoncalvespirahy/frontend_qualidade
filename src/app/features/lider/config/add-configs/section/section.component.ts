import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { FormComponent } from './modals/form/form.component';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';

type Step = 'location' | 'section';

interface Filters {
  nome: string;
  descricao: string;
  locationId: string;
  status: 'all' | 'active' | 'inactive';
  criadoDe: string;
  criadoAte: string;
  alteradoDe: string;
  alteradoAte: string;
}

@Component({
  selector: 'app-section',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './section.component.html',
  styleUrl: './section.component.css',
})
export class SectionComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly modalService = inject(ModalService);

  // ───────── navegação ─────────
  readonly step = signal<Step>('location');

  // ───────── coleções / seleção ─────────
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly selectedLocation = signal<Location | null>(null);

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    nome: '',
    descricao: '',
    locationId: '',
    status: 'all',
    criadoDe: '',
    criadoAte: '',
    alteradoDe: '',
    alteradoAte: '',
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

  readonly filteredLocations = computed(() => {
    const f = this.filters();
    return this.locations().filter(
      (l) =>
        this.textMatch(l.nome, f.nome) &&
        this.textMatch(l.descricao, f.descricao) &&
        (!f.locationId || l.id === f.locationId) &&
        this.statusMatch(l.status, f.status),
    );
  });

  readonly filteredSections = computed(() => {
    const f = this.filters();
    return this.sections().filter(
      (s) =>
        this.textMatch(s.nome, f.nome) &&
        this.textMatch(s.descricao, f.descricao) &&
        this.statusMatch(s.status, f.status) &&
        this.dateInRange(s.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(s.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly locationOptions = computed(() =>
    [...this.locations()]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((l) => ({ value: l.id, label: l.nome })),
  );

  // ───────── títulos ─────────
  private readonly titles: Record<Step, string> = { location: 'Locais', section: 'Seções' };
  private readonly descriptions: Record<Step, string> = {
    location: 'Selecione um local para gerenciar suas seções.',
    section: 'Gerencie as seções deste local.',
  };
  readonly pageTitle = computed(() => this.titles[this.step()]);
  readonly pageDescription = computed(() => this.descriptions[this.step()]);

  ngOnInit(): void {
    this.loadLocations();
  }

  // ============================================================
  //  CARREGAMENTO
  // ============================================================

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r?.['data'] ?? r?.['items'] ?? r?.['results'] ?? []) as T[];
  }

  private loadLocations(): void {
    this.startLoading();
    this.locationService.getAll(1000, 1).subscribe({
      next: (res) => {
        this.locations.set(this.unwrap<Location>(res));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar os locais.'),
    });
  }

  private loadSections(): void {
    this.startLoading();
    const employerId = this.selectedLocation()?.employerId;
    this.sectionService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<Section>(res);
        this.sections.set(employerId ? all.filter((s) => s.employerId === employerId) : all);
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar as seções.'),
    });
  }

  // ============================================================
  //  NAVEGAÇÃO
  // ============================================================

  selectLocation(loc: Location): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedLocation.set(loc);
    this.step.set('section');
    this.loadSections();
  }

  back(): void {
    this.goToLocations();
  }

  goToLocations(): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedLocation.set(null);
    this.sections.set([]);
    this.step.set('location');
  }

  // ============================================================
  //  CRUD — SEÇÕES (employerId travado pelo local)
  // ============================================================

  async novaSecao(): Promise<void> {
    this.clearFeedback();
    const employerId = this.selectedLocation()?.employerId ?? '';
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Nova Seção',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new', lockedEmployerId: employerId },
      buttons: this.crudButtons('Criar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    this.sectionService
      .create({ employerId, nome: v.nome, descricao: v.descricao, status: v.status })
      .subscribe({
        next: () => this.done('Seção criada.', () => this.loadSections()),
        error: () => this.error.set('Erro ao criar a seção.'),
      });
  }

  async editarSecao(item: Section): Promise<void> {
    this.clearFeedback();
    const employerId = this.selectedLocation()?.employerId ?? item.employerId;
    const ref = this.modalService.openComponent(FormComponent, {
      title: `Editar: ${item.nome}`,
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'edit', item, lockedEmployerId: employerId },
      buttons: this.crudButtons('Salvar'),
    });
    if (!(await ref.result)) return;
    const v = ref.instance.value();
    this.sectionService
      .update(item.id, { employerId, nome: v.nome, descricao: v.descricao, status: v.status })
      .subscribe({
        next: () => this.done('Seção atualizada.', () => this.loadSections()),
        error: () => this.error.set('Erro ao atualizar a seção.'),
      });
  }

  async excluirSecao(item: Section): Promise<void> {
    if (!(await this.confirmDelete(item.nome))) return;
    this.sectionService.delete(item.id).subscribe({
      next: () => this.done('Seção excluída.', () => this.loadSections()),
      error: () => this.error.set('Erro ao excluir a seção.'),
    });
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  private crudButtons(confirmText: string) {
    return [
      { text: 'Cancelar', variant: 'secondary', value: false },
      { text: confirmText, variant: 'primary', value: true, submit: true },
    ];
  }

  private async confirmDelete(nome: string): Promise<boolean> {
    this.clearFeedback();
    const ref = this.modalService.open<boolean>({
      title: 'Confirmar exclusão',
      body: `Deseja realmente excluir "${nome}"?`,
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Excluir', variant: 'danger', value: true },
      ],
    });
    return !!(await ref.result);
  }

  private done(msg: string, reload: () => void): void {
    this.success.set(msg);
    reload();
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
  private startLoading(): void {
    this.loading.set(true);
    this.error.set(null);
  }
  private fail(message: string): void {
    this.loading.set(false);
    this.error.set(message);
  }
  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
