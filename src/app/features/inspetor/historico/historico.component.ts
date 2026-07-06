import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Control, ControlUpdate } from '../../../core/models/control.model';
import { Form } from '../../../core/models/form.model';
import { User } from '../../../core/models/user.model';
import { Answer } from '../../../core/models/answer.model';
import { Machine } from '../../../core/models/machine.model';
import { Section } from '../../../core/models/section.model';
import { Location } from '../../../core/models/location.model';
import { AnswerResult } from '../../../core/models/answer-result.model';
import { MachineAnswerResult } from '../../../core/models/machine-answer-result.model';
import { LimitAnswer } from '../../../core/models/limit-answer.model';

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
import { StatusService } from '../../../core/services/status.service';
import { ControlStatusService } from '../../../core/services/control-status.service';

type FileLike = Record<string, unknown>;

interface HistoryRow {
  id: string;
  formId: string;
  formNome: string;
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

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historico.component.html',
  styleUrl: './historico.component.css',
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
  private readonly status = inject(StatusService);

  readonly controls = signal<Control[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly users = signal<User[]>([]);
  readonly files = signal<FileLike[]>([]);
  readonly answers = signal<Answer[]>([]); // todos os parâmetros (carregados 1x)
  readonly machines = signal<Machine[]>([]); // todas as máquinas (para resolver nomes)
  readonly sections = signal<Section[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly expandedId = signal<string | null>(null);
  readonly expandedLoading = signal<string | null>(null);
  readonly expandedData = signal<
    Record<string, { answerId: string; nome: string; resposta: string; limitsAnswerId: string | null }[]>
  >({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly controlStatuses = signal<Record<string, string[]>>({});

  // ───────── edição por status ─────────
  /** controlId → statusId atual (string). */
  readonly controlStatusId = signal<Record<string, string>>({});
  /** controlId em edição (ou null). */
  readonly editId = signal<string | null>(null);
  /** valores editados: answerId (modo normal) OU machineId_answerId (modo máquina). */
  readonly editValues = signal<Record<string, string>>({});
  readonly editObs = signal<string>('');
  readonly savingEdit = signal(false);

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
      .sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''))
      .map((u) => ({ value: u.id, label: u.username || u.id })),
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
  }
  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    let n = 0;
    for (const v of Object.values(f)) if (v !== '') n++;
    return n;
  });

  // modo com máquina: { maquinas: string[], answers: string[], cells: Record<string,string> }
  readonly expandedMachineData = signal<
    Record<
      string,
      {
        maquinas: { id: string; nome: string }[];
        answers: { id: string; nome: string }[];
        cells: Record<string, string>; // chave: machineId_answerId
        cellLimits: Record<string, string | null>; // chave: machineId_answerId → limitsAnswerId
      }
    >
  >({});
  readonly hasFilter = computed(() => this.activeFilterCount() > 0);
  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
  }

  // ───────── resolução de arquivo (defensiva) ─────────
  private fileName(file: FileLike | undefined, fallback: string): string {
    if (!file) return fallback;
    return (
      (file['nome'] as string) ??
      (file['originalName'] as string) ??
      (file['fileName'] as string) ??
      (file['name'] as string) ??
      (file['descricao'] as string) ??
      fallback
    );
  }
  private fileUrl(file: FileLike | undefined): string | null {
    if (!file) return null;
    return (
      (file['url'] as string) ?? (file['path'] as string) ?? (file['caminho'] as string) ?? null
    );
  }

  // ───────── Para Layout do HTML ─────────

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

    this.expandedId.set(row.id);
    this.cancelarEdicao();

    // garante o statusId atual do controle (para liberar/limitar a edição)
    this.fetchStatusId(row.id);

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
      machineResults: this.machineAnswerResultService
        .getControlIdAll(row.id, 1000, 1)
        .pipe(catchError(() => of(null))),
      answerResults: this.answerResultService
        .getControlIdAll(row.id, 1000, 1)
        .pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ machineResults, answerResults }) => {
        const answerIdSet = new Set(answers.map((a) => a.id));
        const allMachine = this.unwrap<MachineAnswerResult>(machineResults).filter((r) =>
          answerIdSet.has(r.answerId),
        );

        if (allMachine.length > 0) {
          const machineIds = [...new Set(allMachine.map((r) => r.machineId))];
          const nameById = this.machineNameById();
          const maquinas = machineIds.map((id) => ({ id, nome: nameById.get(id) ?? id }));
          const cells: Record<string, string> = {};
          const cellLimits: Record<string, string | null> = {};
          for (const r of allMachine) {
            const key = `${r.machineId}_${r.answerId}`;
            cells[key] = r.resposta;
            cellLimits[key] = (r as { limitsAnswerId?: string | null }).limitsAnswerId ?? null;
          }

          this.expandedMachineData.update((d) => ({
            ...d,
            [row.id]: {
              maquinas,
              answers: answers.map((a) => ({ id: a.id, nome: a.nome })),
              cells,
              cellLimits,
            },
          }));
        } else {
          // modo normal — lista parâmetro + resposta (guarda answerId/limitsAnswerId p/ edição)
          const resultMap = new Map(
            this.unwrap<AnswerResult>(answerResults).map((r) => [r.AnswerId, r]),
          );
          const linhas = answers.map((a) => {
            const res = resultMap.get(a.id) as
              | (AnswerResult & { limitsAnswerId?: string | null })
              | undefined;
            return {
              answerId: a.id,
              nome: a.nome,
              resposta: res?.resposta ?? '—',
              limitsAnswerId: res?.limitsAnswerId ?? null,
            };
          });
          this.expandedData.update((d) => ({ ...d, [row.id]: linhas }));
        }

        this.expandedLoading.set(null);
      },
      error: () => this.expandedLoading.set(null),
    });
  }

  // ============================================================
  //  EDIÇÃO POR STATUS (1/2 = campos + obs, 3 = só obs)
  // ============================================================

  /** Busca (e memoiza) o statusId atual do controle. */
  private fetchStatusId(controlId: string): void {
    if (this.controlStatusId()[controlId] != null) return;
    this.controlStatusService
      .getByControl(controlId)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.controlStatusId.update((m) => ({ ...m, [controlId]: this.extractStatusId(res) }));
      });
  }

  /** Extrai o statusId do retorno de getByControl (objeto único ou lista → mais recente). */
  private extractStatusId(res: unknown): string {
    if (res == null) return '';
    const pick = Array.isArray(res)
      ? this.maisRecente(res as any[], (s: any) => s.dataAlteracao ?? s.dataCriacao)
      : res;
    return String((pick as any)?.statusId ?? '').trim();
  }

  /** Item mais recente de uma lista, pela data extraída em getDate (desc). */
  private maisRecente<T>(
    list: T[],
    getDate: (item: T) => Date | string | null | undefined,
  ): T | undefined {
    return [...list].sort(
      (a, b) => new Date(getDate(b) ?? 0).getTime() - new Date(getDate(a) ?? 0).getTime(),
    )[0];
  }

  /** Tipo do status atual do controle (1, 2, 3…) ou null. */
  statusTipo(controlId: string): number | null {
    const raw = this.controlStatusId()[controlId];
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }

  /** Pode editar os campos (respostas)? Só normalizado (1) ou correção (2). */
  podeEditarCampos(controlId: string): boolean {
    const t = this.statusTipo(controlId);
    return t === 1 || t === 2;
  }

  /** Pode editar a observação? Normalizado (1), correção (2) ou pendente (3). */
  podeEditarObs(controlId: string): boolean {
    const t = this.statusTipo(controlId);
    return t === 1 || t === 2 || t === 3;
  }

  iniciarEdicao(row: HistoryRow): void {
    this.error.set(null);
    this.editId.set(row.id);
    this.editObs.set(row.observacao ?? '');

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

  salvarEdicao(row: HistoryRow): void {
    const tipo = this.statusTipo(row.id);
    if (tipo == null) return;

    this.error.set(null);
    const ops: Observable<unknown>[] = [];
    const vals = this.editValues();
    let novoStatusId: string | null = null;

    // Campos só quando normalizado (1) ou correção (2).
    if (this.podeEditarCampos(row.id)) {
      let camposMudaram = false;
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
          const finalVal = novo || atual; // valor que vale após a edição

          if (finalVal && !this.dentroDoLimite(answerId, finalVal)) tudoDentroDoLimite = false;

          if (novo && novo !== atual) {
            camposMudaram = true;
            ops.push(
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
            ops.push(
              this.answerResultService.create({
                AnswerId: p.answerId,
                controlId: row.id,
                resposta: novo,
                limitsAnswerId: p.limitsAnswerId ?? null,
              }),
            );
          }
        }
      }

      // Só reavalia/atualiza o status se algum campo mudou.
      // Dentro dos limites → 1 (normalizado); algum fora → 2 (correção).
      if (camposMudaram) {
        novoStatusId = tudoDentroDoLimite ? '1' : '2';
        ops.push(this.controlStatusService.update(row.id, novoStatusId));
      }
    }

    // Observação (sempre que puder editar — 1/2/3).
    const novaObs = this.editObs().trim();
    const obsAtual = (row.observacao ?? '').trim();
    const obsMudou = this.podeEditarObs(row.id) && novaObs !== obsAtual;
    if (obsMudou) {

      const payload: ControlUpdate = {
        userId: row.userId,
        fileId: row.fileId,
        observacao: novaObs || null,
      };

      ops.push(this.controlService.update(row.id, payload));
    }

    if (!ops.length) {
      this.cancelarEdicao();
      return;
    }

    this.savingEdit.set(true);
    forkJoin(ops).subscribe({
      next: () => {
        this.aplicarEdicaoLocal(row.id, obsMudou ? novaObs || null : row.observacao);
        if (novoStatusId) this.atualizarStatusLocal(row.id, novoStatusId);
        this.savingEdit.set(false);
        this.cancelarEdicao();
      },
      error: () => {
        this.savingEdit.set(false);
        this.error.set('Erro ao salvar as alterações.');
      },
    });
  }

  /** Atualiza o status no estado local e recarrega o nome do status (chip). */
  private atualizarStatusLocal(controlId: string, statusId: string): void {
    this.controlStatusId.update((m) => ({ ...m, [controlId]: statusId }));
    this.controlStatusService
      .getStatusNamesByControl(controlId)
      .pipe(catchError(() => of([] as string[])))
      .subscribe((nomes) => {
        this.controlStatuses.update((m) => ({ ...m, [controlId]: nomes as string[] }));
      });
  }

  /** Reflete a edição no estado local (sem refazer as buscas). */
  private aplicarEdicaoLocal(controlId: string, obs: string | null): void {
    // observação → atualiza o controle (rows deriva daqui)
    this.controls.update((list) =>
      list.map((c) => (c.id === controlId ? { ...c, observacao: obs } : c)),
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
    const userById = new Map(this.users().map((u) => [u.id, u]));
    const fileById = new Map(this.files().map((f) => [String(f['id']), f]));
    const statusMap = this.controlStatuses();

    return (
      this.controls()
        // Restringe aos controles cujo formulário está num local permitido.
        .filter((c) => this.isFormAllowed(c.formId))
        .map((c) => {
          const form = formById.get(c.formId);
          const user = userById.get(c.userId);
          const file = fileById.get(c.fileId);
          return {
            id: c.id,
            formId: c.formId,
            formNome: form?.nome ?? c.formId,
            userId: c.userId,
            userNome: user?.username ?? c.userId,
            userEmail: user?.email ?? '',
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
          this.textMatch(r.fileNome, f.texto)),
    );
  });

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

  reload(): void {
    this.loading.set(true);
    this.error.set(null);

    const failLog = (label: string) =>
      catchError((err: unknown) => {
        console.error(`Falha ao carregar ${label}:`, err);
        return of(null);
      });

    forkJoin({
      controls: this.controlService.getAll(1000, 1).pipe(failLog('controles')),
      forms: this.formService.getAll(1000, 1).pipe(failLog('formulários')),
      users: this.userService.getAll(1000, 1).pipe(failLog('usuários')),
      files: this.fileService.getAll(1000, 1).pipe(failLog('arquivos')),
      answers: this.answerService.getAll(1000, 1).pipe(failLog('parâmetros')),
      machines: this.machineService.getAll(1000, 1).pipe(failLog('máquinas')),
      sections: this.sectionService.getAll(1000, 1).pipe(failLog('seções')),
      locations: this.locationService.getAll(1000, 1).pipe(failLog('locais')),
      limits: this.limitService.getAll(1000, 1).pipe(failLog('limites')),
    }).subscribe({
      next: ({ controls, forms, users, files, answers, machines, sections, locations, limits }) => {
        if (controls == null) {
          this.error.set('Não foi possível carregar o histórico.');
        }
        this.controls.set(this.unwrap<Control>(controls));
        this.forms.set(this.unwrap<Form>(forms));
        this.users.set(this.unwrap<User>(users));
        this.files.set(this.unwrap<FileLike>(files));
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

        this.loading.set(false);

        // busca status apenas dos controles VISÍVEIS (dentro do escopo permitido)
        const visiveis = this.unwrap<Control>(controls).filter((c) => this.isFormAllowed(c.formId));
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

  trackById(_: number, r: HistoryRow): string {
    return r.id;
  }
}