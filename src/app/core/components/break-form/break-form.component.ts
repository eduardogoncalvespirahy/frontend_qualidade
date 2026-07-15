import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';

import { BreakFormService } from '../../services/break-form.service';
import { BreakForm } from '../../models/break-form.model';
import {
  canActivate,
  canDeactivate,
  isActive,
  isExpired,
  statusLabel,
  validateBreakTimes,
} from '../../helpers/break-rules.helper';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

/** Situação derivada usada no filtro. */
type Situacao = 'all' | 'ativa' | 'agendada' | 'expirada' | 'inativa';

interface BreakFilters {
  motivo: string;
  situacao: Situacao;
  usuario: string;
  de: string; // yyyy-mm-dd (por horaInicio)
  ate: string; // yyyy-mm-dd
}

@Component({
  selector: 'app-break-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './break-form.component.html',
  styleUrl: './break-form.component.css',
})
export class BreakFormComponent implements OnInit {
  private readonly service = inject(BreakFormService);
  private readonly auth = inject(AuthService);
  private readonly user = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  /** Formulário dono das paradas. */
  readonly formId = input.required<string>();

  readonly breaks = signal<BreakForm[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  /** Relógio: reavalia status e habilita/desabilita botões ao longo do tempo. */
  readonly now = signal(new Date());

  // ───────── paginação ─────────
  /** Tamanho de página FIXO por requisição ao backend (percorremos todas). */
  private readonly apiPageSize = 1000;
  /** Quantidade de cards por página exibida no componente. */
  readonly pageSize = signal(12);
  /** Página atual da exibição (1-based). */
  readonly page = signal(1);

  /** userId → nome (para exibir quem registrou a parada). */
  private readonly userNames = signal<Record<string, string>>({});

  // ───────── filtros ─────────
  readonly filtersOpen = signal(false);
  private readonly emptyFilters: BreakFilters = {
    motivo: '',
    situacao: 'all',
    usuario: '',
    de: '',
    ate: '',
  };
  readonly filters = signal<BreakFilters>({ ...this.emptyFilters });

  updateFilter<K extends keyof BreakFilters>(key: K, value: BreakFilters[K]): void {
    this.filters.update((f) => ({ ...f, [key]: value }));
    this.page.set(1);
  }
  resetFilters(): void {
    this.filters.set({ ...this.emptyFilters });
    this.page.set(1);
  }

  readonly activeFilterCount = computed(() => {
    const f = this.filters();
    let n = 0;
    if (f.motivo.trim()) n++;
    if (f.situacao !== 'all') n++;
    if (f.usuario.trim()) n++;
    if (f.de) n++;
    if (f.ate) n++;
    return n;
  });
  readonly hasFilter = computed(() => this.activeFilterCount() > 0);

  // ───────── formulário de criação (inline) ─────────
  readonly formOpen = signal(false);
  readonly novo = signal<{ horaInicio: string; horaFim: string; motivo: string }>({
    horaInicio: '',
    horaFim: '',
    motivo: '',
  });

  updateNovo<K extends 'horaInicio' | 'horaFim' | 'motivo'>(key: K, value: string): void {
    this.novo.update((v) => ({ ...v, [key]: value }));
  }

  /** Paradas mais recentes primeiro. */
  readonly ordenadas = computed(() =>
    [...this.breaks()].sort(
      (a, b) => new Date(b.horaInicio).getTime() - new Date(a.horaInicio).getTime(),
    ),
  );

  /** Lista após aplicar os filtros. */
  readonly filtradas = computed(() => {
    const f = this.filters();
    const now = this.now();
    return this.ordenadas().filter(
      (b) =>
        this.matchTexto(b.motivo, f.motivo) &&
        this.matchSituacao(b, f.situacao, now) &&
        this.matchTexto(this.userName(b.userId), f.usuario) &&
        this.dentroPeriodo(b, f.de, f.ate),
    );
  });

  /** Total de páginas de exibição (>= 1), sobre a lista filtrada. */
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtradas().length / this.pageSize())),
  );

  /** Fatia da página atual (com clamp defensivo). */
  readonly paginadas = computed(() => {
    const items = this.filtradas();
    const size = this.pageSize();
    const total = Math.max(1, Math.ceil(items.length / size));
    const current = Math.min(this.page(), total);
    const start = (current - 1) * size;
    return items.slice(start, start + size);
  });

  // ───────── regra de sobreposição ─────────
  /**
   * Parada ATIVA agora e SEM hora de fim (aberta/indefinida). SÓ esse caso
   * bloqueia a criação — uma parada ativa COM hora de fim permite criar outra
   * (que deverá começar após esse fim).
   */
  readonly paradaAbertaAtiva = computed(
    () => this.breaks().find((b) => isActive(b, this.now()) && !b.horaFim) ?? null,
  );
  /** Só bloqueia quando há uma parada ativa sem hora de fim. */
  readonly podeCriar = computed(() => !this.paradaAbertaAtiva());

  /**
   * Menor horaInicio permitida para uma nova parada (formato datetime-local):
   * após o fim da parada ativa (se houver uma ativa COM hora de fim), ou agora.
   */
  readonly minInicioNova = computed(() => {
    const now = this.now();
    const ativaComFim = this.breaks().find((b) => isActive(b, now) && !!b.horaFim);
    const base = ativaComFim?.horaFim ? new Date(ativaComFim.horaFim as unknown as string) : now;
    const floor = base.getTime() > now.getTime() ? base : now;
    return this.toLocalInput(floor);
  });

  ngOnInit(): void {
    this.load();
    this.loadUsers();

    // prefill: início = agora
    this.novo.update((v) => ({ ...v, horaInicio: this.toLocalInput(new Date()) }));

    const timer = setInterval(() => this.now.set(new Date()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  private unwrap<T>(res: unknown): T[] {
    const r = res as Record<string, unknown>;
    if (Array.isArray(res)) return res as T[];
    return (r?.['data'] ?? r?.['items'] ?? r?.['results'] ?? []) as T[];
  }

  /**
   * Percorre TODAS as páginas do serviço (page 1, 2, 3…) até a última,
   * acumulando os itens. Considera "última página" quando o retorno vem com
   * menos itens que o tamanho de página — assim nada se perde acima de 1000.
   */
  private fetchAllPages<T>(
    fetchPage: (page: number) => Observable<unknown>,
    pageSize: number,
  ): Observable<T[]> {
    const page$ = (page: number) =>
      fetchPage(page).pipe(map((res) => ({ items: this.unwrap<T>(res), page })));

    return page$(1).pipe(
      expand(({ items, page }) => (items.length === pageSize ? page$(page + 1) : EMPTY)),
      map(({ items }) => items),
      reduce((acc, items) => acc.concat(items), [] as T[]),
    );
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.fetchAllPages<BreakForm>(
      (page) => this.service.getAll(this.apiPageSize, page),
      this.apiPageSize,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (all) => {
          this.breaks.set(all.filter((b) => b.formId === this.formId()));
          this.page.set(1);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Não foi possível carregar as paradas.');
        },
      });
  }

  /** Carrega os usuários (todas as páginas) e monta o mapa userId → nome. */
  private loadUsers(): void {
    this.fetchAllPages<Record<string, unknown>>(
      (page) => this.user.getAll(this.apiPageSize, page),
      this.apiPageSize,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          const map: Record<string, string> = {};
          for (const u of users) {
            const id = String(u['id'] ?? '');
            if (!id) continue;
            map[id] =
              (u['nome'] as string) ??
              (u['name'] as string) ??
              (u['username'] as string) ??
              (u['email'] as string) ??
              id;
          }
          this.userNames.set(map);
        },
        error: () => {
          /* nome do usuário é complementar — falha silenciosa */
        },
      });
  }

  /** Nome de quem registrou a parada (ou '—' se ainda não resolvido). */
  userName(userId: string | null | undefined): string {
    if (!userId) return '—';
    return this.userNames()[userId] ?? '—';
  }

  // ───────── matchers de filtro ─────────
  private matchTexto(value: string | null | undefined, term: string): boolean {
    const t = term.trim().toLowerCase();
    if (!t) return true;
    return (value ?? '').toLowerCase().includes(t);
  }

  private matchSituacao(b: BreakForm, f: Situacao, now: Date): boolean {
    switch (f) {
      case 'all':
        return true;
      case 'ativa':
        return isActive(b, now);
      case 'agendada':
        return statusLabel(b, now) === 'Agendada';
      case 'expirada':
        return isExpired(b, now);
      case 'inativa':
        return b.status !== 1;
      default:
        return true;
    }
  }

  private dentroPeriodo(b: BreakForm, de: string, ate: string): boolean {
    if (!de && !ate) return true;
    const t = this.parseServerDate(b.horaInicio).getTime();
    if (de && t < Date.parse(`${de}T00:00:00Z`)) return false;
    if (ate && t > Date.parse(`${ate}T23:59:59Z`)) return false;
    return true;
  }

  // ───────── navegação de página ─────────
  irParaPagina(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
  }
  proximaPagina(): void {
    this.irParaPagina(this.page() + 1);
  }
  paginaAnterior(): void {
    this.irParaPagina(this.page() - 1);
  }

  // ───────── helpers de status (expostos ao template) ─────────
  label = (b: BreakForm) => statusLabel(b, this.now());
  ativa = (b: BreakForm) => isActive(b, this.now());
  expirada = (b: BreakForm) => isExpired(b, this.now());
  // podeAtivar = (b: BreakForm) => canActivate(b, this.now());
  podeDesativar = (b: BreakForm) => canDeactivate(b, this.now());

  // ───────── CRIAR ─────────
  criar(): void {
    this.clearFeedback();

    const now = new Date();

    // Bloqueia apenas se houver parada ATIVA e SEM hora de fim (aberta).
    const abertaAtiva = this.breaks().find((b) => isActive(b, now) && !b.horaFim);
    if (abertaAtiva) {
      this.error.set(
        `Há uma parada ativa sem hora de fim (iniciada em ${this.fmt(abertaAtiva.horaInicio)}). Informe a hora de fim (ou desative) antes de criar outra.`,
      );
      return;
    }

    const v = this.novo();

    if (!v.horaInicio) {
      this.error.set('Informe a hora de início.');
      return;
    }

    const ini = this.fromLocalInput(v.horaInicio);
    const fim = v.horaFim ? this.fromLocalInput(v.horaFim) : null;

    const erro = validateBreakTimes(ini, fim, new Date());
    if (erro) {
      this.error.set(erro);
      return;
    }

    // Se há parada ATIVA COM hora de fim, a nova só pode começar após esse fim.
    const ativaComFim = this.breaks().find((b) => isActive(b, now) && !!b.horaFim);
    if (ativaComFim?.horaFim) {
      const fimAtual = new Date(ativaComFim.horaFim as unknown as string);
      if (ini.getTime() < fimAtual.getTime()) {
        this.error.set(
          `A nova parada deve começar após o fim da parada em andamento (${this.fmt(ativaComFim.horaFim)}).`,
        );
        return;
      }
    }

    this.saving.set(true);
    this.service
      .create({
        formId: this.formId(),
        userId: this.auth.userId()!,
        horaInicio: this.toServerDate(ini) as unknown as Date,
        horaFim: fim ? (this.toServerDate(fim) as unknown as Date) : undefined,
        motivo: v.motivo.trim() || undefined,
        status: 1,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set('Parada criada.');
          this.formOpen.set(false);
          this.novo.set({ horaInicio: this.toLocalInput(new Date()), horaFim: '', motivo: '' });
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(`Erro ao criar a parada. - ${err.error.message}`);
        },
      });
  }

  // ───────── ATIVAR / DESATIVAR ─────────
  ativar(b: BreakForm): void {
    this.clearFeedback();
    if (!canActivate(b, new Date())) {
      this.error.set('Não é possível reativar: a hora de fim já expirou.');
      return;
    }
    this.persistStatus(b, 1, 'Parada reativada.');
  }

  desativar(b: BreakForm): void {
    this.clearFeedback();
    this.persistStatus(b, 0, 'Parada desativada.', new Date());
  }

  private persistStatus(b: BreakForm, status: number, msg: string, horaFim?: Date): void {
    this.saving.set(true);
    this.service
      .update(b.id, {
        formId: b.formId,
        userId: this.auth.userId()!,
        horaInicio: this.toServerDate(this.parseServerDate(b.horaInicio)) as unknown as Date,
        horaFim: horaFim
          ? (this.toServerDate(horaFim) as unknown as Date)
          : b.horaFim
            ? (this.toServerDate(this.parseServerDate(b.horaFim)) as unknown as Date)
            : undefined,
        motivo: b.motivo ?? undefined,
        status,
      })
      .subscribe({
        next: () => {
          this.now.set(new Date());
          this.saving.set(false);
          this.success.set(msg);
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Erro ao atualizar o status da parada.');
        },
      });
  }

  // ───────── datas ─────────
  private toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private fromLocalInput(s: string): Date {
    return new Date(s);
  }

  /**
   * Envia hora local sem Z — coluna TIMESTAMP (sem fuso) armazena como-está,
   * evitando a conversão indevida pelo Node/pg em UTC.
   */
  private toServerDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private parseServerDate(d: Date | string): Date {
    if (d instanceof Date) return d;
    return new Date(d.endsWith('Z') ? d : d + 'Z');
  }

  private readonly dtFmt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  fmt(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const s = typeof d === 'string' && !d.endsWith('Z') ? d + 'Z' : d;
    const t = new Date(s);
    return isNaN(t.getTime()) ? '—' : this.dtFmt.format(t);
  }

  toggleForm(): void {
    this.clearFeedback();
    // não abre o formulário se houver parada em andamento
    if (!this.formOpen() && !this.podeCriar()) {
      this.error.set(
        'Há uma parada ativa sem hora de fim. Finalize-a (informe a hora de fim ou desative) antes de criar outra.',
      );
      return;
    }
    this.formOpen.update((v) => !v);
    if (this.formOpen()) {
      this.novo.update((v) => ({ ...v, horaInicio: this.toLocalInput(new Date()) }));
    }
  }

  trackById(_: number, b: BreakForm): string {
    return b.id;
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
