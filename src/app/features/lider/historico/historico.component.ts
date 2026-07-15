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
import { forkJoin, firstValueFrom, from, Observable, of, range } from 'rxjs';
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

import { ScrollTopComponent } from '../../scroll-top/scroll-top.component';
import { SignatureComponent } from '../../../core/components/signature/signature.component';

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
  answerResultId: string | null;
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
  answerResultIds: string[]; // IDs deste lote (para resolver o reparador)
}

@Component({
  selector: 'app-historico-lider',
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

  /**
   * controlId → nome do ÚLTIMO operador/reparador inserido (mais recente).
   * Resolvido ao montar o modo normal, a partir do answer_result mais novo
   * que possua reparador vinculado.
   */
  readonly operatorByControl = signal<Record<string, string | null>>({});

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly controlStatuses = signal<Record<string, string[]>>({});

  // ───────── edição por status ─────────
  readonly editId = signal<string | null>(null);
  readonly editValues = signal<Record<string, string>>({});
  readonly editObs = signal<string>('');
  readonly savingEdit = signal(false);

  // ───────── reparador da correção (opcional) ─────────
  readonly repairerQuery = signal<string>('');

  readonly repairerResolved = computed<UserProfile | null>(() =>
    this.resolveRepairer(this.repairerQuery()),
  );

  readonly repairerOptions = computed(() => {
    const term = this.repairerQuery().trim().toLowerCase();
    const base = term
      ? this.users().filter(
          (u) =>
            (u.userUsername ?? '').toLowerCase().includes(term) ||
            this.matricula(u).toLowerCase().includes(term),
        )
      : this.users();
    return base.slice(0, 20).map((u) => ({
      id: u.userId,
      matricula: this.matricula(u),
      nome: u.userUsername ?? u.userId,
    }));
  });

  updateRepairer(value: string): void {
    this.repairerQuery.set(value);
  }

  /** Mapa compartilhado userId → UserProfile (evita reconstruir em cada chamada). */
  private readonly userByIdMap = computed(() => new Map(this.users().map((u) => [u.userId, u])));

  private matricula(u: UserProfile): string {
    return String(u.employeeMatricula ?? '').trim();
  }

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
  readonly allowedLocations = computed(() => this.auth.locations());

  private isLocationAllowed(loc: Location | null | undefined): boolean {
    if (!loc) return false;
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return true;
    return allowed.includes(loc.nome) || allowed.includes(loc.id);
  }

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

  private isFormAllowed(formId: string): boolean {
    const p = this.permittedFormIds();
    return !p || p.has(formId);
  }

  // ───────── mapas para o filtro por local ─────────
  private readonly formEmployerById = computed(() => {
    const secEmp = new Map(this.sections().map((s) => [s.id, s.employerId]));
    const m = new Map<string, string>();
    for (const f of this.forms()) m.set(f.id, secEmp.get(f.sectionId) ?? '');
    return m;
  });

  private readonly formSectionById = computed(
    () => new Map(this.forms().map((f) => [f.id, f.sectionId])),
  );

  private readonly locationEmployerById = computed(
    () => new Map(this.locations().map((l) => [l.id, l.employerId])),
  );

  private readonly answersByForm = computed(() => {
    const m = new Map<string, Answer[]>();
    for (const a of this.answers()) {
      const list = m.get(a.formId);
      if (list) list.push(a);
      else m.set(a.formId, [a]);
    }
    return m;
  });

  private readonly machineNameById = computed(
    () => new Map(this.machines().map((m) => [m.id, m.nome])),
  );

  private readonly permittedEmployerIds = computed<Set<string> | null>(() => {
    const allowed = this.allowedLocations();
    if (allowed.length === 0) return null;
    return new Set(
      this.locations()
        .filter((l) => this.isLocationAllowed(l))
        .map((l) => l.employerId),
    );
  });

  readonly locationOptions = computed(() =>
    this.locations()
      .filter((l) => this.isLocationAllowed(l))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((l) => ({ value: l.id, label: l.nome })),
  );

  readonly sectionOptions = computed(() => {
    const f = this.filters();
    const pe = this.permittedEmployerIds();
    const selEmp = f.locationId ? this.locationEmployerById().get(f.locationId) : null;
    return this.sections()
      .filter((s) => (!pe || pe.has(s.employerId)) && (selEmp == null || s.employerId === selEmp))
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
      .map((s) => ({ value: s.id, label: s.nome || s.id }));
  });

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

  readonly formOptionsCascata = this.formOptions;

  readonly userOptions = computed(() =>
    [...this.users()]
      .sort((a, b) => (a.userUsername ?? '').localeCompare(b.userUsername ?? ''))
      .map((u) => ({ value: u.userId, label: u.userUsername || u.userId })),
  );

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
      if (key === 'locationId') {
        next.sectionId = '';
        next.formId = '';
      } else if (key === 'sectionId') {
        next.formId = '';
      }
      return next;
    });
    this.page.set(1);
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
    this.page.set(1);
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
  private getDataCriacao(r: Record<string, unknown>): number {
    const raw = r['dataCriacao'] ?? r['data_criacao'] ?? r['createdAt'] ?? r['created_at'] ?? null;
    if (!raw) return 0;
    const ms = new Date(raw as string).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  private sortByDataAsc<T extends Record<string, unknown>>(records: T[]): T[] {
    return [...records].sort((a, b) => this.getDataCriacao(a) - this.getDataCriacao(b));
  }

  private agruparVersoes(records: (AnswerResult & Record<string, unknown>)[]): VersaoResposta[] {
    if (!records.length) return [];
    const versoes: VersaoResposta[] = [];
    let lote: typeof records = [];
    let prevMs = this.getDataCriacao(records[0]);

    for (const r of records) {
      const ms = this.getDataCriacao(r);
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
    if (this.expandedId() === row.id) {
      this.expandedId.set(null);
      this.cancelarEdicao();
      return;
    }

    if (!this.isFormAllowed(row.formId)) {
      this.error.set('Você não tem acesso a este local.');
      return;
    }

    this.error.set(null);
    this.expandedId.set(row.id);
    this.cancelarEdicao();

    if (this.expandedData()[row.id] || this.expandedMachineData()[row.id]) return;

    const answers = this.answersByForm().get(row.formId) ?? [];
    if (!answers.length) {
      this.expandedData.update((d) => ({ ...d, [row.id]: [] }));
      return;
    }

    this.expandedLoading.set(row.id);

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

    // ordena por data asc → o último por answerId é o valor atual
    const ordenados = this.sortByDataAsc(
      allResults as unknown as Record<string, unknown>[],
    ) as unknown as typeof allResults;

    const latestMap = new Map<string, (typeof ordenados)[number]>();
    for (const r of ordenados) latestMap.set(r.AnswerId, r);

    const linhas: ParamRow[] = answers.map((a) => {
      const res = latestMap.get(a.id);
      return {
        answerId: a.id,
        nome: a.nome,
        resposta: res?.resposta ?? '—',
        limitsAnswerId: res?.limitsAnswerId ?? null,
        answerResultId: res ? ((res as { id?: string }).id ?? null) : null,
      };
    });

    this.expandedData.update((d) => ({ ...d, [controlId]: linhas }));

    const versoes = this.agruparVersoes(
      ordenados as unknown as (AnswerResult & Record<string, unknown>)[],
    );
    this.expandedHistory.update((d) => ({ ...d, [controlId]: versoes }));

    // ── operador = ÚLTIMO reparador inserido (answer_result mais recente) ──
    this.operatorByControl.update((m) => ({
      ...m,
      [controlId]: this.resolverUltimoOperador(ordenados),
    }));
  }

  /**
   * Percorre os answer_results do MAIS RECENTE ao mais antigo e devolve o nome
   * do primeiro que tiver reparador vinculado — ou seja, o ÚLTIMO operador
   * inserido (não o primeiro criado).
   */
  private resolverUltimoOperador(
    ordenadosAsc: { id?: string }[] | (AnswerResult & { id?: string })[],
  ): string | null {
    const repMap = this.repairerByAnswerResultId();
    const userById = this.userByIdMap();
    for (let i = ordenadosAsc.length - 1; i >= 0; i--) {
      const id = (ordenadosAsc[i] as { id?: string }).id;
      const uid = id ? repMap[id] : undefined;
      if (uid) return userById.get(uid)?.userUsername ?? uid;
    }
    return null;
  }

  // ============================================================
  //  EDIÇÃO POR STATUS
  // ============================================================
  statusTipo(controlId: string): number | null {
    const nomes = this.controlStatuses()[controlId];
    if (!nomes?.length) return null;
    const last = (nomes[nomes.length - 1] ?? '').toLowerCase();
    if (last.includes('normaliz')) return 1;
    if (last.includes('corre')) return 2;
    if (last.includes('pend')) return 3;
    return null;
  }

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

  podeEditarCampos(controlId: string): boolean {
    return this.nivelEdicao(controlId) === 'campos';
  }

  podeEditarObs(controlId: string): boolean {
    return this.nivelEdicao(controlId) !== null;
  }

  iniciarEdicao(row: HistoryRow): void {
    this.error.set(null);
    this.editId.set(row.id);
    this.editObs.set(row.observacao ?? '');
    this.repairerQuery.set('');

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

    const editorId = this.auth.userId();
    const reatribuir = !!editorId && editorId !== row.userId;

    const repairerId = this.repairerResolved()?.userId ?? null;
    const repairerNome = this.repairerResolved()?.userUsername ?? repairerId;

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
                .pipe(switchMap((created) => this.linkRepairer(created, repairerId))),
            );
          }
        }
      }

      if (camposMudaram) {
        novoStatusId = tudoDentroDoLimite ? '1' : '2';
      }
    }

    const novaObs = this.editObs().trim();
    const obsAtual = (row.observacao ?? '').trim();
    const obsMudou = this.podeEditarObs(row.id) && novaObs !== obsAtual;

    if (!camposMudaram && !obsMudou) {
      this.cancelarEdicao();
      return;
    }

    const precisaAssinar = camposMudaram || (reatribuir && obsMudou);

    let novoUserId: string | null = null;
    let novoFileId: string | null = null;

    if (precisaAssinar) {
      const assinatura = await this.pedirAssinatura();
      if (!assinatura) return;

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
        novoUserId = editorId;
        novoFileId = file.id;
        this.files.update((list) => [
          ...list,
          { ...file, nome: (file as { nome?: string }).nome ?? `assinatura_${editorId}` },
        ]);
      } catch {
        this.savingEdit.set(false);
        this.error.set('Falha ao salvar a assinatura.');
        return;
      }
    } else {
      this.savingEdit.set(true);
    }

    const ops: Observable<unknown>[] = [...fieldOps];
    if (novoStatusId) ops.push(this.controlStatusService.update(row.id, novoStatusId));

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

    const houveReparador = !!repairerId && camposMudaram && !this.expandedMachineData()[row.id];

    forkJoin(ops).subscribe({
      next: () => {
        this.aplicarEdicaoLocal(
          row.id,
          obsMudou ? novaObs || null : row.observacao,
          novoUserId,
          novoFileId,
        );
        if (Object.keys(changedNormal).length && !this.expandedMachineData()[row.id]) {
          this.anexarVersao(row.id, changedNormal);
        }
        // Reflete imediatamente o ÚLTIMO operador (esta correção é a mais recente).
        if (houveReparador) {
          this.operatorByControl.update((m) => ({ ...m, [row.id]: repairerNome }));
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

  private linkRepairer(created: AnswerResult, repairerId: string | null): Observable<AnswerResult> {
    const answerResultId = (created as { id?: string })?.id;
    if (!repairerId || !answerResultId) return of(created);
    return this.repairerService.create({ answerResultId, userId: repairerId }).pipe(
      map(() => {
        // mantém o mapa local coerente para futuras resoluções de operador
        this.repairerByAnswerResultId.update((m) => ({ ...m, [answerResultId]: repairerId }));
        return created;
      }),
      catchError((err) => {
        console.error('Falha ao vincular o reparador à correção:', err);
        return of(created);
      }),
    );
  }

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

  private anexarVersao(
    controlId: string,
    valores: Record<string, string>,
    answerResultIds: string[] = [],
  ): void {
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

  private atualizarStatusLocal(controlId: string): void {
    this.controlStatusService
      .getStatusNamesByControl(controlId)
      .pipe(catchError(() => of([] as string[])))
      .subscribe((nomes) => {
        this.controlStatuses.update((m) => ({ ...m, [controlId]: nomes as string[] }));
      });
  }

  private aplicarEdicaoLocal(
    controlId: string,
    obs: string | null,
    novoUserId: string | null = null,
    novoFileId: string | null = null,
  ): void {
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
    const locationByEmployer = new Map(this.locations().map((l) => [l.employerId, l]));
    const userById = this.userByIdMap();
    const fileById = new Map(this.files().map((f) => [String(f['id']), f]));
    const statusMap = this.controlStatuses();

    return this.controls()
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
      .sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime());
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
  //  PAGINAÇÃO DA TIMELINE (client-side sobre `filtered`)
  // ============================================================
  readonly pageSize = signal(10);
  readonly page = signal(1);

  readonly totalItems = computed(() => this.filtered().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  readonly currentPage = computed(() => Math.min(Math.max(1, this.page()), this.totalPages()));

  readonly paged = computed<HistoryRow[]>(() => {
    const size = this.pageSize();
    const start = (this.currentPage() - 1) * size;
    return this.filtered().slice(start, start + size);
  });

  readonly pageStart = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1,
  );
  readonly pageEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.totalItems()),
  );
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

  // ============================================================
  //  PAGINAÇÃO POR DEMANDA — HISTÓRICO DE CORREÇÕES (por controle)
  //  Mostra as correções anteriores (mais recentes primeiro) em lotes,
  //  com "Carregar mais". Não busca nada novo: apenas revela mais itens
  //  já carregados, então não há custo de rede nem perda de desempenho.
  // ============================================================
  readonly correcoesPageSize = signal(5);
  private readonly correcoesVisible = signal<Record<string, number>>({});

  /** Correções ANTERIORES (todas menos a versão atual), mais recentes primeiro. */
  correcoesAnteriores(controlId: string): VersaoResposta[] {
    const versoes = this.expandedHistory()[controlId] ?? [];
    if (versoes.length <= 1) return [];
    return versoes.slice(0, -1).reverse();
  }

  totalCorrecoes(controlId: string): number {
    return this.correcoesAnteriores(controlId).length;
  }

  private correcoesLimite(controlId: string): number {
    return this.correcoesVisible()[controlId] ?? this.correcoesPageSize();
  }

  /** Fatia visível das correções anteriores (paginação por demanda). */
  correcoesVisiveis(controlId: string): VersaoResposta[] {
    return this.correcoesAnteriores(controlId).slice(0, this.correcoesLimite(controlId));
  }

  temMaisCorrecoes(controlId: string): boolean {
    return this.totalCorrecoes(controlId) > this.correcoesLimite(controlId);
  }

  correcoesRestantes(controlId: string): number {
    return Math.max(0, this.totalCorrecoes(controlId) - this.correcoesLimite(controlId));
  }

  verMaisCorrecoes(controlId: string): void {
    this.correcoesVisible.update((m) => ({
      ...m,
      [controlId]: this.correcoesLimite(controlId) + this.correcoesPageSize(),
    }));
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

        if (!pages || pages <= 1) return of(data);

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
    this.page.set(1);
    this.expandedId.set(null);
    this.expandedData.set({});
    this.expandedHistory.set({});
    this.expandedMachineData.set({});
    this.operatorByControl.set({});
    this.correcoesVisible.set({});
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
      next: ({
        controls,
        forms,
        users,
        files,
        answers,
        machines,
        sections,
        locations,
        limits,
        repairers,
      }) => {
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

        // Status apenas dos controles VISÍVEIS, com concorrência limitada
        // (evita disparar centenas/milhares de requisições simultâneas).
        const visiveis = this.controls().filter((c) => this.isFormAllowed(c.formId));
        if (!visiveis.length) {
          this.controlStatuses.set({});
          return;
        }
        from(visiveis)
          .pipe(
            mergeMap(
              (c) =>
                this.controlStatusService.getStatusNamesByControl(c.id).pipe(
                  map((nomes) => ({ id: c.id, nomes: nomes as string[] })),
                  catchError(() => of({ id: c.id, nomes: [] as string[] })),
                ),
              6,
            ),
            toArray(),
          )
          .subscribe((list) => {
            const map: Record<string, string[]> = {};
            for (const it of list) map[it.id] = it.nomes;
            this.controlStatuses.set(map);
          });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar o histórico.');
      },
    });
  }

  /** Operador/reparador de uma versão específica = o ÚLTIMO inserido no lote. */
  reparadorDaVersao(answerResultIds: string[]): string | null {
    const repMap = this.repairerByAnswerResultId();
    const userById = this.userByIdMap();
    for (let i = answerResultIds.length - 1; i >= 0; i--) {
      const userId = repMap[answerResultIds[i]];
      if (userId) return userById.get(userId)?.userUsername ?? userId;
    }
    return null;
  }

  /** Operador/reparador do controle = o ÚLTIMO inserido (mais recente). */
  reparadorDoControle(controlId: string): string | null {
    return this.operatorByControl()[controlId] ?? null;
  }
}
