import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Location } from '../../../../../core/models/location.model';
import { Section } from '../../../../../core/models/section.model';
import { Form } from '../../../../../core/models/form.model';
import { Machine } from '../../../../../core/models/machine.model';

import { LocationService } from '../../../../../core/services/location.service';
import { SectionService } from '../../../../../core/services/section.service';
import { FormService } from '../../../../../core/services/form.service';
import { MachineService } from '../../../../../core/services/machine.service';
import { ModalService } from '../../../../../core/services/modal.service';

import { FormComponent } from './modals/form/form.component';
import { DetailComponent } from './modals/detail/detail.component';
import { ScrollTopComponent } from '../../../../scroll-top/scroll-top.component';

type Step = 'location' | 'section' | 'form' | 'machine';

/** Campos filtráveis derivados das interfaces (sem o id). */
interface Filters {
  nome: string;
  descricao: string;
  employerId: string; // Location / Section
  sectionId: string; // Form
  status: 'all' | 'active' | 'inactive';
  criadoDe: string; // yyyy-mm-dd
  criadoAte: string;
  alteradoDe: string;
  alteradoAte: string;
}

@Component({
  selector: 'app-machine',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './machine.component.html',
  styleUrl: './machine.component.css',
})
export class MachineComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly machineService = inject(MachineService);
  private readonly modalService = inject(ModalService);

  // ───────── navegação ─────────
  readonly step = signal<Step>('location');

  // ───────── coleções ─────────
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly machines = signal<Machine[]>([]); // máquinas do formulário selecionado

  // ───────── seleções ─────────
  readonly selectedLocation = signal<Location | null>(null);
  readonly selectedSection = signal<Section | null>(null);
  readonly selectedForm = signal<Form | null>(null);

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── filtros por campo ─────────
  readonly filtersOpen = signal(false);

  private readonly emptyFilters: Filters = {
    nome: '',
    descricao: '',
    employerId: '',
    sectionId: '',
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
    for (const [k, v] of Object.entries(f)) {
      if (k !== 'status' && v !== '') n++;
    }
    return n;
  });

  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

  // ── helpers de comparação ──
  private textMatch(value: string | null | undefined, term: string): boolean {
    if (!term.trim()) return true;
    return (value ?? '').toLowerCase().includes(term.trim().toLowerCase());
  }

  private statusMatch(status: number, f: Filters['status']): boolean {
    if (f === 'all') return true;
    return f === 'active' ? status === 1 : status !== 1;
  }

  private dateInRange(
    date: Date | string | null | undefined,
    from: string,
    to: string,
  ): boolean {
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
        this.textMatch(l.employerId, f.employerId) &&
        this.statusMatch(l.status, f.status),
    );
  });

  readonly filteredSections = computed(() => {
    const f = this.filters();
    return this.sections().filter(
      (s) =>
        this.textMatch(s.nome, f.nome) &&
        this.textMatch(s.descricao, f.descricao) &&
        this.textMatch(s.employerId, f.employerId) &&
        this.statusMatch(s.status, f.status) &&
        this.dateInRange(s.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(s.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly filteredForms = computed(() => {
    const f = this.filters();
    return this.forms().filter(
      (fm) =>
        this.textMatch(fm.nome, f.nome) &&
        this.textMatch(fm.descricao, f.descricao) &&
        this.textMatch(fm.sectionId, f.sectionId) &&
        this.statusMatch(fm.status, f.status) &&
        this.dateInRange(fm.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(fm.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  readonly filteredMachines = computed(() => {
    const f = this.filters();
    return this.machines().filter(
      (m) =>
        this.textMatch(m.nome, f.nome) &&
        this.textMatch(m.descricao, f.descricao) &&
        this.statusMatch(m.status, f.status) &&
        this.dateInRange(m.dataCriacao, f.criadoDe, f.criadoAte) &&
        this.dateInRange(m.dataAlteracao, f.alteradoDe, f.alteradoAte),
    );
  });

  // ── opções de IDs (selects de filtro) ──
  private distinct(values: (string | null | undefined)[]): string[] {
    return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
  }

  readonly employerIdOptions = computed<string[]>(() => {
    if (this.step() === 'location') {
      return this.distinct(this.locations().map((l) => l.employerId));
    }
    if (this.step() === 'section') {
      return this.distinct(this.sections().map((s) => s.employerId));
    }
    return [];
  });

  readonly sectionIdOptions = computed<{ value: string; label: string }[]>(() => {
    const byId = new Map(this.sections().map((s) => [s.id, s.nome]));
    return this.distinct(this.forms().map((f) => f.sectionId)).map((id) => ({
      value: id,
      label: byId.get(id) ?? id,
    }));
  });

  // ───────── títulos dinâmicos ─────────
  private readonly titles: Record<Step, string> = {
    location: 'Locais',
    section: 'Seções',
    form: 'Formulários',
    machine: 'Máquinas',
  };
  private readonly descriptions: Record<Step, string> = {
    location: 'Selecione um local para começar.',
    section: 'Escolha a seção desejada.',
    form: 'Escolha o formulário das máquinas.',
    machine: 'Gerencie as máquinas vinculadas ao formulário.',
  };

  readonly pageTitle = computed(() => this.titles[this.step()]);
  readonly pageDescription = computed(() => this.descriptions[this.step()]);

  ngOnInit(): void {
    this.loadLocations();
  }

  // ============================================================
  //  CARREGAMENTO
  // ============================================================

  /** O backend devolve PaginatedResult<T>. Ajuste a propriedade se necessário. */
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
    this.sectionService.getAll(1000, 1).subscribe({
      next: (res) => {
        const employerId = this.selectedLocation()?.employerId;
        const all = this.unwrap<Section>(res);
        this.sections.set(
          employerId ? all.filter((s) => s.employerId === employerId) : all,
        );
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar as seções.'),
    });
  }

  private loadForms(): void {
    this.startLoading();
    const sectionId = this.selectedSection()?.id;
    this.formService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<Form>(res);
        this.forms.set(all.filter((f) => f.sectionId === sectionId));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar os formulários.'),
    });
  }

  private loadMachines(): void {
    this.startLoading();
    const formId = this.selectedForm()?.id;
    this.machineService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<Machine>(res);
        this.machines.set(all.filter((m) => m.formId === formId));
        this.loading.set(false);
      },
      error: () => this.fail('Não foi possível carregar as máquinas.'),
    });
  }

  // ============================================================
  //  AVANÇAR
  // ============================================================

  selectLocation(loc: Location): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedLocation.set(loc);
    this.step.set('section');
    this.loadSections();
  }

  selectSection(sec: Section): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedSection.set(sec);
    this.step.set('form');
    this.loadForms();
  }

  selectForm(form: Form): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedForm.set(form);
    this.step.set('machine');
    this.loadMachines();
  }

  // ============================================================
  //  RETROCEDER / NAVEGAR PELA TRILHA
  // ============================================================

  back(): void {
    this.clearFeedback();
    switch (this.step()) {
      case 'machine':
        this.goToForms();
        break;
      case 'form':
        this.goToSections();
        break;
      case 'section':
        this.goToLocations();
        break;
    }
  }

  goToLocations(): void {
    this.clearFeedback();
    this.resetFilters();
    this.selectedLocation.set(null);
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.sections.set([]);
    this.forms.set([]);
    this.machines.set([]);
    this.step.set('location');
  }

  goToSections(): void {
    if (!this.selectedLocation()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.forms.set([]);
    this.machines.set([]);
    this.step.set('section');
  }

  goToForms(): void {
    if (!this.selectedSection()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedForm.set(null);
    this.machines.set([]);
    this.step.set('form');
  }

  // ============================================================
  //  MODAIS
  // ============================================================

  async novo(): Promise<void> {
    const ref = this.modalService.openComponent(FormComponent, {
      title: 'Nova máquina',
      size: 'lg',
      backdrop: 'static',
      inputs: { mode: 'new', parentId: this.selectedForm()?.id ?? '' },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Criar', variant: 'primary', value: true, submit: true },
      ],
    });

    const confirmed = await ref.result;
    if (!confirmed) return;

    const value = ref.instance.value();

    this.machineService
      .create({
        formId: value.formId,
        nome: value.nome,
        descricao: value.descricao,
        status: value.status,
      })
      .subscribe({
        next: () => {
          this.success.set('Máquina criada com sucesso.');
          this.loadMachines();
        },
        error: () => this.error.set('Erro ao criar a máquina.'),
      });
  }

  async detalhar(machine: Machine): Promise<void> {
    const ref = this.modalService.openComponent(DetailComponent, {
      title: 'Detalhe',
      size: 'lg',
      inputs: { machine },
      outputs: {
        reload_return: (value: unknown) => {
          if (typeof value === 'boolean') {
            if (value) {
              ref.close();
              this.loadMachines();
            }
          }
        },
      },
      buttons: [{ text: 'Fechar', variant: 'secondary', value: true }],
    });

    await ref.result;
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  isAtivo(status: number): boolean {
    return status === 1;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
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

  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
  }
}