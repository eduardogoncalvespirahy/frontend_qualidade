import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { Answer } from '../../../../core/models/answer.model';
import { Machine } from '../../../../core/models/machine.model';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { UserService } from '../../../../core/services/user.service';
import { SignatureComponent } from '../../../../core/components/signature/signature.component';


interface CategoriaGrupo {
  categoria: unknown;
  answers: Answer[];
}

@Component({
  selector: 'app-painel-modal-envio',
  standalone: true,
  imports: [CommonModule, FormsModule, SignatureComponent],
  templateUrl: './modal-envio.component.html',
  styleUrl: './modal-envio.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalEnvioComponent {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  // Hierarquia do formulário — exibida no resumo antes de enviar
  readonly locationNome = input('');
  readonly sectionNome = input('');
  readonly formNome = input('');

  // Parâmetros agrupados por categoria e respostas preenchidas pelo inspetor
  readonly agrupados = input<CategoriaGrupo[]>([]);
  readonly respostas = input<Record<string, string>>({});

  // Máquinas (modo pivô) e suas respostas — chave: `${machineId}_${answerId}`
  readonly machines = input<Machine[]>([]);
  readonly machineRespostas = input<Record<string, string>>({});

  // Campos preenchidos dentro do modal
  protected readonly observacao = signal('');
  protected readonly matricula = signal('');
  protected readonly assinatura = signal('');

  // id real do usuário resolvido a partir da matrícula
  protected readonly userId = signal<string | null>(null);

  // Perfil completo do inspetor (dados de RH) — usado no resumo e no envio
  protected readonly perfilInspetor = signal<UserProfile | null>(null);

  // Ações do modal (o pai fecha o modal ao receber)
  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  /** Há ao menos um resultado preenchido (respeita modo máquina x normal). */
  private readonly temResultado = computed(() => {
    const preenchido = (map: Record<string, string>) =>
      Object.values(map ?? {}).some((v) => (v ?? '').toString().trim() !== '');
    return this.machines().length > 0
      ? preenchido(this.machineRespostas())
      : preenchido(this.respostas());
  });

  /** Só permite enviar com: inspetor válido + assinatura + ao menos 1 resultado. */
  protected readonly podeEnviar = computed(
    () => !!this.userId() && !!this.assinatura() && this.temResultado(),
  );

  /** Mensagem do que falta (usada no title do botão desabilitado). */
  protected readonly motivoBloqueio = computed(() => {
    const faltas: string[] = [];
    if (!this.temResultado()) faltas.push('preencher ao menos um resultado');
    if (!this.userId()) faltas.push('informar uma matrícula de inspetor válida');
    if (!this.assinatura()) faltas.push('assinar');
    return faltas.length ? `Para enviar: ${faltas.join(', ')}.` : '';
  });

  // Feedback da busca do inspetor (null = nada buscado ainda; '—' = não encontrado)
  protected readonly nomeInspetor = signal<string | null>(null);
  protected readonly buscandoInspetor = signal(false);

  // Canal de eventos da digitação da matrícula
  private readonly matriculaInput$ = new Subject<string>();

  // true quando a última busca falhou por erro real (rede/servidor), não por 404
  private readonly buscaFalhou = signal(false);

  constructor() {
    this.matriculaInput$
      .pipe(
        // espera parar de digitar antes de buscar
        debounceTime(400),
        // ignora se o valor não mudou
        distinctUntilChanged(),
        switchMap((matricula) => {
          if (!matricula) {
            this.limparInspetor();
            return of<UserProfile | null>(null);
          }
          this.buscandoInspetor.set(true);
          this.buscaFalhou.set(false);

          // Endpoint dedicado: resolve a matrícula → perfil completo, SOMENTE
          // se o usuário tiver credencial ativa com a regra INSPETOR.
          // 404 = matrícula inexistente OU não é inspetor; outros = erro real.
          return this.userService.getInspetorByRegisterNumber(matricula).pipe(
            catchError((err: HttpErrorResponse) => {
              this.buscaFalhou.set(err.status !== 404);
              return of<UserProfile | null>(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((perfil) => {
        const alvo = this.matricula().trim();

        // campo esvaziado enquanto a busca acontecia
        if (!alvo) {
          this.limparInspetor();
          return;
        }

        if (perfil) {
          this.perfilInspetor.set(perfil);
          this.nomeInspetor.set(perfil.employeeNome ?? perfil.userUsername ?? '—');
          this.userId.set(perfil.userId);
        } else if (this.buscaFalhou()) {
          // erro real (rede/servidor): não afirma "não encontrado", só limpa
          this.limparInspetor();
        } else {
          // 404: matrícula não existe ou o usuário não é inspetor
          this.perfilInspetor.set(null);
          this.nomeInspetor.set('—');
          this.userId.set(null);
        }

        this.buscandoInspetor.set(false);
      });
  }

  /** Chamado pelo (input) da matrícula: sanitiza (só dígitos, máx. 4) e dispara a busca. */
  protected onMatriculaChange(valor: string): void {
    const limpo = (valor ?? '').replace(/\D/g, '').slice(0, 4);
    this.matricula.set(limpo);
    this.matriculaInput$.next(limpo);
  }

  private limparInspetor(): void {
    this.nomeInspetor.set(null);
    this.userId.set(null);
    this.perfilInspetor.set(null);
    this.buscandoInspetor.set(false);
  }

  /** Pronto para enviar? (inspetor válido + assinatura + ao menos 1 resultado). */
  isValid(): boolean {
    return this.podeEnviar();
  }

  /** Retorna todos os dados prontos para o pai enviar ao backend. */
  value() {
    return {
      observacao: this.observacao(),
      matricula: this.matricula(),
      userId: this.userId(),
      perfilInspetor: this.perfilInspetor(),
      assinatura: this.assinatura(),
      respostas: this.respostas(),
      machineRespostas: this.machineRespostas(),
      temMaquina: this.machines().length > 0,
    };
  }
}
