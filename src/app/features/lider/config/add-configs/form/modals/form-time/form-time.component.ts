import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FormTime, CreateFormTime } from '../../../../../../../core/models/form-time.model';

import { FormTimeService } from '../../../../../../../core/services/form-time.service';

@Component({
  selector: 'app-form-time',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-time.component.html',
  styleUrl: './form-time.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormTimeComponent implements OnInit {
  private readonly service = inject(FormTimeService);

  private readonly destroyRef = inject(DestroyRef);

  /** Formulário dono da configuração. */
  readonly formId = input.required<string>();

  readonly formTime = signal<FormTime | null>(null);

  readonly loading = signal(false);

  readonly saving = signal(false);

  readonly error = signal<string | null>(null);

  readonly success = signal<string | null>(null);

  readonly tempoExecucao = signal('');

  readonly tempoTolerancia = signal('');

  readonly tempoAntecedencia = signal('');

  readonly possuiConfiguracao = computed(() => this.formTime() !== null);

  readonly podeSalvar = computed(() => !!this.tempoExecucao() && !this.loading() && !this.saving());

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.clearFeedback();

    this.service.getByFormId(this.formId()).subscribe({
      next: (config) => {
        this.loading.set(false);

        if (!config) {
          this.formTime.set(null);

          return;
        }

        console.log(config);

        this.formTime.set(config);

        this.tempoExecucao.set(config.tempoExecucao);

        this.tempoTolerancia.set(this.normalizeTime(config.tempoTolerancia));

        this.tempoAntecedencia.set(this.normalizeTime(config.tempoAntecedencia));
      },

      error: (err) => {
        console.error(err);

        this.loading.set(false);

        this.error.set('Não foi possível carregar as configurações de tempo.');
      },
    });
  }

  salvar(): void {
    this.clearFeedback();

    if (!this.tempoExecucao()) {
      this.error.set('Informe o tempo de execução.');

      return;
    }

    const payload: CreateFormTime = {
      formId: this.formId(),

      tempoExecucao: this.toDatabaseTime(this.tempoExecucao()),

      tempoTolerancia: this.toDatabaseTime(this.tempoTolerancia()),

      tempoAntecedencia: this.toDatabaseTime(this.tempoAntecedencia()),
    };

    const request$ = this.possuiConfiguracao()
      ? this.service.update(this.formId(), payload)
      : this.service.create(payload);

    this.saving.set(true);

    request$.subscribe({
      next: (config) => {
        this.saving.set(false);

        this.formTime.set(config);

        this.success.set('Configuração salva com sucesso.');

        this.tempoExecucao.set(this.normalizeTime(config.tempoExecucao));

        this.tempoTolerancia.set(this.normalizeTime(config.tempoTolerancia));

        this.tempoAntecedencia.set(this.normalizeTime(config.tempoAntecedencia));
      },

      error: () => {
        this.saving.set(false);

        this.error.set('Erro ao salvar a configuração.');
      },
    });
  }

  private fillForm(formTime: FormTime): void {
    this.formTime.set(formTime);

    this.tempoExecucao.set(this.normalizeTime(formTime.tempoExecucao));

    this.tempoTolerancia.set(this.normalizeTime(formTime.tempoTolerancia));

    this.tempoAntecedencia.set(this.normalizeTime(formTime.tempoAntecedencia));
  }

  private buildPayload(): CreateFormTime {
    return {
      formId: this.formId(),

      tempoExecucao: this.toDatabaseTime(this.tempoExecucao()),

      tempoTolerancia: this.toDatabaseTime(this.tempoTolerancia()),

      tempoAntecedencia: this.toDatabaseTime(this.tempoAntecedencia()),
    };
  }

  /**
   * Converte "08:30:00" em "08:30"
   */
  private normalizeTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.substring(0, 5);
  }

  /**
   * Converte "08:30" em "08:30:00"
   */
  private toDatabaseTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.length === 5 ? `${value}:00` : value;
  }

  limparFormulario(): void {
    this.tempoExecucao.set('');

    this.tempoTolerancia.set('');

    this.tempoAntecedencia.set('');
  }

  recarregar(): void {
    this.load();
  }

  cancelar(): void {
    this.clearFeedback();

    if (this.formTime()) {
      this.fillForm(this.formTime()!);

      return;
    }

    this.limparFormulario();
  }

  private clearFeedback(): void {
    this.error.set(null);

    this.success.set(null);
  }
}
