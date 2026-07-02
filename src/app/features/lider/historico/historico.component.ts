import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Control } from '../../../core/models/control.model';
import { Form } from '../../../core/models/form.model';
import { User } from '../../../core/models/user.model';
import { Answer } from '../../../core/models/answer.model';
import { AnswerResult } from '../../../core/models/answer-result.model';
import { MachineAnswerResult } from '../../../core/models/machine-answer-result.model';

import { ControlService } from '../../../core/services/control.service';
import { FormService } from '../../../core/services/form.service';
import { UserService } from '../../../core/services/user.service';
import { FileService } from '../../../core/services/file.service';
import { AnswerService } from '../../../core/services/answer.service';
import { AnswerResultService } from '../../../core/services/answer-result.service';
import { MachineAnswerResultService } from '../../../core/services/machine-answer-result.service';

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
}

interface Filters {
  texto: string;
  userId: string;
  formId: string;
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
  private readonly answerResultService = inject(AnswerResultService);
  private readonly machineAnswerResultService = inject(MachineAnswerResultService);

  readonly controls = signal<Control[]>([]);
  readonly forms = signal<Form[]>([]);
  readonly users = signal<User[]>([]);
  readonly files = signal<FileLike[]>([]);
  readonly expandedId = signal<string | null>(null);
  readonly expandedLoading = signal<string | null>(null);
  readonly expandedData = signal<Record<string, { nome: string; resposta: string }[]>>({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: Filters = { texto: '', userId: '', formId: '', de: '', ate: '' };
  readonly filters = signal<Filters>({ ...this.emptyFilters });

  updateFilter<K extends keyof Filters>(key: K, value: Filters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
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
  if (this.expandedId() === row.id) {
    this.expandedId.set(null);
    return;
  }

  this.expandedId.set(row.id);

  // já carregou antes — usa cache
  if (this.expandedData()[row.id] || this.expandedMachineData()[row.id]) return;

  this.expandedLoading.set(row.id);

  this.answerService.getAll(1000, 1).subscribe({
    next: (res) => {
      const answers = this.unwrap<Answer>(res).filter(a => a.formId === row.formId);

      if (!answers.length) {
        this.expandedData.update(d => ({ ...d, [row.id]: [] }));
        this.expandedLoading.set(null);
        return;
      }

      // busca machine_answer_result e answer_result em paralelo
      forkJoin({
        machineResults: this.machineAnswerResultService.getAll(1000, 1).pipe(catchError(() => of(null))),
        answerResults:  forkJoin(
          answers.map(a => this.answerResultService.getByAnswerId(a.id).pipe(catchError(() => of([]))))
        ),
      }).subscribe({
        next: ({ machineResults, answerResults }) => {
          const allMachine = this.unwrap<MachineAnswerResult>(machineResults)
            .filter(r => answers.some(a => a.id === r.answerId));

          if (allMachine.length > 0) {
            const machineIds = [...new Set(allMachine.map(r => r.machineId))];
            const maquinas = machineIds.map(id => ({ id, nome: id }));
            const cells: Record<string, string> = {};
            allMachine.forEach(r => {
              cells[`${r.machineId}_${r.answerId}`] = r.resposta;
            });
            this.expandedMachineData.update(d => ({
              ...d,
              [row.id]: {
                maquinas,
                answers: answers.map(a => ({ id: a.id, nome: a.nome })),
                cells,
              },
            }));
          } else {
            // modo normal — lista parâmetro + resposta
            const linhas = answers.map((a, i) => {
              const resultados = (answerResults[i] ?? []) as AnswerResult[];
              const ultimo = resultados.sort(
                (x, y) => new Date(y.dataCriacao).getTime() - new Date(x.dataCriacao).getTime()
              )[0];
              return { nome: a.nome, resposta: ultimo?.resposta ?? '—' };
            });
            this.expandedData.update(d => ({ ...d, [row.id]: linhas }));
          }

          this.expandedLoading.set(null);
        },
        error: () => this.expandedLoading.set(null),
      });
    },
    error: () => this.expandedLoading.set(null),
  });
}


  // ───────── linhas do histórico (mais recentes primeiro) ─────────
  readonly rows = computed<HistoryRow[]>(() => {
    const formById = new Map(this.forms().map((f) => [f.id, f]));
    const userById = new Map(this.users().map((u) => [u.id, u]));
    const fileById = new Map(this.files().map((f) => [String(f['id']), f]));

    return this.controls()
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
    return this.rows().filter(
      (r) =>
        (!f.userId || r.userId === f.userId) &&
        (!f.formId || r.formId === f.formId) &&
        this.dateInRange(r.dataEmissao, f.de, f.ate) &&
        (this.textMatch(r.formNome, f.texto) ||
          this.textMatch(r.userNome, f.texto) ||
          this.textMatch(r.userEmail, f.texto) ||
          this.textMatch(r.observacao, f.texto) ||
          this.textMatch(r.fileNome, f.texto)),
    );
  });

  readonly userOptions = computed(() =>
    [...this.users()]
      .sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''))
      .map((u) => ({ value: u.id, label: u.username || u.id })),
  );
  readonly formOptions = computed(() =>
    [...this.forms()]
      .sort((a, b) => (a.nome ?? '').localeCompare(b.nome ?? ''))
      .map((f) => ({ value: f.id, label: f.nome || f.id })),
  );

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
    forkJoin({
      controls: this.controlService.getAll(1000, 1).pipe(catchError(() => of(null))),
      forms: this.formService.getAll(1000, 1).pipe(catchError(() => of(null))),
      users: this.userService.getAll(1000, 1).pipe(catchError(() => of(null))),
      files: this.fileService.getAll(1000, 1).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ controls, forms, users, files }) => {
        if (controls == null) {
          this.error.set('Não foi possível carregar o histórico.');
        }
        this.controls.set(this.unwrap<Control>(controls));
        this.forms.set(this.unwrap<Form>(forms));
        this.users.set(this.unwrap<User>(users));
        this.files.set(this.unwrap<FileLike>(files));
        this.loading.set(false);
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
