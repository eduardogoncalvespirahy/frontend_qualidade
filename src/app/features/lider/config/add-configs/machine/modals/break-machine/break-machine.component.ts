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
import { BreakMachineService } from '../../../../../../../core/services/break-machine.service';
import { BreakMachine } from '../../../../../../../core/models/break-machine.model';
import {
  canActivate,
  canDeactivate,
  isActive,
  isExpired,
  statusLabel,
  validateBreakTimes,
} from '../../../../../../../core/helpers/break-rules.helper';

@Component({
  selector: 'app-break-machine',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './break-machine.component.html',
  styleUrl: './break-machine.component.css',
})
export class BreakMachineComponent implements OnInit {
  private readonly service = inject(BreakMachineService);
  private readonly destroyRef = inject(DestroyRef);

  /** Máquina dona das paradas. */
  readonly machineId = input.required<string>();

  readonly breaks = signal<BreakMachine[]>([]);
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
        const all = this.unwrap<BreakMachine>(res);
        this.breaks.set(all.filter((b) => b.machineId === this.machineId()));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as paradas.');
      },
    });
  }

  // ───────── helpers de status (expostos ao template) ─────────
  label = (b: BreakMachine) => statusLabel(b, this.now());
  ativa = (b: BreakMachine) => isActive(b, this.now());
  expirada = (b: BreakMachine) => isExpired(b, this.now());
  podeAtivar = (b: BreakMachine) => canActivate(b, this.now());
  podeDesativar = (b: BreakMachine) => canDeactivate(b, this.now());

  // ───────── CRIAR ─────────
  criar(): void {
    this.clearFeedback();
    const v = this.novo();

    if (!v.horaInicio || !v.horaFim) {
      this.error.set('Informe a hora de início e de fim.');
      return;
    }

    const ini = this.fromLocalInput(v.horaInicio);
    const fim = this.fromLocalInput(v.horaFim);

    const erro = validateBreakTimes(ini, fim, new Date());
    if (erro) {
      this.error.set(erro);
      return;
    }

    this.saving.set(true);
    this.service
      .create({
        machineId: this.machineId(),
        horaInicio: ini,
        horaFim: fim,
        motivo: v.motivo.trim() || null,
        status: 1, // nasce ativa/agendada dentro da janela
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
  ativar(b: BreakMachine): void {
    this.clearFeedback();
    if (!canActivate(b, new Date())) {
      this.error.set('Não é possível reativar: a hora de fim já expirou.');
      return;
    }
    this.persistStatus(b, 1, 'Parada reativada.');
  }

  desativar(b: BreakMachine): void {
    this.clearFeedback();
    if (!canDeactivate(b, new Date())) {
      this.error.set('Não é possível desativar esta parada.');
      return;
    }
    this.persistStatus(b, 0, 'Parada desativada.');
  }

  private persistStatus(b: BreakMachine, status: number, msg: string): void {
    this.saving.set(true);
    // UpdateBreakMachine exige horaInicio e horaFim — reenviamos os atuais.
    this.service
      .update(b.id, {
        machineId: b.machineId,
        horaInicio: new Date(b.horaInicio),
        horaFim: new Date(b.horaFim),
        motivo: b.motivo,
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
  /** Date -> string local para input[type=datetime-local] (YYYY-MM-DDTHH:mm). */
  private toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  private fromLocalInput(s: string): Date {
    return new Date(s);
  }

  private readonly dtFmt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  fmt(d: Date | string | null | undefined): string {
    if (!d) return '—';
    const t = new Date(d);
    return isNaN(t.getTime()) ? '—' : this.dtFmt.format(t);
  }

  toggleForm(): void {
    this.clearFeedback();
    this.formOpen.update((v) => !v);
    if (this.formOpen()) {
      this.novo.update((v) => ({ ...v, horaInicio: this.toLocalInput(new Date()) }));
    }
  }

  trackById(_: number, b: BreakMachine): string {
    return b.id;
  }
  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
