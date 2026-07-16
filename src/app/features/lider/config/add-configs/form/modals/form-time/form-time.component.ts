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
import { HttpErrorResponse } from '@angular/common/http';

import { FormTime, CreateFormTime } from '../../../../../../../core/models/form-time.model';
import { FormTimeService } from '../../../../../../../core/services/form-time.service';

type Campo = 'exec' | 'tol' | 'ant';

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

  // Campos no formato "HH:MM:SS" (input[type=time] com step=1).
  readonly tempoExecucao = signal('');
  readonly tempoTolerancia = signal('');
  readonly tempoAntecedencia = signal('');

  /** Snapshot do último estado salvo/carregado, para detectar alterações. */
  private readonly original = signal<{ exec: string; tol: string; ant: string }>({
    exec: '',
    tol: '',
    ant: '',
  });

  /** Campos "tocados" + tentativa de salvar → controla exibição dos erros. */
  private readonly touched = signal<Record<Campo, boolean>>({
    exec: false,
    tol: false,
    ant: false,
  });
  private readonly submitTentado = signal(false);

  // ───────── valores em segundos (fonte única de verdade p/ validações) ─────────
  private readonly execSeg = computed(() => this.segundos(this.tempoExecucao()));
  private readonly tolSeg = computed(() => this.segundos(this.tempoTolerancia()));
  private readonly antSeg = computed(() => this.segundos(this.tempoAntecedencia()));

  /** Execução válida (> 0): pré-requisito para liberar tolerância/antecedência. */
  readonly execOk = computed(() => this.execSeg() > 0);

  // ───────── derivados ─────────
  readonly possuiConfiguracao = computed(() => this.formTime() !== null);

  readonly dirty = computed(() => {
    const o = this.original();
    return (
      this.tempoExecucao() !== o.exec ||
      this.tempoTolerancia() !== o.tol ||
      this.tempoAntecedencia() !== o.ant
    );
  });

  // Execução: NOT NULL no banco → obrigatória e > 00:00:00.
  readonly erroExecucao = computed(() => {
    if (!this.tempoExecucao().trim()) return 'Informe o tempo de execução.';
    if (this.execSeg() <= 0) return 'O tempo de execução deve ser maior que 00:00:00.';
    return null;
  });

  // Tolerância: opcional (pode ficar 00:00:00); só não pode ser >= execução.
  // Vazio → 0s, e 0 nunca é >= execução (que é > 0), então zerado é sempre válido.
  readonly erroTolerancia = computed(() => {
    if (!this.execOk()) return null; // travada até haver execução válida
    if (this.tolSeg() >= this.execSeg())
      return 'A tolerância deve ser menor que o tempo de execução.';
    return null;
  });

  // Antecedência: mesma regra da tolerância.
  readonly erroAntecedencia = computed(() => {
    if (!this.execOk()) return null;
    if (this.antSeg() >= this.execSeg())
      return 'A antecedência deve ser menor que o tempo de execução.';
    return null;
  });

  readonly formValido = computed(
    () => !this.erroExecucao() && !this.erroTolerancia() && !this.erroAntecedencia(),
  );

  /**
   * Prévia do bloqueio de reenvio: logo após um envio, o formulário fica
   * travado até esse tempo passar (TB = Tempo de Execução − Antecedência).
   * Com antecedência zerada, o bloqueio é o próprio tempo de execução.
   */
  readonly tempoBloqueio = computed<string | null>(() => {
    const exec = this.execSeg();
    if (exec <= 0) return null;
    const blockS = Math.max(0, exec - this.antSeg());
    return this.hms(Math.floor(blockS / 3600), Math.floor((blockS % 3600) / 60), blockS % 60);
  });

  /** Só habilita salvar com formulário válido, alterado e nada em andamento. */
  readonly podeSalvar = computed(
    () => this.formValido() && this.dirty() && !this.loading() && !this.saving(),
  );

  private readonly dtFmt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  /** Data da última alteração salva (para o rodapé). */
  readonly atualizadoEm = computed(() => {
    const low = this.lowerMap(this.formTime());
    const bruto = this.pick(low, 'dataAlteracao', 'data_alteracao');
    if (!bruto) return null;
    const d = new Date(bruto as string);
    return isNaN(d.getTime()) ? null : this.dtFmt.format(d);
  });

  ngOnInit(): void {
    this.load();
  }

  // ============================================================
  //  CARREGAR — traz o existente ou prepara o cadastro
  // ============================================================
  load(): void {
    this.loading.set(true);
    this.clearFeedback();
    this.resetInteracao();

    this.service.getByFormId(this.formId()).subscribe({
      next: (res) => {
        this.loading.set(false);
        const config = this.resolveConfig(res);
        if (config) {
          this.fillForm(config);
        } else {
          this.formTime.set(null);
          this.limparFormulario();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        // 404 = ainda não existe configuração → modo cadastro (não é erro)
        if (err?.status === 404) {
          this.formTime.set(null);
          this.limparFormulario();
          return;
        }
        this.error.set('Não foi possível carregar as configurações de tempo.');
      },
    });
  }

  // ============================================================
  //  SALVAR — cria se não existe, atualiza se já existe
  // ============================================================
  salvar(): void {
    this.clearFeedback();
    this.submitTentado.set(true);

    if (!this.formValido()) {
      this.error.set('Corrija os campos destacados antes de salvar.');
      return;
    }
    if (!this.dirty()) return; // nada mudou

    const payload = this.buildPayload();
    const request$ = this.possuiConfiguracao()
      ? this.service.update(this.formId(), payload)
      : this.service.create(payload);

    this.saving.set(true);
    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        const config = this.resolveConfig(res);
        if (config) this.fillForm(config);
        this.resetInteracao();
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
    this.resetInteracao();
    const atual = this.formTime();
    if (atual) this.fillForm(atual);
    else this.limparFormulario();
  }

  recarregar(): void {
    this.load();
  }

  // ───────── manipulação de campos ─────────
  setCampo(campo: Campo, valor: string): void {
    if (campo === 'exec') this.tempoExecucao.set(valor);
    else if (campo === 'tol') this.tempoTolerancia.set(valor);
    else this.tempoAntecedencia.set(valor);
    if (this.success() || this.error()) this.clearFeedback();
  }

  marcarTocado(campo: Campo): void {
    if (this.touched()[campo]) return;
    this.touched.update((t) => ({ ...t, [campo]: true }));
  }

  /** Deve exibir o erro do campo? (após tocar ou tentar salvar). */
  mostraErro(campo: Campo): boolean {
    return this.touched()[campo] || this.submitTentado();
  }

  limparFormulario(): void {
    this.tempoExecucao.set('');
    this.tempoTolerancia.set('');
    this.tempoAntecedencia.set('');
    this.original.set({ exec: '', tol: '', ant: '' });
  }

  // ============================================================
  //  HELPERS
  // ============================================================

  /** Aceita a resposta em formatos variados: objeto, array, {data} ou null. */
  private resolveConfig(res: unknown): FormTime | null {
    if (!res) return null;
    if (Array.isArray(res)) return (res[0] as FormTime) ?? null;
    const r = res as Record<string, unknown>;
    if (r['data'] !== undefined) {
      const d = r['data'];
      if (!d) return null;
      return Array.isArray(d) ? ((d[0] as FormTime) ?? null) : (d as FormTime);
    }
    return res as FormTime;
  }

  private fillForm(formTime: FormTime): void {
    const low = this.lowerMap(formTime);
    const exec = this.parseTime(this.pick(low, 'tempoExecucao', 'tempo_execucao'));
    const tol = this.parseTime(this.pick(low, 'tempoTolerancia', 'tempo_tolerancia'));
    const ant = this.parseTime(this.pick(low, 'tempoAntecedencia', 'tempo_antecedencia'));

    this.formTime.set(formTime);
    this.tempoExecucao.set(exec);
    this.tempoTolerancia.set(tol);
    this.tempoAntecedencia.set(ant);
    this.original.set({ exec, tol, ant }); // novo baseline → dirty volta a false
  }

  /** Copia o objeto com todas as chaves em minúsculo (tolera camelCase/snake/lowercase). */
  private lowerMap(obj: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k.toLowerCase()] = v;
      }
    }
    return out;
  }

  /** Busca o primeiro valor não-nulo entre as grafias informadas (case-insensitive). */
  private pick(low: Record<string, unknown>, ...keys: string[]): unknown {
    for (const k of keys) {
      const v = low[k.toLowerCase()];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }

  /**
   * Monta o payload. Execução vai como informada; tolerância e antecedência são
   * opcionais e, quando não preenchidas, seguem zeradas ("00:00:00").
   */
  private buildPayload(): CreateFormTime {
    return {
      formId: this.formId(),
      tempoExecucao: this.parseTime(this.tempoExecucao()),
      tempoTolerancia: this.parseTime(this.tempoTolerancia()) || '00:00:00',
      tempoAntecedencia: this.parseTime(this.tempoAntecedencia()) || '00:00:00',
    };
  }

  private resetInteracao(): void {
    this.touched.set({ exec: false, tol: false, ant: false });
    this.submitTentado.set(false);
  }

  /**
   * Normaliza um valor de tempo para "HH:MM:SS".
   * A coluna é `time`, então o driver devolve string ("HH:MM:SS"); também
   * aceitamos `Date` por segurança. Qualquer outro formato → "".
   */
  private parseTime(value: unknown): string {
    if (value === null || value === undefined || value === '') return '';

    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      return this.hms(value.getHours(), value.getMinutes(), value.getSeconds());
    }

    const m = String(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return '';
    return this.hms(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 0);
  }

  private hms(h: number, m: number, s: number): string {
    const p = (n: number) => String(Math.max(0, Math.trunc(n))).padStart(2, '0');
    return `${p(h)}:${p(m)}:${p(s)}`;
  }

  /** "HH:MM:SS" → total em segundos. */
  private toSeconds(hms: string): number {
    const [h, m, s] = hms.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  }

  /** Valor bruto do campo → segundos (0 quando vazio/invalid). Base das validações. */
  private segundos(value: string): number {
    const t = this.parseTime(value);
    return t ? this.toSeconds(t) : 0;
  }

  private clearFeedback(): void {
    this.error.set(null);
    this.success.set(null);
  }
}
