import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Location } from '../../../core/models/location.model';
import { Section } from '../../../core/models/section.model';
import { Form } from '../../../core/models/form.model';
import { Answer } from '../../../core/models/answer.model';
import { AnswerResult } from '../../../core/models/answer-result.model';

import { LocationService } from '../../../core/services/location.service';
import { SectionService } from '../../../core/services/section.service';
import { FormService } from '../../../core/services/form.service';
import { AnswerService } from '../../../core/services/answer.service';
import { AnswerResultService } from '../../../core/services/answer-result.service';
import { ModalService } from '../../../core/services/modal.service';
import { ModalEnvioComponent } from './modal-envio/modal-envio.component';

type Step = 'location' | 'section' | 'form' | 'parameters';

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
  selector: 'app-painel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './painel.component.html',
  styleUrl: './painel.component.css',
})
export class PainelComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly answerService = inject(AnswerService);
  private readonly answerResultService = inject(AnswerResultService);
 
  // ───────── navegação ─────────
  readonly step = signal<Step>('location');
 
  // ───────── coleções ─────────
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly answers = signal<Answer[]>([]); // parâmetros do formulário selecionado
 
  // ───────── seleções ─────────
  readonly selectedLocation = signal<Location | null>(null);
  readonly selectedSection = signal<Section | null>(null);
  readonly selectedForm = signal<Form | null>(null);
 
  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
 
  // ───────── valores do formulário de parâmetros (answerId -> resposta) ─────────
  readonly paramValues = signal<Record<string, string>>({});
 
  // valor atual já gravado no banco para cada answerId (a última linha existente)
  readonly existingResults = signal<Record<string, AnswerResult | null>>({});
 
  // ───────── filtros de busca (por campo das interfaces) ─────────
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
    to: string
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
        this.statusMatch(l.status, f.status)
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
        this.dateInRange(s.dataAlteracao, f.alteradoDe, f.alteradoAte)
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
        this.dateInRange(fm.dataAlteracao, f.alteradoDe, f.alteradoAte)
    );
  });
 
  // ── opções de IDs (selects de filtro) ──
  private distinct(values: (string | null | undefined)[]): string[] {
    return Array.from(
      new Set(values.filter((v): v is string => !!v))
    ).sort();
  }
 
  /** IDs de employer disponíveis no nível atual. */
  readonly employerIdOptions = computed<string[]>(() => {
    if (this.step() === 'location') {
      return this.distinct(this.locations().map((l) => l.employerId));
    }
    if (this.step() === 'section') {
      return this.distinct(this.sections().map((s) => s.employerId));
    }
    return [];
  });
 
  /** Seções disponíveis (value = id, label = nome quando conhecido). */
  readonly sectionIdOptions = computed<{ value: string; label: string }[]>(
    () => {
      const byId = new Map(this.sections().map((s) => [s.id, s.nome]));
      return this.distinct(this.forms().map((f) => f.sectionId)).map((id) => ({
        value: id,
        label: byId.get(id) ?? id,
      }));
    }
  );
 
  // ───────── títulos dinâmicos ─────────
  private readonly titles: Record<Step, string> = {
    location: 'Locais',
    section: 'Seções',
    form: 'Formulários',
    parameters: 'Parâmetros',
  };
  private readonly descriptions: Record<Step, string> = {
    location: 'Selecione um local para começar.',
    section: 'Escolha a seção que deseja inspecionar.',
    form: 'Escolha o formulário a ser preenchido.',
    parameters: 'Informe os valores de cada parâmetro e salve.',
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
        // Não há locationId em Section — vinculamos pelo employerId do local.
        const all = this.unwrap<Section>(res);
        this.sections.set(
          employerId ? all.filter((s) => s.employerId === employerId) : all
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
 
  private loadAnswers(): void {
    this.startLoading();
    const formId = this.selectedForm()?.id;
    this.answerService.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<Answer>(res);
        const params = all.filter((a) => a.formId === formId);
        this.answers.set(params);
 
        if (params.length === 0) {
          this.paramValues.set({});
          this.existingResults.set({});
          this.loading.set(false);
          return;
        }
 
        // busca o valor já gravado de cada parâmetro
        this.fetchResults(params).subscribe({
          next: (results) => {
            this.applyResults(results);
            this.loading.set(false);
          },
          error: () => this.fail('Não foi possível carregar as respostas atuais.'),
        });
      },
      error: () => this.fail('Não foi possível carregar os parâmetros.'),
    });
  }
 
  /** Busca, para cada answer, suas linhas em answer_result. */
  private fetchResults(
    params: Answer[]
  ): Observable<{ id: string; list: AnswerResult[] }[]> {
    return forkJoin(
      params.map((a) =>
        this.answerResultService.getByAnswerId(a.id).pipe(
          map((list) => ({ id: a.id, list: list ?? [] })),
          catchError(() => of({ id: a.id, list: [] as AnswerResult[] }))
        )
      )
    );
  }
 
  /** Aplica o último valor de cada answer ao estado (existingResults + paramValues). */
  private applyResults(results: { id: string; list: AnswerResult[] }[]): void {
    const existing: Record<string, AnswerResult | null> = {};
    const values: Record<string, string> = {};
    for (const r of results) {
      const last = this.latestResult(r.list);
      existing[r.id] = last;
      values[r.id] = last?.resposta ?? '';
    }
    this.existingResults.set(existing);
    this.paramValues.set(values);
  }
 
  /** Linha atual do parâmetro. O backend já retorna apenas a mais recente
   *  (ORDER BY data_criacao DESC LIMIT 1), então basta pegar a primeira. */
  private latestResult(list: AnswerResult[]): AnswerResult | null {
    return list?.[0] ?? null;
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
    this.selectedForm.set(form);
    this.step.set('parameters');
    this.loadAnswers();
  }
 
  // ============================================================
  //  RETROCEDER / NAVEGAR PELA TRILHA
  // ============================================================
 
  back(): void {
    this.clearFeedback();
    switch (this.step()) {
      case 'parameters':
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
    this.answers.set([]);
    this.step.set('location');
  }
 
  goToSections(): void {
    if (!this.selectedLocation()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.forms.set([]);
    this.answers.set([]);
    this.step.set('section');
  }
 
  goToForms(): void {
    if (!this.selectedSection()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedForm.set(null);
    this.answers.set([]);
    this.step.set('form');
  }
 
  // ============================================================
  //  FORMULÁRIO DE PARÂMETROS
  // ============================================================
 
  updateParam(answerId: string, value: string): void {
    this.paramValues.update((m) => ({ ...m, [answerId]: value }));
  }
 
  /**
   * Tipo de input por categoria do parâmetro.
   * Ajuste o mapeamento conforme o significado de `categoryId` no seu domínio.
   */
  inputType(categoryId: number): string {
    switch (categoryId) {
      case 1:
        return 'number';
      case 2:
        return 'date';
      default:
        return 'text';
    }
  }
 
  /** Valor atualmente gravado no banco para o parâmetro (ou null). */
  currentValue(answerId: string): string | null {
    return this.existingResults()[answerId]?.resposta ?? null;
  }
 
  /** O valor digitado difere do que está gravado? */
  isChanged(answerId: string): boolean {
    const v = (this.paramValues()[answerId] ?? '').trim();
    const prev = (this.existingResults()[answerId]?.resposta ?? '').trim();
    return !!v && v !== prev;
  }
 
  readonly changedCount = computed(() => {
    const values = this.paramValues();
    const existing = this.existingResults();
    return this.answers().reduce((n, a) => {
      const v = (values[a.id] ?? '').trim();
      const prev = (existing[a.id]?.resposta ?? '').trim();
      return v && v !== prev ? n + 1 : n;
    }, 0);
  });
 
  save(): void {
    this.clearFeedback();
 
    const values = this.paramValues();
    const existing = this.existingResults();
    const ops: Observable<AnswerResult>[] = [];
 
    for (const a of this.answers()) {
      const value = (values[a.id] ?? '').trim();
      if (!value) continue;
 
      const prev = existing[a.id];
      if (prev && prev.resposta === value) continue; // sem alteração → ignora
 
      // Sem constraint de answerId único: cada alteração gera uma nova linha
      // (o valor anterior fica preservado como histórico).
      ops.push(
        this.answerResultService.create({ AnswerId: a.id, resposta: value })
      );
    }
 
    if (ops.length === 0) {
      this.error.set('Nenhuma alteração para salvar.');
      return;
    }
 
    this.saving.set(true);
    forkJoin(ops).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(`${ops.length} resposta(s) salva(s) com sucesso.`);
        this.refreshResults(); // recarrega os "valores atuais"
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Erro ao salvar as respostas. Tente novamente.');
      },
    });
  }
 
  /** Recarrega os valores gravados após salvar. */
  private refreshResults(): void {
    const params = this.answers();
    if (!params.length) return;
    this.fetchResults(params).subscribe((results) => this.applyResults(results));
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


  // ============================================================
  //  MODAL DE ENVIO — exclusivo do painel
  // ============================================================

  private readonly modalService = inject(ModalService);

  // Agrupa todos os parâmetros em um único bloco para exibição no modal de envio.
  protected readonly agrupados = computed(() => ([
    { categoria: null as any, answers: this.answers() },
  ]));

  // Abre o modal de confirmação com os dados já preenchidos pelo inspetor.
  // Usa os signals do próprio painel: selectedLocation/Section/Form e paramValues.
  protected enviar(): void {
    this.modalService.openComponent(ModalEnvioComponent, {
      title: 'Confirmar Envio',
      size: 'lg',
      inputs: {
        locationNome: this.selectedLocation()?.nome ?? '',
        sectionNome:  this.selectedSection()?.nome  ?? '',
        formNome:     this.selectedForm()?.nome      ?? '',
        agrupados:    this.agrupados(),
        respostas:    this.paramValues(),
      },
      buttons: [{ text: 'Fechar', variant: 'secondary', value: false }],
    });
  }
}
