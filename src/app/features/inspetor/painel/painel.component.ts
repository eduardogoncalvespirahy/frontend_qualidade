import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, switchMap } from 'rxjs/operators';

import { Machine } from '../../../core/models/machine.model';
import { Location } from '../../../core/models/location.model';
import { Section } from '../../../core/models/section.model';
import { Form } from '../../../core/models/form.model';
import { Answer } from '../../../core/models/answer.model';
import { AnswerResult } from '../../../core/models/answer-result.model';
import { BreakMachine } from '../../../core/models/break-machine.model';
import { BreakForm } from '../../../core/models/break-form.model';
import { LimitAnswer } from '../../../core/models/limit-answer.model';
import { Control } from '../../../core/models/control.model';
import { AnswerGroups } from '../../../core/models/answer-group.model';
import { AnswerGroupItems } from '../../../core/models/answer-group-items.model';
import { FormTime } from '../../../core/models/form-time.model';

import { MachineService } from '../../../core/services/machine.service';
import { LocationService } from '../../../core/services/location.service';
import { SectionService } from '../../../core/services/section.service';
import { FormService } from '../../../core/services/form.service';
import { AnswerService } from '../../../core/services/answer.service';
import { AnswerResultService } from '../../../core/services/answer-result.service';
import { ComponentModalRef, ModalService } from '../../../core/services/modal.service';
import { SignatureFileService } from '../../../core/services/signature-file.service';
import { ControlService } from '../../../core/services/control.service';
import { AuthService } from '../../../core/services/auth.service';
import { BreakMachineService } from '../../../core/services/break-machine.service';
import { BreakFormService } from '../../../core/services/break-form.service';
import { DraftService } from '../../../core/services/draft.service';
import { LimitAnswerService } from '../../../core/services/limit-answer.service';
import { MachineAnswerResultService } from '../../../core/services/machine-answer-result.service';
import { ControlStatusService } from '../../../core/services/control-status.service';
import { AnswerGroupsService } from '../../../core/services/answer-group.service';
import { AnswerGroupItemsService } from '../../../core/services/answer-groups-items.service';
// ⚠️ Ajuste o caminho conforme onde você colocou o serviço de exportação.
import { FileExportService, ExportColumn } from '../../../core/services/file-export.service';
import { FormTimeService } from '../../../core/services/form-time.service';

import { ModalEnvioComponent } from './modal-envio/modal-envio.component';
import { ScrollTopComponent } from '../../scroll-top/scroll-top.component';

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
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './painel.component.html',
  styleUrl: './painel.component.css',
})
export class PainelComponent implements OnInit {
  // ───────── injeções ─────────
  private readonly destroyRef = inject(DestroyRef);
  private readonly draftService = inject(DraftService);
  private readonly locationService = inject(LocationService);
  private readonly sectionService = inject(SectionService);
  private readonly formService = inject(FormService);
  private readonly answerService = inject(AnswerService);
  private readonly answerResultService = inject(AnswerResultService);
  private readonly answerGroupsService = inject(AnswerGroupsService);
  private readonly answerGroupItemsService = inject(AnswerGroupItemsService);
  private readonly machineService = inject(MachineService);
  private readonly breakMachineService = inject(BreakMachineService);
  private readonly breakFormService = inject(BreakFormService);
  private readonly controlService = inject(ControlService);
  private readonly controlStatusService = inject(ControlStatusService);
  private readonly signatureFileService = inject(SignatureFileService);
  private readonly limitsService = inject(LimitAnswerService);
  private readonly machineAnswerResultService = inject(MachineAnswerResultService);
  private readonly modalService = inject(ModalService);
  private readonly exporter = inject(FileExportService);
  private readonly auth = inject(AuthService);
  private readonly formTimeService = inject(FormTimeService);

  // ───────── navegação ─────────
  readonly step = signal<Step>('location');

  // ───────── coleções ─────────
  readonly locations = signal<Location[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly answers = signal<Answer[]>([]); // parâmetros do formulário selecionado
  readonly machines = signal<Machine[]>([]);
  readonly answerGroups = signal<AnswerGroups[]>([]);
  readonly groupItems = signal<AnswerGroupItems[]>([]);
  readonly breaks = signal<BreakMachine[]>([]);
  readonly allFormBreaks = signal<BreakForm[]>([]);
  readonly controls = signal<Control[]>([]);

  // ───────── seleções ─────────
  readonly selectedLocation = signal<Location | null>(null);
  readonly selectedSection = signal<Section | null>(null);
  readonly selectedForm = signal<Form | null>(null);

  // ───────── feedback ─────────
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // ───────── rascunho ─────────
  readonly hasDraft = signal(false);
  /** Fila de salvamento do rascunho (debounced para reduzir escrita). */
  private readonly draftSave$ = new Subject<{ formId: string; values: Record<string, string> }>();

  // ───────── valores do formulário de parâmetros (answerId -> resposta) ─────────
  readonly paramValues = signal<Record<string, string>>({});
  readonly machineParamValues = signal<Record<string, string>>({});

  // valor atual já gravado no banco para cada answerId (a última linha existente)
  readonly existingResults = signal<Record<string, AnswerResult | null>>({});

  /** answerId → id do limite ativo (usado em limitsAnswerId ao gravar). */
  readonly limitsMap = signal<Record<string, string>>({});
  /** answerId → limite ativo completo (usado para validar min/max localmente). */
  private readonly limitsByAnswer = signal<Record<string, LimitAnswer>>({});

  constructor() {
    // Salva o rascunho no máximo a cada 400ms, guardando o formId do momento
    // da digitação (evita gravar no formulário errado após navegar).
    this.draftSave$
      .pipe(debounceTime(400), takeUntilDestroyed())
      .subscribe(({ formId, values }) => this.draftService.save(formId, values));
  }

  // ───────── permissões de local (credentialLocation) ─────────
  /** Nomes das locations liberadas para a credencial logada. */
  readonly allowedLocations = computed(() => this.auth.locations());

  /** Uma location é permitida para a credencial? (vazio = sem restrição). */
  private isLocationAllowed(loc: Location | null | undefined): boolean {
    if (!loc) return false;
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return true; // sem restrição definida (ex.: admin)
    return allowed.includes(loc.nome) || allowed.includes(loc.id);
  }

  /** Locais permitidos — base estável para lista e opções de filtro. */
  private readonly permittedLocations = computed(() =>
    this.locations().filter((l) => this.isLocationAllowed(l)),
  );

  // ───────── ordenação por grupo ─────────
  /** answerId → vínculo do grupo (1 por parâmetro). */
  private readonly groupItemByAnswer = computed(() => {
    const m = new Map<string, AnswerGroupItems>();
    for (const it of this.groupItems()) {
      if (!m.has(it.answerId)) m.set(it.answerId, it);
    }
    return m;
  });

  /** groupId → posição do grupo (usa a ordem de retorno/criação dos grupos). */
  private readonly groupRank = computed(() => {
    const m = new Map<string, number>();
    this.answerGroups().forEach((g, i) => m.set(g.id, i));
    return m;
  });

  /**
   * Parâmetros ordenados conforme a ordem definida nos grupos:
   *  1) agrupa por grupo (na ordem dos grupos),
   *  2) dentro do grupo, pela `ordem` do item,
   *  3) parâmetros sem grupo vão para o fim (ordenados por nome).
   */
  readonly orderedAnswers = computed<Answer[]>(() => {
    const byAnswer = this.groupItemByAnswer();
    const rank = this.groupRank();
    const FIM = Number.MAX_SAFE_INTEGER;

    return [...this.answers()].sort((a, b) => {
      const ia = byAnswer.get(a.id);
      const ib = byAnswer.get(b.id);
      const ga = ia ? (rank.get(ia.answerGroupId) ?? FIM) : FIM;
      const gb = ib ? (rank.get(ib.answerGroupId) ?? FIM) : FIM;
      if (ga !== gb) return ga - gb; // agrupa por grupo
      const oa = ia?.ordem ?? FIM;
      const ob = ib?.ordem ?? FIM;
      if (oa !== ob) return oa - ob; // ordem dentro do grupo
      return (a.nome ?? '').localeCompare(b.nome ?? ''); // desempate estável
    });
  });

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
    return this.permittedLocations().filter(
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

  // ── opções de IDs (selects de filtro) ──
  private distinct(values: (string | null | undefined)[]): string[] {
    return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
  }

  readonly employerIdOptions = computed<string[]>(() => {
    if (this.step() === 'location') {
      return this.distinct(this.permittedLocations().map((l) => l.employerId));
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

  // ───────── máquinas / pausas ─────────
  readonly pausedMachineIds = computed<Set<string>>(() => {
    const now = Date.now();
    return new Set(
      this.breaks()
        .filter((b) => b.status === 1 && (!b.horaFim || new Date(b.horaFim).getTime() > now))
        .map((b) => b.machineId),
    );
  });

  readonly pausedFormIds = computed<Set<string>>(() => {
    const now = Date.now();
    return new Set(
      this.allFormBreaks()
        .filter((b) => b.status === 1 && (!b.horaFim || new Date(b.horaFim).getTime() > now))
        .map((b) => b.formId),
    );
  });

  readonly formStats = computed(() => {
    const map = new Map<string, { count: number; ultimo: Date | null }>();
    for (const c of this.controls()) {
      const entry = map.get(c.formId) ?? { count: 0, ultimo: null };
      entry.count++;
      const d = new Date(c.dataEmissao);
      if (!entry.ultimo || d > entry.ultimo) entry.ultimo = d;
      map.set(c.formId, entry);
    }
    return map;
  });

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
    this.locationService
      .getAll(1000, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.locations.set(this.unwrap<Location>(res));
          this.loading.set(false);
        },
        error: () => this.fail('Não foi possível carregar os locais.'),
      });
  }

  private loadSections(): void {
    this.startLoading();
    this.sectionService
      .getAll(1000, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const employerId = this.selectedLocation()?.employerId;
          // Não há locationId em Section — vinculamos pelo employerId do local.
          const all = this.unwrap<Section>(res);
          this.sections.set(employerId ? all.filter((s) => s.employerId === employerId) : all);
          this.loading.set(false);
        },
        error: () => this.fail('Não foi possível carregar as seções.'),
      });
  }

  private loadForms(): void {
    this.startLoading();
    const sectionId = this.selectedSection()?.id;
    this.formService
      .getAll(1000, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.forms.set(this.unwrap<Form>(res).filter((f) => f.sectionId === sectionId));
          this.loading.set(false);
        },
        error: () => this.fail('Não foi possível carregar os formulários.'),
      });

    this.loadFormMeta();
  }

  /** Metadados usados nos cards de formulário: pausas em andamento e envios. */
  private loadFormMeta(): void {
    this.breakFormService
      .getAll(1000, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.allFormBreaks.set(this.unwrap<BreakForm>(res)),
        error: () => this.allFormBreaks.set([]),
      });

    this.controlService
      .getAll(1000, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.controls.set(this.unwrap<Control>(res)),
        error: () => this.controls.set([]),
      });

    this.formTimeService
      .getAll(1000, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.formTimes.set(this.unwrap<FormTime>(res)),
        error: () => this.formTimes.set([]),
      });
  }

  // ── carga do formulário selecionado (answers + machines + breaks + results) ──

  private fetchAnswers(formId: string): Observable<Answer[]> {
    return this.answerService.getAll(1000, 1).pipe(
      map((res) => this.unwrap<Answer>(res).filter((a) => a.formId === formId)),
      catchError(() => of<Answer[]>([])),
    );
  }

  private fetchMachines(formId: string): Observable<Machine[]> {
    return this.machineService.getAll(1000, 1).pipe(
      map((res) => this.unwrap<Machine>(res).filter((m) => m.formId === formId)),
      catchError(() => of<Machine[]>([])),
    );
  }

  private fetchMachineBreaks(): Observable<BreakMachine[]> {
    return this.breakMachineService.getAll(1000, 1).pipe(
      map((res) => this.unwrap<BreakMachine>(res)),
      catchError(() => of<BreakMachine[]>([])),
    );
  }

  /**
   * Carrega tudo o que a etapa de parâmetros precisa em paralelo e, só depois
   * de ter answers + machines, restaura o rascunho no signal correto. Isso
   * elimina a antiga condição de corrida (rascunho restaurado antes de saber
   * se o formulário tinha máquinas).
   */
  private loadFormData(formId: string): void {
    this.startLoading();

    forkJoin({
      answers: this.fetchAnswers(formId),
      machines: this.fetchMachines(formId),
      breaks: this.fetchMachineBreaks(),
    })
      .pipe(
        switchMap(({ answers, machines, breaks }) => {
          this.answers.set(answers);
          this.machines.set(machines);
          this.breaks.set(breaks);
          this.loadLimits(); // depende de answers()

          return this.fetchResults(answers).pipe(
            map((results) => ({ results, isMachine: machines.length > 0 })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ results, isMachine }) => {
          this.applyResults(results);
          this.restoreDraft(formId, isMachine);
          this.loading.set(false);
        },
        error: () => this.fail('Não foi possível carregar os parâmetros.'),
      });
  }

  /** Busca, para cada answer, suas linhas em answer_result. */
  private fetchResults(params: Answer[]): Observable<{ id: string; list: AnswerResult[] }[]> {
    if (params.length === 0) return of([]);
    return forkJoin(
      params.map((a) =>
        this.answerResultService.getByAnswerId(a.id).pipe(
          map((list) => ({ id: a.id, list: list ?? [] })),
          catchError(() => of({ id: a.id, list: [] as AnswerResult[] })),
        ),
      ),
    );
  }

  /**
   * Aplica o último valor de cada answer ao estado.
   * Observação: o formulário inicia em branco (a resposta anterior fica só em
   * `existingResults`, exibida como "valor atual"); é o comportamento original.
   */
  private applyResults(results: { id: string; list: AnswerResult[] }[]): void {
    const existing: Record<string, AnswerResult | null> = {};
    const values: Record<string, string> = {};
    for (const r of results) {
      existing[r.id] = this.latestResult(r.list);
      values[r.id] = '';
    }
    this.existingResults.set(existing);
    this.paramValues.set(values);
  }

  private latestResult(list: AnswerResult[]): AnswerResult | null {
    return list?.[0] ?? null;
  }

  /** Restaura o rascunho no signal correto (após saber se o form tem máquinas). */
  private restoreDraft(formId: string, isMachine: boolean): void {
    this.draftService
      .load$(formId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((draft) => {
        const temRascunho = !!draft && Object.keys(draft).length > 0;
        this.hasDraft.set(temRascunho);
        if (!temRascunho) return;

        if (isMachine) {
          this.machineParamValues.set(draft!);
        } else {
          // merge: mantém o que já existe e sobrescreve com o rascunho.
          this.paramValues.update((cur) => ({ ...cur, ...draft }));
        }
      });
  }

  private loadLimits(): void {
    this.limitsService
      .getAll(1000, 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const all = this.unwrap<LimitAnswer>(res);
          const answerIds = new Set(this.answers().map((a) => a.id));
          const idMap: Record<string, string> = {};
          const fullMap: Record<string, LimitAnswer> = {};
          for (const l of all) {
            if (l.status === 1 && answerIds.has(l.answerId)) {
              idMap[l.answerId] = l.id;
              fullMap[l.answerId] = l;
            }
          }
          this.limitsMap.set(idMap);
          this.limitsByAnswer.set(fullMap);
        },
        error: () => {
          this.limitsMap.set({});
          this.limitsByAnswer.set({});
        },
      });
  }

  /** Grupos do formulário e seus itens (apenas para ordenar os parâmetros). */
  private loadGroupOrder(): void {
    const formId = this.selectedForm()?.id;
    if (!formId) {
      this.answerGroups.set([]);
      this.groupItems.set([]);
      return;
    }

    this.answerGroupsService
      .getAll(1000, 1)
      .pipe(
        map((res) => this.unwrap<AnswerGroups>(res).filter((g) => g.formId === formId)),
        switchMap((groups) => {
          this.answerGroups.set(groups);
          const groupIds = new Set(groups.map((g) => g.id));
          return this.answerGroupItemsService.getAll(2000, 1).pipe(
            map((r2) =>
              this.unwrap<AnswerGroupItems>(r2).filter((it) => groupIds.has(it.answerGroupId)),
            ),
            catchError(() => of<AnswerGroupItems[]>([])),
          );
        }),
        catchError(() => {
          this.answerGroups.set([]);
          return of<AnswerGroupItems[]>([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => this.groupItems.set(items));
  }

  // ============================================================
  //  AVANÇAR
  // ============================================================

  selectLocation(loc: Location): void {
    // Blindagem: não permite avançar para um local fora das permissões.
    if (!this.isLocationAllowed(loc)) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }
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
    // limpa o estado do formulário anterior antes de carregar o novo
    this.hasDraft.set(false);
    this.paramValues.set({});
    this.machineParamValues.set({});
    this.selectedForm.set(form);
    this.step.set('parameters');

    this.loadFormData(form.id); // answers + machines + breaks + results + rascunho
    this.loadGroupOrder();
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
    this.resetFormState();
    this.step.set('location');
  }

  goToSections(): void {
    if (!this.selectedLocation()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedSection.set(null);
    this.selectedForm.set(null);
    this.forms.set([]);
    this.resetFormState();
    this.step.set('section');
  }

  goToForms(): void {
    if (!this.selectedSection()) return;
    this.clearFeedback();
    this.resetFilters();
    this.selectedForm.set(null);
    this.resetFormState();
    this.step.set('form');
  }

  /** Zera o estado do formulário selecionado (parâmetros, máquinas, grupos e rascunho em memória). */
  private resetFormState(): void {
    this.answers.set([]);
    this.machines.set([]);
    this.answerGroups.set([]);
    this.groupItems.set([]);
    this.paramValues.set({});
    this.machineParamValues.set({});
    this.existingResults.set({});
    this.hasDraft.set(false);
  }

  // ============================================================
  //  FORMULÁRIO DE PARÂMETROS
  // ============================================================

  updateParam(answerId: string, value: string): void {
    this.paramValues.update((m) => ({ ...m, [answerId]: value }));
    this.queueDraftSave(this.paramValues());
  }

  updateMachineParam(machineId: string, answerId: string, value: string): void {
    this.machineParamValues.update((m) => ({ ...m, [`${machineId}_${answerId}`]: value }));
    this.queueDraftSave(this.machineParamValues());
  }

  /** Enfileira o salvamento do rascunho (debounced) para o formulário atual. */
  private queueDraftSave(values: Record<string, string>): void {
    const formId = this.selectedForm()?.id;
    if (formId) this.draftSave$.next({ formId, values });
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

  isPaused(machineId: string): boolean {
    return this.pausedMachineIds().has(machineId);
  }

  isFormPausedById(formId: string): boolean {
    return this.pausedFormIds().has(formId);
  }

  statsPorForm(formId: string): { count: number; ultimo: Date | null } {
    return this.formStats().get(formId) ?? { count: 0, ultimo: null };
  }

  descartarRascunho(): void {
    const formId = this.selectedForm()?.id;
    if (formId) this.draftService.clear(formId);
    this.hasDraft.set(false);
    this.paramValues.set({});
    this.machineParamValues.set({});
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
  //  EXPORTAÇÃO (CSV / PDF) — adapta-se à etapa atual
  // ============================================================

  /** Há algo para exportar na etapa atual? */
  readonly canExport = computed(() => {
    switch (this.step()) {
      case 'location':
        return this.filteredLocations().length > 0;
      case 'section':
        return this.filteredSections().length > 0;
      case 'form':
        return this.filteredForms().length > 0;
      case 'parameters':
        return this.answers().length > 0;
      default:
        return false;
    }
  });

  private statusLabel(status: number): string {
    return status === 1 ? 'Ativo' : 'Inativo';
  }

  private fmtDate(d: Date | string | null | undefined): string {
    if (!d) return '';
    const t = new Date(d);
    return isNaN(t.getTime()) ? '' : t.toLocaleDateString('pt-BR');
  }

  /** Monta título/colunas/linhas conforme a etapa atual do drill-down. */
  private buildExport(): {
    title: string;
    subtitle: string;
    filename: string;
    orientation: 'portrait' | 'landscape';
    columns: ExportColumn[];
    rows: Record<string, unknown>[];
    meta: { label: string; value: string }[];
  } {
    const step = this.step();
    const loc = this.selectedLocation()?.nome ?? '';
    const sec = this.selectedSection()?.nome ?? '';
    const fm = this.selectedForm()?.nome ?? '';

    if (step === 'location') {
      return {
        title: 'Locais',
        subtitle: '',
        filename: 'locais',
        orientation: 'landscape',
        meta: [{ label: 'Total', value: String(this.filteredLocations().length) }],
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'employerId', label: 'Empregador' },
          { key: 'status', label: 'Status', align: 'center' },
        ],
        rows: this.filteredLocations().map((l) => ({
          nome: l.nome,
          descricao: l.descricao ?? '',
          employerId: l.employerId,
          status: this.statusLabel(l.status),
        })),
      };
    }

    if (step === 'section') {
      return {
        title: 'Seções',
        subtitle: loc,
        filename: 'secoes',
        orientation: 'landscape',
        meta: [
          { label: 'Local', value: loc },
          { label: 'Total', value: String(this.filteredSections().length) },
        ],
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'status', label: 'Status', align: 'center' },
          { key: 'criado', label: 'Criado em' },
          { key: 'alterado', label: 'Alterado em' },
        ],
        rows: this.filteredSections().map((s) => ({
          nome: s.nome,
          descricao: s.descricao ?? '',
          status: this.statusLabel(s.status),
          criado: this.fmtDate(s.dataCriacao),
          alterado: this.fmtDate(s.dataAlteracao),
        })),
      };
    }

    if (step === 'form') {
      const secById = new Map(this.sections().map((s) => [s.id, s.nome]));
      return {
        title: 'Formulários',
        subtitle: `${loc} › ${sec}`,
        filename: 'formularios',
        orientation: 'landscape',
        meta: [
          { label: 'Local', value: loc },
          { label: 'Seção', value: sec },
          { label: 'Total', value: String(this.filteredForms().length) },
        ],
        columns: [
          { key: 'nome', label: 'Nome' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'secao', label: 'Seção' },
          { key: 'status', label: 'Status', align: 'center' },
          { key: 'criado', label: 'Criado em' },
        ],
        rows: this.filteredForms().map((f) => ({
          nome: f.nome,
          descricao: f.descricao ?? '',
          secao: secById.get(f.sectionId) ?? f.sectionId,
          status: this.statusLabel(f.status),
          criado: this.fmtDate(f.dataCriacao),
        })),
      };
    }

    // parameters
    return {
      title: 'Parâmetros',
      subtitle: `${loc} › ${sec} › ${fm}`,
      filename: `parametros-${fm || 'formulario'}`,
      orientation: 'portrait',
      meta: [
        { label: 'Local', value: loc },
        { label: 'Seção', value: sec },
        { label: 'Formulário', value: fm },
        { label: 'Parâmetros', value: String(this.answers().length) },
      ],
      columns: [
        { key: 'parametro', label: 'Parâmetro' },
        { key: 'descricao', label: 'Descrição' },
        { key: 'atual', label: 'Valor atual', align: 'right' },
        { key: 'informado', label: 'Valor informado', align: 'right' },
        { key: 'alterado', label: 'Alterado?', align: 'center' },
      ],
      rows: this.orderedAnswers().map((a) => ({
        parametro: a.nome,
        descricao: a.descricao ?? '',
        atual: this.existingResults()[a.id]?.resposta ?? '',
        informado: this.paramValues()[a.id] ?? '',
        alterado: this.isChanged(a.id) ? 'Sim' : 'Não',
      })),
    };
  }

  /** Baixa um CSV do que está visível na etapa atual. */
  exportCsv(): void {
    const cfg = this.buildExport();
    this.exporter.downloadCsv(cfg.rows, { filename: cfg.filename, columns: cfg.columns });
  }

  /** Gera um PDF do que está visível na etapa atual (sem instanciar componentes). */
  exportPdf(): void {
    const cfg = this.buildExport();
    this.exporter.printTable(cfg.columns, cfg.rows, {
      title: cfg.title,
      subtitle: cfg.subtitle,
      meta: cfg.meta,
      filename: cfg.filename,
      orientation: cfg.orientation,
    });
  }

  // ============================================================
  //  MODAL DE ENVIO — exclusivo do painel
  // ============================================================

  // Agrupa todos os parâmetros em um único bloco para exibição no modal de envio.
  protected readonly agrupados = computed<{ categoria: unknown; answers: Answer[] }[]>(() => [
    { categoria: null, answers: this.orderedAnswers() },
  ]);

  protected async enviar(): Promise<void> {
    let ref: ComponentModalRef<ModalEnvioComponent, boolean> | undefined;

    ref = this.modalService.openComponent(ModalEnvioComponent, {
      title: 'Confirmar Envio',
      size: 'xl',
      inputs: {
        locationNome: this.selectedLocation()?.nome ?? '',
        sectionNome: this.selectedSection()?.nome ?? '',
        formNome: this.selectedForm()?.nome ?? '',
        agrupados: this.agrupados(),
        respostas: this.paramValues(),
        machines: this.machines(),
        machineRespostas: this.machineParamValues(),
      },
      // Sem botões no rodapé: as ações ficam no próprio componente,
      // onde o "Confirmar" só habilita com inspetor + assinatura + 1 resultado.
      buttons: [],
      outputs: {
        confirmar: () => ref?.close(true),
        cancelar: () => ref?.close(false),
      },
    });

    const confirmed = await ref.result;
    if (!confirmed) return;

    this.salvarEnvio(ref.instance.value());
  }

  /** Item mais recente de uma lista, pela data extraída em `getDate` (desc). */
  private maisRecente<T>(
    list: T[],
    getDate: (item: T) => Date | string | null | undefined,
  ): T | undefined {
    return [...list].sort(
      (a, b) => new Date(getDate(b) ?? 0).getTime() - new Date(getDate(a) ?? 0).getTime(),
    )[0];
  }

  /**
   * Valida um valor contra o limite ativo do parâmetro (SÍNCRONO).
   * Sem limite ou valor não numérico → não é violação. limitMin/limitMax
   * ausentes são tratados como -∞/+∞ (não como 0).
   */
  private dentroDoLimite(answerId: string, valor: string): boolean {
    const limit = this.limitsByAnswer()[answerId];
    if (!limit) return true;

    const v = parseFloat((valor ?? '').replace(',', '.'));
    if (Number.isNaN(v)) return true;

    const min =
      limit.limitMin != null && `${limit.limitMin}`.trim() !== ''
        ? parseFloat(`${limit.limitMin}`.replace(',', '.'))
        : Number.NEGATIVE_INFINITY;
    const max =
      limit.limitMax != null && `${limit.limitMax}`.trim() !== ''
        ? parseFloat(`${limit.limitMax}`.replace(',', '.'))
        : Number.POSITIVE_INFINITY;

    return v >= min && v <= max;
  }

  /**
   * Resolve o controle anterior a ser marcado como pendente (2 → 3),
   * ANTES de criar o novo. Só retorna id quando o anterior está em 'correção'.
   */
  private controleAnteriorParaPendente(formId: string): Observable<string | null> {
    return this.controlService.getByFormId(formId).pipe(
      switchMap((controls) => {
        if (!controls?.length) return of<string | null>(null);
        const anterior = this.maisRecente(controls, (c: any) => c.dataEmissao ?? c.dataCriacao);
        if (!anterior) return of<string | null>(null);
        return this.controlStatusService.getByControl(anterior.id).pipe(
          map((res) => {
            const status = Array.isArray(res)
              ? this.maisRecente(res, (s: any) => s.dataAlteracao ?? s.dataCriacao)
              : res;
            const atual = String((status as any)?.statusId ?? '').trim();
            return atual === '2' ? String(anterior.id) : null;
          }),
          catchError(() => of<string | null>(null)),
        );
      }),
      catchError(() => of<string | null>(null)),
    );
  }

  private salvarEnvio(dados: {
    userId: string | null;
    observacao: string;
    assinatura: string;
    respostas: Record<string, string>;
    machineRespostas: Record<string, string>;
    temMaquina: boolean;
  }): void {
    this.saving.set(true);
    const formId = this.selectedForm()!.id;

    this.signatureFileService
      .create({
        nome: `assinatura_${dados.userId}_${Date.now()}`,
        conteudo: dados.assinatura,
        mimeType: 'image/png',
        extensao: 'png',
      })
      .pipe(
        // 1) resolve o "anterior" ANTES de criar o novo controle
        switchMap((file) =>
          this.controleAnteriorParaPendente(formId).pipe(
            // 2) cria o novo controle
            switchMap((anteriorPendenteId) =>
              this.controlService
                .create({
                  formId,
                  userId: dados.userId ?? '',
                  fileId: file.id,
                  observacao: dados.observacao || null,
                  dataEmissao: new Date(),
                })
                .pipe(map((control) => ({ control, anteriorPendenteId }))),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ control, anteriorPendenteId }) =>
          this.persistirRespostas(dados, control, anteriorPendenteId),
        error: () => {
          this.saving.set(false);
          this.error.set('Falhou ao registrar a inspeção.');
        },
      });
  }

  /** Grava respostas + status do novo controle e, por fim, marca o anterior como pendente. */
  private persistirRespostas(
    dados: {
      respostas: Record<string, string>;
      machineRespostas: Record<string, string>;
      temMaquina: boolean;
    },
    control: Control,
    anteriorPendenteId: string | null,
  ): void {
    const resultOps: Observable<unknown>[] = [];
    let algumForaDoLimite = false;

    if (dados.temMaquina) {
      for (const [chave, valor] of Object.entries(dados.machineRespostas)) {
        if (!valor?.trim()) continue;
        const sep = chave.indexOf('_'); // chave = `${machineId}_${answerId}`
        if (sep < 0) continue;
        const machineId = chave.slice(0, sep);
        const answerId = chave.slice(sep + 1);

        if (!this.dentroDoLimite(answerId, valor)) algumForaDoLimite = true;

        resultOps.push(
          this.machineAnswerResultService
            .create({
              machineId,
              answerId,
              controlId: control.id,
              resposta: valor,
              limitsAnswerId: this.limitsMap()[answerId] ?? null,
            })
            .pipe(
              catchError((err) => {
                console.error(`Falha ao salvar resposta da máquina ${machineId}/${answerId}:`, err);
                return of(null);
              }),
            ),
        );
      }
    } else {
      for (const a of this.answers()) {
        const valor = dados.respostas[a.id];
        if (!valor?.trim()) continue;

        if (!this.dentroDoLimite(a.id, valor)) algumForaDoLimite = true;

        resultOps.push(
          this.answerResultService
            .create({
              AnswerId: a.id,
              controlId: control.id,
              resposta: valor,
              limitsAnswerId: this.limitsMap()[a.id] ?? null,
            })
            .pipe(
              catchError((err) => {
                console.error(`Falha ao salvar resposta do parâmetro ${a.id}:`, err);
                return of(null);
              }),
            ),
        );
      }
    }

    // UM único status para o NOVO controle: 1 = normalizado, 2 = correção.
    const statusOp = this.controlStatusService.create({
      controlId: control.id,
      statusId: algumForaDoLimite ? '2' : '1',
    });

    const ops: Observable<unknown>[] = [statusOp, ...resultOps];

    // Só agora (novo controle já criado) marcamos o ANTERIOR como pendente (2 → 3).
    if (anteriorPendenteId && anteriorPendenteId !== String(control.id)) {
      ops.push(
        this.controlStatusService.update(anteriorPendenteId, '3').pipe(
          catchError((err) => {
            console.error('Erro ao atualizar status do controle anterior:', err);
            return of(null);
          }),
        ),
      );
    }

    forkJoin(ops)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.paramValues.set({});
          this.machineParamValues.set({});
          this.draftService.clear(this.selectedForm()!.id);
          this.hasDraft.set(false);
          this.saving.set(false);
          this.success.set('Inspeção enviada com sucesso!');
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Inspeção registrada, mas falhou ao salvar algumas respostas.');
        },
      });
  }

  // Colocando uma cor nos Forms

  readonly formTimes = signal<FormTime[]>([]);

  // Mapa formId → FormTime para acesso rápido nos cards
  readonly formTimeMap = computed(() => {
    const map = new Map<string, FormTime>();
    for (const ft of this.formTimes()) {
      map.set(ft.formId, ft);
    }
    return map;
  });

  formStatusColor(formId: string): 'green' | 'yellow' | 'red' | '' {
    const ft = this.formTimeMap().get(formId);
    if (!ft) return ''; // sem FormTime configurado → sem indicador

    const stats = this.statsPorForm(formId);
    if (!stats.ultimo) return 'red'; // nunca enviou → atrasado

    // Converte "HH:MM:SS" para milissegundos
    const toMs = (hms: string): number => {
      const [h, m, s] = hms.split(':').map(Number);
      return ((h * 60 + m) * 60 + s) * 1000;
    };

    const execMs = toMs(ft.tempoExecucao);
    const elapsed = Date.now() - stats.ultimo.getTime();

    if (elapsed >= execMs) return 'red'; // atrasado
    if (elapsed >= execMs * 0.75) return 'yellow'; // últimos 25%
    return 'green'; // tranquilo
  }
}
