import {
  ChangeDetectionStrategy,
  Component,
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

  /** Formulário dono da configuração. */
  readonly formId = input.required<string>();

  /** Configuração existente (null = ainda não cadastrada para este formulário). */
  readonly formTime = signal<FormTime | null>(null);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  // Campos do formulário (formato "HH:MM" do input[type=time]).
  readonly tempoExecucao = signal('');
  readonly tempoTolerancia = signal('');
  readonly tempoAntecedencia = signal('');

  /** Já existe configuração salva? (define criar x atualizar). */
  readonly possuiConfiguracao = computed(() => this.formTime() !== null);

  /** Execução é obrigatória e nada pode estar em andamento. */
  readonly podeSalvar = computed(() => !!this.tempoExecucao() && !this.loading() && !this.saving());

  ngOnInit(): void {
    this.load();
  }

  // ============================================================
  //  CARREGAR (traz o existente ou deixa em branco para cadastrar)
  // ============================================================
  load(): void {
    this.loading.set(true);
    this.clearFeedback();

    this.service.getByFormId(this.formId()).subscribe({
      next: (config) => {
        this.loading.set(false);
        if (config) {
          this.fillForm(config);
        } else {
          // sem configuração → modo cadastro
          this.formTime.set(null);
          this.limparFormulario();
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as configurações de tempo.');
      },
    });
  }

  // ============================================================
  //  SALVAR (cria se não existe, atualiza se já existe)
  // ============================================================
  salvar(): void {
    this.clearFeedback();

    if (!this.tempoExecucao()) {
      this.error.set('Informe o tempo de execução.');
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.possuiConfiguracao()
      ? this.service.update(this.formId(), payload)
      : this.service.create(payload);

    this.saving.set(true);
    request$.subscribe({
      next: (config) => {
        this.saving.set(false);
        this.fillForm(config);
        this.success.set('Configuração salva com sucesso.');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Erro ao salvar a configuração.');
      },
    });
  }

  /** Restaura os campos para o último estado salvo (ou limpa, se não há). */
  cancelar(): void {
    this.clearFeedback();
    const atual = this.formTime();
    if (atual) {
      this.fillForm(atual);
    } else {
      this.limparFormulario();
    }
  }

  recarregar(): void {
    this.load();
  }

  limparFormulario(): void {
    this.tempoExecucao.set('');
    this.tempoTolerancia.set('');
    this.tempoAntecedencia.set('');
  }

  // ============================================================
  //  HELPERS
  // ============================================================

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

  /** "08:30:00" → "08:30" (para o input[type=time]). */
  private normalizeTime(value: string | null | undefined): string {
    return value ? value.substring(0, 5) : '';
  }

  /** "08:30" → "08:30:00" (para o banco). */
  private toDatabaseTime(value: string | null | undefined): string {
    if (!value) return '';
    return value.length === 5 ? `${value}:00` : value;
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
