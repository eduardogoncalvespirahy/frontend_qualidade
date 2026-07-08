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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreakFormService } from '../../../../../../../core/services/break-form.service';
import { BreakForm } from '../../../../../../../core/models/break-form.model';
import {
  canActivate,
  canDeactivate,
  isActive,
  isExpired,
  statusLabel,
  validateBreakTimes,
} from '../../../../../../../core/helpers/break-rules.helper';

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

  ngOnInit(): void {
    this.load();

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

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.getAll(1000, 1).subscribe({
      next: (res) => {
        const all = this.unwrap<BreakForm>(res);
        this.breaks.set(all.filter((b) => b.formId === this.formId()));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as paradas.');
      },
    });
  }

  // ───────── helpers de status (expostos ao template) ─────────
  label = (b: BreakForm) => statusLabel(b, this.now());
  ativa = (b: BreakForm) => isActive(b, this.now());
  expirada = (b: BreakForm) => isExpired(b, this.now());
  podeAtivar = (b: BreakForm) => canActivate(b, this.now());
  podeDesativar = (b: BreakForm) => canDeactivate(b, this.now());

  // ───────── CRIAR ─────────
  criar(): void {
    this.clearFeedback();
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

    this.saving.set(true);
    this.service
      .create({
        formId: this.formId(),
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
        error: () => {
          this.saving.set(false);
          this.error.set('Erro ao criar a parada.');
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
