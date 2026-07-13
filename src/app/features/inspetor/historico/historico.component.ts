import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, firstValueFrom, Observable, of, range } from 'rxjs';
import { catchError, map, mergeMap, switchMap, toArray } from 'rxjs/operators';

import { Control, ControlUpdate } from '../../../core/models/control.model';
import { Form } from '../../../core/models/form.model';
import { UserProfile } from '../../../core/models/user-profile.model';
import { Answer } from '../../../core/models/answer.model';
import { Machine } from '../../../core/models/machine.model';
import { Section } from '../../../core/models/section.model';
import { Location } from '../../../core/models/location.model';
import { AnswerResult } from '../../../core/models/answer-result.model';
import { MachineAnswerResult } from '../../../core/models/machine-answer-result.model';
import { LimitAnswer } from '../../../core/models/limit-answer.model';
import { RepairerAnswerResult } from '../../../core/models/repairerAnswerResult.model';
import { PaginatedResult } from '../../../core/models/paginated.model';
import { File } from '../../../core/models/file.model';

import { ControlService } from '../../../core/services/control.service';
import { FormService } from '../../../core/services/form.service';
import { UserService } from '../../../core/services/user.service';
import { FileService } from '../../../core/services/file.service';
import { AnswerService } from '../../../core/services/answer.service';
import { MachineService } from '../../../core/services/machine.service';
import { SectionService } from '../../../core/services/section.service';
import { LocationService } from '../../../core/services/location.service';
import { AnswerResultService } from '../../../core/services/answer-result.service';
import { MachineAnswerResultService } from '../../../core/services/machine-answer-result.service';
import { LimitAnswerService } from '../../../core/services/limit-answer.service';
import { AuthService } from '../../../core/services/auth.service';
import { ControlStatusService } from '../../../core/services/control-status.service';
import { SignatureFileService } from '../../../core/services/signature-file.service';
import { RepairerAnswerResultService } from '../../../core/services/repairerAnswerResult.service';
import { ModalService } from '../../../core/services/modal.service';
import { SignatureComponent } from '../../../core/modals/signature/signature.component';
import { ScrollTopComponent } from '../../scroll-top/scroll-top.component';

type FileWithMetadata = File & {
  nome?: string;
  originalName?: string;
  fileName?: string;
  descricao?: string;
  url?: string;
  path?: string;
  caminho?: string;
};

/** Nível de edição permitido conforme o status do controle. */
type EditLevel = 'campos' | 'obs' | null;

interface HistoryRow {
  id: string;
  formId: string;
  formNome: string;
  sectionId: string;
  sectionNome: string;
  locationId: string;
  locationNome: string;
  userId: string;
  userNome: string;
  userEmail: string;
  fileId: string;
  fileNome: string;
  fileUrl: string | null;
  observacao: string | null;
  dataEmissao: Date | string;
  dataCriacao: Date | string;
  statusNomes: string;
}

interface Filters {
  texto: string;
  userId: string;
  formId: string;
  locationId: string;
  sectionId: string;
  statusNome: string;
  de: string;
  ate: string;
}

interface ParamRow {
  answerId: string;
  nome: string;
  resposta: string;
  limitsAnswerId: string | null;
  answerResultId: string | null; // operador
}


interface MachineData {
  maquinas: { id: string; nome: string }[];
  answers: { id: string; nome: string }[];
  cells: Record<string, string>; // chave: machineId_answerId
  cellLimits: Record<string, string | null>; // chave: machineId_answerId → limitsAnswerId
}

interface VersaoResposta {
  dataCriacao: string;
  valores: Record<string, string>;
  answerResultIds: string[]; // IDs dos registros deste lote (para resolver reparador)
}

@Component({
  selector: 'app-historico-inspetor',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollTopComponent],
  templateUrl: './historico.component.html',
  styleUrl: './historico.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricoComponent implements OnInit {
  private readonly controlService = inject(ControlService);
  private readonly formService = inject(FormService);
  private readonly userService = inject(UserService);
  private readonly fileService = inject(FileService);
  private readonly answerService = inject(AnswerService);
  private readonly machineService = inject(MachineService);
  private readonly sectionService = inject(SectionService);
  private readonly locationService = inject(LocationService);
  private readonly answerResultService = inject(AnswerResultService);
  private readonly machineAnswerResultService = inject(MachineAnswerResultService);
  private readonly limitService = inject(LimitAnswerService);
  private readonly auth = inject(AuthService);
  private readonly controlStatusService = inject(ControlStatusService);
  private readonly signatureFileService = inject(SignatureFileService);
  private readonly repairerService = inject(RepairerAnswerResultService);
  private readonly modalService = inject(ModalService);

  readonly controls = signal<Control[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly users = signal<UserProfile[]>([]);
  readonly files = signal<File[]>([]);
  readonly answers = signal<Answer[]>([]); // todos os parâmetros (carregados 1x)
  readonly machines = signal<Machine[]>([]); // todas as máquinas (para resolver nomes)
  readonly sections = signal<Section[]>([]);
  readonly locations = signal<Location[]>([]);

  readonly repairerByAnswerResultId = signal<Record<string, string>>({}); // answerResultId → userId
  readonly expandedId = signal<string | null>(null);
  readonly expandedLoading = signal<string | null>(null);
  readonly expandedData = signal<Record<string, ParamRow[]>>({});
  readonly expandedHistory = signal<Record<string, VersaoResposta[]>>({});
  readonly expandedMachineData = signal<Record<string, MachineData>>({});

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly controlStatuses = signal<Record<string, string[]>>({});

  // ───────── edição por status ─────────
  /** controlId em edição (ou null). */
  readonly editId = signal<string | null>(null);
  /** valores editados: answerId (modo normal) OU machineId_answerId (modo máquina). */
  readonly editValues = signal<Record<string, string>>({});
  readonly editObs = signal<string>('');
  readonly savingEdit = signal(false);

  // ───────── reparador da correção (opcional) ─────────
  /** Texto digitado (matrícula OU nome) para identificar o reparador. */
  readonly repairerQuery = signal<string>('');

  /** Usuário resolvido a partir da matrícula/nome digitado (ou null). */
  readonly repairerResolved = computed<UserProfile | null>(() =>
    this.resolveRepairer(this.repairerQuery()),
  );

  /** Sugestões para o <datalist> (matrícula — nome), limitadas a 20. */
  readonly repairerOptions = computed(() => {
    const term = this.repairerQuery().trim().toLowerCase();
    const base = term
      ? this.users().filter(
          (u) =>
            (u.userUsername ?? '').toLowerCase().includes(term) ||
            this.matricula(u).toLowerCase().includes(term),
        )
      : this.users();
    return base
      .slice(0, 20)
      .map((u) => ({
        id: u.userId,
        matricula: this.matricula(u),
        nome: u.userUsername ?? u.userId,
      }));
  });

  updateRepairer(value: string): void {
    this.repairerQuery.set(value);
  }

  /** Matrícula do usuário, tolerante ao nome do campo no model. */
  private matricula(u: UserProfile): string {
    const matricula = String(u.employeeMatricula ?? '').trim();
    return matricula;
  }

  /**
   * Resolve o reparador a partir do texto digitado:
   *  1) matrícula exata → 2) nome exato → 3) correspondência parcial (nome/matrícula).
   */
  private resolveRepairer(q: string): UserProfile | null {
    const term = (q ?? '').trim().toLowerCase();
    if (!term) return null;
    const users = this.users();
    return (
      users.find((u) => this.matricula(u).toLowerCase() === term) ??
      users.find((u) => (u.userUsername ?? '').toLowerCase() === term) ??
      users.find(
        (u) =>
          (u.userUsername ?? '').toLowerCase().includes(term) ||
          this.matricula(u).toLowerCase().includes(term),
      ) ??
      null
    );
  }

  /** answerId → limite ativo (min/max) para avaliar as edições. */
  private readonly limitsByAnswer = signal<Record<string, LimitAnswer>>({});

  // ───────── permissões de local (credentialLocation) ─────────
  /** Nomes dos locais liberados para a credencial logada. */
  readonly allowedLocations = computed(() => this.auth.locations());

  /**
   * Um local é permitido para a credencial?
   * - Lista vazia = sem restrição (libera tudo, ex.: admin).
   * - Caso contrário, precisa constar em allowedLocations (por nome ou id).
   */
  private isLocationAllowed(loc: Location | null | undefined): boolean {
    if (!loc) return false;
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return true;
    return allowed.includes(loc.nome) || allowed.includes(loc.id);
  }

  /**
   * Conjunto de formIds cujo local a credencial pode ver.
   * Caminho: Location(permitida) → employerId → Section → Form.
   * Retorna null quando NÃO há restrição (lista vazia) = liberar todos.
   */
  readonly permittedFormIds = computed<Set<string> | null>(() => {
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return null; // sem restrição

    const employerIds = new Set(
      this.locations()
        .filter((l) => this.isLocationAllowed(l))
        .map((l) => l.employerId),
    );
    const sectionIds = new Set(
      this.sections()
        .filter((s) => employerIds.has(s.employerId))
        .map((s) => s.id),
    );
    return new Set(
      this.forms()
        .filter((f) => sectionIds.has(f.sectionId))
        .map((f) => f.id),
    );
  });

  /** O formId está no escopo permitido? (null = sem restrição). */
  private isFormAllowed(formId: string): boolean {
    const p = this.permittedFormIds();
    return !p || p.has(formId);
  }

  // ───────── mapas para o filtro por local ─────────
  /** formId → employerId (via section.employerId). */
  private readonly formEmployerById = computed(() => {
    const secEmp = new Map(this.sections().map((s) => [s.id, s.employerId]));
    const m = new Map<string, string>();
    for (const f of this.forms()) m.set(f.id, secEmp.get(f.sectionId) ?? '');
    return m;
  });

  /** formId → sectionId. */
  private readonly formSectionById = computed(
    () => new Map(this.forms().map((f) => [f.id, f.sectionId])),
  );

  /** locationId → employerId. */
  private readonly locationEmployerById = computed(
    () => new Map(this.locations().map((l) => [l.id, l.employerId])),
  );

  /** formId → lista de parâmetros (para reuso ao expandir os detalhes). */
  private readonly answersByForm = computed(() => {
    const m = new Map<string, Answer[]>();
    for (const a of this.answers()) {
      const list = m.get(a.formId);
      if (list) list.push(a);
      else m.set(a.formId, [a]);
    }
    return m;
  });

  /** machineId → nome. */
  private readonly machineNameById = computed(
    () => new Map(this.machines().map((m) => [m.id, m.nome])),
  );

  /** employerIds dos locais permitidos (null = sem restrição). */
  private readonly permittedEmployerIds = computed<Set<string> | null>(() => {
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return null;
    return new Set(
      this.locations()
        .filter((l) => this.isLocationAllowed(l))
        .map((l) => l.employerId),
    );
  });

  /** Opções de local — só os permitidos pela credencial. */
  readonly locationOptions = computed(() =>
    this.locations()
      .filter((l) => this.isLocationAllowed(l))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((l) => ({ value: l.id, label: l.nome })),
  );

  /** Opções de seção — permitidas e, se um local estiver escolhido, só as dele. */
  readonly sectionOptions = computed(() => {
    const f = this.filters();
    const pe = this.permittedEmployerIds();
    const selEmp = f.locationId ? this.locationEmployerById().get(f.locationId) : null;
    return this.sections()
      .filter((s) => (!pe || pe.has(s.employerId)) && (selEmp == null || s.employerId === selEmp))
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
      .map((s) => ({ value: s.id, label: s.nome || s.id }));
  });

  /**
   * Opções de formulário em cascata:
   * - se há seção escolhida → só os formulários dela;
   * - senão, se há local escolhido → só os do local;
   * - senão → todos os permitidos.
   */
  readonly formOptions = computed(() => {
    const f = this.filters();
    const p = this.permittedFormIds();
    const formSec = this.formSectionById();
    const formEmp = this.formEmployerById();
    const selEmp = f.locationId ? this.locationEmployerById().get(f.locationId) : null;
    return this.forms()
      .filter((fm) => {
        if (p && !p.has(fm.id)) return false;
        if (f.sectionId) return formSec.get(fm.id) === f.sectionId;
        if (selEmp != null) return formEmp.get(fm.id) === selEmp;
        return true;
      })
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
      .map((fm) => ({ value: fm.id, label: fm.nome || fm.id }));
  });

  /** Alias compatível: mesmo conteúdo de formOptions (cascata). */
  readonly formOptionsCascata = this.formOptions;

  readonly userOptions = computed(() =>
    [...this.users()]
      .sort((a, b) => (a.userUsername ?? '').localeCompare(b.userUsername ?? ''))
      .map((u) => ({ value: u.userId, label: u.userUsername || u.userId })),
  );

  /** Opções de status — nomes distintos que aparecem nos controles carregados. */
  readonly statusOptions = computed(() => {
    const set = new Set<string>();
    for (const nomes of Object.values(this.controlStatuses())) {
      for (const nome of nomes) if (nome) set.add(nome);
    }
    return [...set].sort((a, b) => a.localeCompare(b)).map((s) => ({ value: s, label: s }));
  });

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = {
    texto: '',
    userId: '',
    formId: '',
    locationId: '',
    sectionId: '',
    statusNome: '',
    de: '',
    ate: '',
  };
  readonly filters = signal<Filters>({ ...this.emptyFilters });

  updateFilter<K extends keyof Filters>(key: K, value: Filters[K]): void {
    this.filters.update((f) => {
      const next = { ...f, [key]: value };
      // Cascata: trocar o local limpa seção e formulário; trocar a seção limpa o formulário.
      if (key === 'locationId') {
        next.sectionId = '';
        next.formId = '';
      } else if (key === 'sectionId') {
        next.formId = '';
      }
      return next;
    });
    this.page.set(1); // volta para a primeira página ao filtrar
  }

  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    let n = 0;
    for (const v of Object.values(f)) if (v !== '') n++;
    return n;
  });

  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
    this.page.set(1); // reset de página
  }

  // ───────── resolução de arquivo (defensiva) ─────────
  private fileName(file: File | undefined, fallback: string): string {
    if (!file) return fallback;
    const f = file as FileWithMetadata;
    return f.nome ?? f.originalName ?? f.fileName ?? f.descricao ?? fallback;
  }

  private fileUrl(file: File | undefined): string | null {
    if (!file) return null;
    const f = file as FileWithMetadata;
    return f.url ?? f.path ?? f.caminho ?? null;
  }

  // ───────── agrupamento de versões (histórico de correções) ─────────

  /** Instante (ms) de um registro, tolerando diferentes nomes de campo. */
  private getDataCriacao(r: Record<string, unknown>): number {
    const raw = r['dataCriacao'] ?? r['data_criacao'] ?? r['createdAt'] ?? r['created_at'] ?? null;
    if (!raw) return 0;
    const ms = new Date(raw as string).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  /** Ordena (cópia) por data de criação ascendente, tolerando o nome do campo. */
  private sortByDataAsc<T extends Record<string, unknown>>(records: T[]): T[] {
    return [...records].sort((a, b) => this.getDataCriacao(a) - this.getDataCriacao(b));
  }

  /**
   * Agrupa registros de answer_result em "versões" de envio.
   * Registros consecutivos com menos de 10s de intervalo = mesmo lote.
   * Espera receber os registros já ordenados por data asc.
   */
  private agruparVersoes(records: (AnswerResult & Record<string, unknown>)[]): VersaoResposta[] {
    if (!records.length) return [];
    const versoes: VersaoResposta[] = [];
    let lote: typeof records = [];
    let prevMs = this.getDataCriacao(records[0]);

    for (const r of records) {
      const ms = this.getDataCriacao(r);
      // compara com o registro ANTERIOR (rajada), não com o início do lote
      if (lote.length && ms - prevMs > 10_000) {
        versoes.push(this.loteParaVersao(lote));
        lote = [];
      }
      lote.push(r);
      prevMs = ms;
    }
    if (lote.length) versoes.push(this.loteParaVersao(lote));
    return versoes;
  }

  private loteParaVersao(lote: (AnswerResult & Record<string, unknown>)[]): VersaoResposta {
    const valores: Record<string, string> = {};
    const answerResultIds: string[] = [];
    for (const r of lote) {
      valores[r.AnswerId] = r.resposta;
      const id = (r as { id?: string }).id;
      if (id) answerResultIds.push(id);
    }
    const raw = lote[0]['dataCriacao'] ?? lote[0]['data_criacao'] ?? lote[0]['createdAt'] ?? '';
    return { dataCriacao: String(raw), valores, answerResultIds };
  }

  // ───────── expandir detalhes ─────────
  toggleDetails(row: HistoryRow): void {
    // fecha se já estava aberta
    if (this.expandedId() === row.id) {
      this.expandedId.set(null);
      this.cancelarEdicao();
      return;
    }

    // Blindagem: não expande detalhes de um local fora do escopo.
    if (!this.isFormAllowed(row.formId)) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }

    this.error.set(null);
    this.expandedId.set(row.id);
    this.cancelarEdicao();

    // já carregou antes — usa cache
    if (this.expandedData()[row.id] || this.expandedMachineData()[row.id]) return;

    // parâmetros deste formulário (já carregados no reload — sem nova requisição)
    const answers = this.answersByForm().get(row.formId) ?? [];
    if (!answers.length) {
      this.expandedData.update((d) => ({ ...d, [row.id]: [] }));
      return;
    }

    this.expandedLoading.set(row.id);

    // resultados são por controle → precisam ser buscados na expansão
    forkJoin({
      machineResults: this.fetchAllPages<MachineAnswerResult>((l, p) =>
        this.machineAnswerResultService.getControlIdAll(row.id, l, p),
      ).pipe(catchError(() => of(null))),
      answerResults: this.fetchAllPages<AnswerResult>((l, p) =>
        this.answerResultService.getControlIdAll(row.id, l, p),
      ).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ machineResults, answerResults }) => {
        const answerIdSet = new Set(answers.map((a) => a.id));
        const allMachine = this.unwrap<MachineAnswerResult>(machineResults).filter((r) =>
          answerIdSet.has(r.answerId),
        );

        if (allMachine.length > 0) {
          this.montarModoMaquina(row.id, answers, allMachine);
        } else {
          this.montarModoNormal(row.id, answers, this.unwrap<AnswerResult>(answerResults));
        }

        this.expandedLoading.set(null);
      },
      error: () => this.expandedLoading.set(null),
    });
  }

  private montarModoMaquina(
    controlId: string,
    answers: Answer[],
    allMachine: MachineAnswerResult[],
  ): void {
    // ordena asc por data → o último de cada célula é o valor mais recente
    const ordenados = this.sortByDataAsc(
      allMachine as unknown as (MachineAnswerResult & Record<string, unknown>)[],
    ) as unknown as MachineAnswerResult[];

    const machineIds = [...new Set(ordenados.map((r) => r.machineId))];
    const nameById = this.machineNameById();
    const maquinas = machineIds.map((id) => ({ id, nome: nameById.get(id) ?? id }));
    const cells: Record<string, string> = {};
    const cellLimits: Record<string, string | null> = {};
    for (const r of ordenados) {
      const key = `${r.machineId}_${r.answerId}`;
      cells[key] = r.resposta;
      cellLimits[key] = (r as { limitsAnswerId?: string | null }).limitsAnswerId ?? null;
    }

    this.expandedMachineData.update((d) => ({
      ...d,
      [controlId]: {
        maquinas,
        answers: answers.map((a) => ({ id: a.id, nome: a.nome })),
        cells,
        cellLimits,
      },
    }));
  }

  private montarModoNormal(controlId: string, answers: Answer[], results: AnswerResult[]): void {
    const allResults = results as (AnswerResult & {
      limitsAnswerId?: string | null;
      dataCriacao?: string;
    })[];

    // ordena por data asc (tolerante ao nome do campo) para histórico correto
    const ordenados = this.sortByDataAsc(
      allResults as unknown as Record<string, unknown>[],
    ) as unknown as typeof allResults;

    // última resposta por answerId = valor atual
    const latestMap = new Map<string, (typeof ordenados)[number]>();
    for (const r of ordenados) latestMap.set(r.AnswerId, r);

    const linhas: ParamRow[] = answers.map((a) => {
  const res = latestMap.get(a.id);
  return {
    answerId: a.id,
    nome: a.nome,
    resposta: res?.resposta ?? '—',
    limitsAnswerId: res?.limitsAnswerId ?? null,
    answerResultId: res ? (res as { id?: string }).id ?? null : null, // ← novo
  };
});

    this.expandedData.update((d) => ({ ...d, [controlId]: linhas }));

    // agrupa versões por rajada (registros consecutivos em até 10s = mesmo envio)
    const versoes = this.agruparVersoes(
      ordenados as unknown as (AnswerResult & Record<string, unknown>)[],
    );
    this.expandedHistory.update((d) => ({ ...d, [controlId]: versoes }));
  }

  // ============================================================
  //  EDIÇÃO POR STATUS
  //  1 = normalizado, 2 = correção → editam CAMPOS (+ observação)
  //  3 = pendente                  → edita apenas a OBSERVAÇÃO
  //  (fonte única da regra: nivelEdicao)
  // ============================================================

  /**
   * Tipo do status atual do controle derivado dos nomes já carregados.
   * 1 = normalizado, 2 = correção, 3 = pendente.
   * Assume que o último nome da lista é o mais recente.
   */
  statusTipo(controlId: string): number | null {
    const nomes = this.controlStatuses()[controlId];
    if (!nomes?.length) return null;
    const last = (nomes[nomes.length - 1] ?? '').toLowerCase();
    if (last.includes('normaliz')) return 1;
    if (last.includes('corre')) return 2;
    if (last.includes('pend')) return 3;
    return null;
  }

  /** Regra central de edição por status. */
  private nivelEdicao(controlId: string): EditLevel {
    switch (this.statusTipo(controlId)) {
      case 1:
      case 2:
        return 'campos';
      case 3:
        return 'obs';
      default:
        return null;
    }
  }

  /** Pode editar os campos (respostas)? Normalizado (1) e correção (2). */
  podeEditarCampos(controlId: string): boolean {
    return this.nivelEdicao(controlId) === 'campos';
  }

  /** Pode editar a observação? Qualquer status editável (1, 2 ou 3). */
  podeEditarObs(controlId: string): boolean {
    return this.nivelEdicao(controlId) !== null;
  }

  iniciarEdicao(row: HistoryRow): void {
    this.error.set(null);
    this.editId.set(row.id);
    this.editObs.set(row.observacao ?? '');
    this.repairerQuery.set(''); // reparador começa vazio a cada edição

    const vals: Record<string, string> = {};
    const md = this.expandedMachineData()[row.id];
    if (md) {
      for (const key of Object.keys(md.cells)) vals[key] = md.cells[key] ?? '';
    } else {
      for (const p of this.expandedData()[row.id] ?? []) {
        vals[p.answerId] = p.resposta === '—' ? '' : p.resposta;
      }
    }
    this.editValues.set(vals);
  }

  cancelarEdicao(): void {
    this.editId.set(null);
    this.editValues.set({});
    this.editObs.set('');
    this.repairerQuery.set('');
  }

  updateEditValue(key: string, value: string): void {
    this.editValues.update((m) => ({ ...m, [key]: value }));
  }

  updateEditObs(value: string): void {
    this.editObs.set(value);
  }

  /**
   * Valor está dentro do limite ativo do parâmetro?
   * Sem limite ou valor não numérico → não é violação (true).
   * limitMin/limitMax ausentes = -∞/+∞.
   */
  dentroDoLimite(answerId: string, valor: string): boolean {
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

  async salvarEdicao(row: HistoryRow): Promise<void> {
    if (this.nivelEdicao(row.id) == null) return;

    this.error.set(null);
    const vals = this.editValues();

    // Quem está editando (usuário logado). Se for OUTRO usuário, a alteração
    // passa a ser atribuída a ele (userId + nova assinatura/fileId).
    const editorId = this.auth.userId();
    const reatribuir = !!editorId && editorId !== row.userId;

    // Reparador informado (opcional). Só se aplica ao modo normal (answer_result),
    // pois o RepairerAnswerResult referencia answerResultId.
    const repairerId = this.repairerResolved()?.userId ?? null;

    // ── monta as operações de campos ──
    const fieldOps: Observable<unknown>[] = [];
    const changedNormal: Record<string, string> = {};
    let camposMudaram = false;
    let novoStatusId: string | null = null;

    if (this.podeEditarCampos(row.id)) {
      let tudoDentroDoLimite = true;
      const md = this.expandedMachineData()[row.id];
      if (md) {
        for (const key of Object.keys(md.cells)) {
          const sep = key.indexOf('_');
          if (sep < 0) continue;
          const machineId = key.slice(0, sep);
          const answerId = key.slice(sep + 1);
          const novo = (vals[key] ?? '').trim();
          const atual = (md.cells[key] ?? '').trim();
          const finalVal = novo || atual;

          if (finalVal && !this.dentroDoLimite(answerId, finalVal)) tudoDentroDoLimite = false;

          if (novo && novo !== atual) {
            camposMudaram = true;
            fieldOps.push(
              this.machineAnswerResultService.create({
                machineId,
                answerId,
                controlId: row.id,
                resposta: novo,
                limitsAnswerId: md.cellLimits?.[key] ?? null,
              }),
            );
          }
        }
      } else {
        for (const p of this.expandedData()[row.id] ?? []) {
          const novo = (vals[p.answerId] ?? '').trim();
          const atual = (p.resposta === '—' ? '' : p.resposta).trim();
          const finalVal = novo || atual;

          if (finalVal && !this.dentroDoLimite(p.answerId, finalVal)) tudoDentroDoLimite = false;

          if (novo && novo !== atual) {
            camposMudaram = true;
            changedNormal[p.answerId] = novo;
            fieldOps.push(
              this.answerResultService
                .create({
                  AnswerId: p.answerId,
                  controlId: row.id,
                  resposta: novo,
                  limitsAnswerId: p.limitsAnswerId ?? null,
                })
                // após criar a resposta, vincula o reparador (se informado)
                .pipe(switchMap((created) => this.linkRepairer(created, repairerId))),
            );
          }
        }
      }

      if (camposMudaram) {
        novoStatusId = tudoDentroDoLimite ? '1' : '2';
      }
    }

    // ── observação ──
    const novaObs = this.editObs().trim();
    const obsAtual = (row.observacao ?? '').trim();
    const obsMudou = this.podeEditarObs(row.id) && novaObs !== obsAtual;

    // Nada mudou → apenas sai da edição.
    if (!camposMudaram && !obsMudou) {
      this.cancelarEdicao();
      return;
    }

    // Assinatura é exigida sempre que houver CORREÇÃO de campos (o fileId do
    // controle aponta para o binário da assinatura, então cada correção precisa
    // de uma nova assinatura do usuário atual). Também exigimos quando OUTRO
    // usuário altera apenas a observação (para registrar a autoria).
    const precisaAssinar = camposMudaram || (reatribuir && obsMudou);

    let novoUserId: string | null = null;
    let novoFileId: string | null = null;

    if (precisaAssinar) {
      const assinatura = await this.pedirAssinatura();
      if (!assinatura) return; // cancelou ou não assinou → não salva

      this.savingEdit.set(true);
      try {
        const file = await firstValueFrom(
          this.signatureFileService.create({
            nome: `assinatura_${editorId}_${Date.now()}`,
            conteudo: assinatura,
            mimeType: 'image/png',
            extensao: 'png',
          }),
        );
        novoUserId = editorId; // a correção passa a ser atribuída a quem assinou
        novoFileId = file.id; // nova assinatura
        // registra o novo arquivo localmente para o nome resolver na listagem
        this.files.update((list) => [
          ...list,
          {
            ...file,
            nome: (file as { nome?: string }).nome ?? `assinatura_${editorId}`,
          },
        ]);
      } catch {
        this.savingEdit.set(false);
        this.error.set('Falha ao salvar a assinatura.');
        return;
      }
    } else {
      this.savingEdit.set(true);
    }

    // ── operações finais ──
    const ops: Observable<unknown>[] = [...fieldOps];
    if (novoStatusId) ops.push(this.controlStatusService.update(row.id, novoStatusId));

    // Atualiza o controle quando assinou (nova autoria/fileId) ou mudou a obs.
    if (precisaAssinar || obsMudou) {
      const payload: ControlUpdate = {
        userId: novoUserId ?? row.userId,
        fileId: novoFileId ?? row.fileId,
        observacao: obsMudou ? novaObs || null : row.observacao,
      };
      ops.push(this.controlService.update(row.id, payload));
    }

    if (!ops.length) {
      this.savingEdit.set(false);
      this.cancelarEdicao();
      return;
    }

    forkJoin(ops).subscribe({
      next: () => {
        this.aplicarEdicaoLocal(
          row.id,
          obsMudou ? novaObs || null : row.observacao,
          novoUserId,
          novoFileId,
        );
        // Insere a nova versão (lote de correção) no histórico — modo normal.
        if (Object.keys(changedNormal).length && !this.expandedMachineData()[row.id]) {
          this.anexarVersao(row.id, changedNormal);
        }
        if (novoStatusId) this.atualizarStatusLocal(row.id);
        this.savingEdit.set(false);
        this.cancelarEdicao();
      },
      error: () => {
        this.savingEdit.set(false);
        this.error.set('Erro ao salvar as alterações.');
      },
    });
  }

  /**
   * Vincula o reparador ao answer_result recém-criado (RepairerAnswerResult).
   * Não interrompe a correção se o vínculo falhar — apenas registra o erro.
   */
  private linkRepairer(created: AnswerResult, repairerId: string | null): Observable<AnswerResult> {
    const answerResultId = (created as { id?: string })?.id;
    if (!repairerId || !answerResultId) return of(created);
    return this.repairerService.create({ answerResultId, userId: repairerId }).pipe(
      map(() => created),
      catchError((err) => {
        console.error('Falha ao vincular o reparador à correção:', err);
        return of(created);
      }),
    );
  }

  /**
   * Abre o modal de assinatura e devolve o base64 (ou null se cancelado/vazio).
   * Usado quando um usuário diferente do autor edita o controle — a alteração
   * precisa ser assinada por quem está fazendo.
   */
  private async pedirAssinatura(): Promise<string | null> {
    let assinatura: string | null = null;
    const ref = this.modalService.openComponent(SignatureComponent, {
      title: 'Assine para confirmar a alteração',
      size: 'md',
      backdrop: 'static',
      outputs: {
        signatureChange: (valor: unknown) => (assinatura = (valor as string) || null),
      },
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Confirmar', variant: 'primary', value: true },
      ],
    });
    const ok = await ref.result;
    return ok ? assinatura : null;
  }

  /**
   * Insere reativamente uma nova versão no histórico de correções.
   * `valores` contém apenas os campos alterados neste envio (como um lote real),
   * ficando como a versão MAIS RECENTE (o template mostra as anteriores em
   * "Histórico de correções" e os valores atuais nos cards).
   */
  private anexarVersao(controlId: string, valores: Record<string, string>, answerResultIds: string[] = []): void {
    const nova: VersaoResposta = {
      dataCriacao: new Date().toISOString(),
      valores: { ...valores },
      answerResultIds,
    };
    this.expandedHistory.update((h) => ({
      ...h,
      [controlId]: [...(h[controlId] ?? []), nova],
    }));
  }

  /** Atualiza o status no estado local recarregando o nome do status (chip). */
  private atualizarStatusLocal(controlId: string): void {
    this.controlStatusService
      .getStatusNamesByControl(controlId)
      .pipe(catchError(() => of([] as string[])))
      .subscribe((nomes) => {
        this.controlStatuses.update((m) => ({ ...m, [controlId]: nomes as string[] }));
      });
  }

  /** Reflete a edição no estado local (sem refazer as buscas). */
  private aplicarEdicaoLocal(
    controlId: string,
    obs: string | null,
    novoUserId: string | null = null,
    novoFileId: string | null = null,
  ): void {
    // observação (+ autoria, quando reatribuído) → atualiza o controle;
    // rows() deriva daqui, então userNome/fileNome refletem o editor.
    this.controls.update((list) =>
      list.map((c) =>
        c.id === controlId
          ? {
              ...c,
              observacao: obs,
              ...(novoUserId ? { userId: novoUserId } : {}),
              ...(novoFileId ? { fileId: novoFileId } : {}),
            }
          : c,
      ),
    );

    const vals = this.editValues();
    const md = this.expandedMachineData()[controlId];
    if (md) {
      const cells = { ...md.cells };
      for (const key of Object.keys(cells)) {
        const v = (vals[key] ?? '').trim();
        if (v) cells[key] = v;
      }
      this.expandedMachineData.update((d) => ({ ...d, [controlId]: { ...md, cells } }));
    } else {
      const linhas = (this.expandedData()[controlId] ?? []).map((p) => {
        const v = (vals[p.answerId] ?? '').trim();
        return v ? { ...p, resposta: v } : p;
      });
      this.expandedData.update((d) => ({ ...d, [controlId]: linhas }));
    }
  }

  // ───────── linhas do histórico (mais recentes primeiro) ─────────
  readonly rows = computed<HistoryRow[]>(() => {
    const formById = new Map(this.forms().map((f) => [f.id, f]));
    const sectionById = new Map(this.sections().map((s) => [s.id, s]));
    // employerId → location (deriva o local a partir do employer da seção)
    const locationByEmployer = new Map(this.locations().map((l) => [l.employerId, l]));
    const userById = new Map(this.users().map((u) => [u.userId, u]));
    const fileById = new Map(this.files().map((f) => [String(f['id']), f]));
    const statusMap = this.controlStatuses();

    return (
      this.controls()
        // Restringe aos controles cujo formulário está num local permitido.
        .filter((c) => this.isFormAllowed(c.formId))
        .map((c) => {
          const form = formById.get(c.formId);
          const section = form ? sectionById.get(form.sectionId) : undefined;
          const location = section ? locationByEmployer.get(section.employerId) : undefined;
          const user = userById.get(c.userId);
          const file = fileById.get(c.fileId);
          return {
            id: c.id,
            formId: c.formId,
            formNome: form?.nome ?? c.formId,
            sectionId: section?.id ?? form?.sectionId ?? '',
            sectionNome: section?.nome ?? '',
            locationId: location?.id ?? '',
            locationNome: location?.nome ?? '',
            userId: c.userId,
            userNome: user?.userUsername ?? c.userId,
            userEmail: user?.userEmail ?? '',
            fileId: c.fileId,
            fileNome: this.fileName(file, c.fileId),
            fileUrl: this.fileUrl(file),
            observacao: c.observacao,
            dataEmissao: c.dataEmissao,
            dataCriacao: c.dataCriacao,
            statusNomes: (statusMap[c.id] ?? []).join(', '),
          } as HistoryRow;
        })
        .sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime())
    );
  });

  private textMatch(value: string | null | undefined, term: string): boolean {
    if (!term.trim()) return true;
    return (value ?? '').toLowerCase().includes(term.trim().toLowerCase());
  }
  private dateInRange(date: Date | string | null | undefined, from: string, to: string): boolean {
    if (!from && !to) return true;
    if (!date) return false;
    const d = new Date(date).getTime();
    if (from && d < new Date(from).getTime()) return false;
    if (to && d > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  }

  readonly filtered = computed<HistoryRow[]>(() => {
    const f = this.filters();
    const formEmp = this.formEmployerById();
    const formSec = this.formSectionById();
    const statuses = this.controlStatuses();
    const locEmp = f.locationId ? this.locationEmployerById().get(f.locationId) : null;
    return this.rows().filter(
      (r) =>
        (!f.userId || r.userId === f.userId) &&
        (!f.formId || r.formId === f.formId) &&
        (!f.sectionId || formSec.get(r.formId) === f.sectionId) &&
        (locEmp == null || formEmp.get(r.formId) === locEmp) &&
        (!f.statusNome || (statuses[r.id] ?? []).includes(f.statusNome)) &&
        this.dateInRange(r.dataEmissao, f.de, f.ate) &&
        (this.textMatch(r.formNome, f.texto) ||
          this.textMatch(r.userNome, f.texto) ||
          this.textMatch(r.userEmail, f.texto) ||
          this.textMatch(r.observacao, f.texto) ||
          this.textMatch(r.fileNome, f.texto) ||
          this.textMatch(r.locationNome, f.texto) ||
          this.textMatch(r.sectionNome, f.texto)),
    );
  });

  // ============================================================
  //  PAGINAÇÃO (client-side sobre `filtered`)
  // ============================================================
  readonly pageSize = signal(10);
  readonly page = signal(1);

  /** Total de itens após os filtros. */
  readonly totalItems = computed(() => this.filtered().length);

  /** Total de páginas (mínimo 1). */
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  /** Página atual sempre dentro do intervalo válido (clamp — dispensa effect). */
  readonly currentPage = computed(() => Math.min(Math.max(1, this.page()), this.totalPages()));

  /** Fatia visível da timeline. */
  readonly paged = computed<HistoryRow[]>(() => {
    const size = this.pageSize();
    const start = (this.currentPage() - 1) * size;
    return this.filtered().slice(start, start + size);
  });

  /** Índice do primeiro item exibido (1-based; 0 quando vazio). */
  readonly pageStart = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );

  /** Índice do último item exibido. */
  readonly pageEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalItems()),
  );

  /** Janela de números de página para os botões (até 5). */
  readonly pageNumbers = computed<number[]>(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const janela = 5;
    let start = Math.max(1, cur - Math.floor(janela / 2));
    const end = Math.min(total, start + janela - 1);
    start = Math.max(1, end - janela + 1);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  });

  goToPage(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }
  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }
  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }
  setPageSize(size: number): void {
    this.pageSize.set(Math.max(1, size));
    this.page.set(1);
  }

  // ───────── formatação de datas ─────────
  private readonly dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
  private readonly dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  data(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const t = new Date(d);
    return isNaN(t.getTime()) ? '—' : this.dateFmt.format(t);
  }
  dataHora(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const t = new Date(d);
    return isNaN(t.getTime()) ? '—' : this.dateTimeFmt.format(t);
  }

  ngOnInit(): void {
    this.reload();
  }

  private unwrap<T>(res: unknown): T[] {
    if (res == null) return [];
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r['data'] ?? r['items'] ?? r['results'] ?? []) as T[];
  }

  /**
   * Busca TODOS os registros de um endpoint paginado, sem cap fixo.
   *
   * Estratégia (custo mínimo + escalável):
   *  1) faz 1 requisição do primeiro "chunk" (padrão 1000). Se tudo couber
   *     numa página — caso atual — resolve com essa única requisição
   *     (mesmo desempenho de antes, sem regressão);
   *  2) se houver mais páginas, busca as restantes EM PARALELO com
   *     concorrência limitada (evita disparar dezenas de chamadas de uma vez)
   *     e concatena os resultados preservando a ordem das páginas.
   *
   * Assim o `getAll(1000, 1)` fixo deixa de "perder" registros quando o
   * volume ultrapassar o chunk.
   */
  private fetchAllPages<T>(
    load: (limit: number, page: number) => Observable<PaginatedResult<T>>,
    chunk = 1000,
    concorrencia = 4,
  ): Observable<T[]> {
    return load(chunk, 1).pipe(
      switchMap((first) => {
        const data = first?.data ?? [];
        const limit = first?.limit || chunk;
        const total = first?.total ?? data.length;
        const pages = first?.totalPages ?? (limit > 0 ? Math.ceil(total / limit) : 1);

        // Cabe tudo na primeira página → uma única requisição.
        if (!pages || pages <= 1) return of(data);

        // Páginas 2..pages em paralelo (concorrência limitada) e em ordem.
        return range(2, pages - 1).pipe(
          mergeMap((p) => load(limit, p), concorrencia),
          toArray(),
          map((restantes) => {
            const ordenadas = restantes
              .slice()
              .sort((a, b) => (a.page ?? 0) - (b.page ?? 0))
              .flatMap((r) => r?.data ?? []);
            return [...data, ...ordenadas];
          }),
        );
      }),
    );
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.page.set(1); // volta para a primeira página ao recarregar
    // limpa caches de expansão para não misturar com dados antigos
    this.expandedId.set(null);
    this.expandedData.set({});
    this.expandedHistory.set({});
    this.expandedMachineData.set({});
    this.cancelarEdicao();

    const failLog = (label: string) =>
      catchError((err: unknown) => {
        console.error(`Falha ao carregar ${label}:`, err);
        return of(null);
      });

    forkJoin({
      controls: this.fetchAllPages<Control>((l, p) => this.controlService.getAll(l, p)).pipe(
        failLog('controles'),
      ),
      forms: this.fetchAllPages<Form>((l, p) => this.formService.getAll(l, p)).pipe(
        failLog('formulários'),
      ),
      users: this.fetchAllPages<UserProfile>((l, p) =>
        this.userService.getAllUserProfile(l, p),
      ).pipe(failLog('usuários')),
      files: this.fetchAllPages<File>((l, p) => this.fileService.getAll(l, p)).pipe(
        failLog('arquivos'),
      ),
      answers: this.fetchAllPages<Answer>((l, p) => this.answerService.getAll(l, p)).pipe(
        failLog('parâmetros'),
      ),
      machines: this.fetchAllPages<Machine>((l, p) => this.machineService.getAll(l, p)).pipe(
        failLog('máquinas'),
      ),
      sections: this.fetchAllPages<Section>((l, p) => this.sectionService.getAll(l, p)).pipe(
        failLog('seções'),
      ),
      locations: this.fetchAllPages<Location>((l, p) => this.locationService.getAll(l, p)).pipe(
        failLog('locais'),
      ),
      limits: this.fetchAllPages<LimitAnswer>((l, p) => this.limitService.getAll(l, p)).pipe(
        failLog('limites'),
      ),
      repairers: this.fetchAllPages<RepairerAnswerResult>((l, p) =>
        this.repairerService.getAll(l, p),
      ).pipe(failLog('reparadores')),
    }).subscribe({
      next: ({ controls, forms, users, files, answers, machines, sections, locations, limits, repairers }) => {
        if (controls == null) {
          this.error.set('Não foi possível carregar o histórico.');
        }
        this.controls.set(this.unwrap<Control>(controls));
        this.forms.set(this.unwrap<Form>(forms));
        this.users.set(this.unwrap<UserProfile>(users));
        this.files.set(this.unwrap<File>(files));
        this.answers.set(this.unwrap<Answer>(answers));
        this.machines.set(this.unwrap<Machine>(machines));
        this.sections.set(this.unwrap<Section>(sections));
        this.locations.set(this.unwrap<Location>(locations));

        // mapa answerId → limite ativo (para avaliar edições)
        const limitMap: Record<string, LimitAnswer> = {};
        for (const l of this.unwrap<LimitAnswer>(limits)) {
          if (l.status === 1) limitMap[l.answerId] = l;
        }
        this.limitsByAnswer.set(limitMap);

        const repMap: Record<string, string> = {};
        for (const rep of this.unwrap<RepairerAnswerResult>(repairers)) {
          const arId = (rep as { answerResultId?: string }).answerResultId ?? '';
          const uid = (rep as { userId?: string }).userId ?? '';
          if (arId && uid) repMap[arId] = uid;
        }
        this.repairerByAnswerResultId.set(repMap);

        this.loading.set(false);

        // busca status apenas dos controles VISÍVEIS (dentro do escopo permitido)
        const visiveis = this.controls().filter((c) => this.isFormAllowed(c.formId));
        if (!visiveis.length) {
          this.controlStatuses.set({});
          return;
        }
        forkJoin(
          visiveis.map((c) =>
            this.controlStatusService
              .getStatusNamesByControl(c.id)
              .pipe(catchError(() => of([] as string[]))),
          ),
        ).subscribe((results) => {
          const map: Record<string, string[]> = {};
          visiveis.forEach((c, i) => (map[c.id] = results[i] as string[]));
          this.controlStatuses.set(map);
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar o histórico.');
      },
    });
  }

  reparadorDaVersao(answerResultIds: string[]): string | null {
    const repMap = this.repairerByAnswerResultId();
    const userById = new Map(this.users().map((u) => [u.userId, u]));
    for (const id of answerResultIds) {
      const userId = repMap[id];
      if (userId) {
        const user = userById.get(userId);
        return user?.userUsername ?? userId;
      }
    }
    return null;
  }

  reparadorDoControle(controlId: string): string | null {
    const params = this.expandedData()[controlId] ?? [];
    const repMap = this.repairerByAnswerResultId();
    const userById = new Map(this.users().map((u) => [u.userId, u]));
    for (const p of params) {
      if (!p.answerResultId) continue;
      const userId = repMap[p.answerResultId];
      if (userId) {
        const user = userById.get(userId);
        return user?.userUsername ?? userId;
      }
    }
    return null;
  }
}
