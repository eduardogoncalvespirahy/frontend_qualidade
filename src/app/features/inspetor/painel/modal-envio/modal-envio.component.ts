import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  shareReplay,
  Subject,
  switchMap,
} from 'rxjs';

import { Answer } from '../../../../core/models/answer.model';
import { Machine } from '../../../../core/models/machine.model';
import { UserService } from '../../../../core/services/user.service';
import { SignatureComponent } from '../../../../core/modals/signature/signature.component';

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

  // Feedback da busca do inspetor (null = nada buscado ainda; '—' = não encontrado)
  protected readonly nomeInspetor = signal<string | null>(null);
  protected readonly buscandoInspetor = signal(false);

  // Canal de eventos da digitação da matrícula
  private readonly matriculaInput$ = new Subject<string>();

  // Perfis buscados UMA vez e reutilizados (evita refetch a cada tecla)
  private readonly profiles$ = this.userService.getAllUserProfile(1000, 1).pipe(
    catchError(() => of(null)),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

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
            return of(null);
          }
          this.buscandoInspetor.set(true);
          return this.profiles$;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profiles) => {
        const alvo = this.matricula().trim();

        // campo esvaziado enquanto a busca acontecia
        if (!alvo) {
          this.limparInspetor();
          return;
        }

        // erro/sem dados → não afirma "não encontrado", apenas limpa o vínculo
        if (!profiles) {
          this.nomeInspetor.set(null);
          this.userId.set(null);
          this.buscandoInspetor.set(false);
          return;
        }

        const found = profiles.data.find((p) => String(p.employeeMatricula) === alvo);

        this.nomeInspetor.set(found?.employeeNome ?? '—');
        this.userId.set(found?.userId ?? null);
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
    this.buscandoInspetor.set(false);
  }

  /** Pronto para enviar? (inspetor resolvido + assinatura feita). */
  isValid(): boolean {
    return !!this.userId() && !!this.assinatura();
  }

  /** Retorna todos os dados prontos para o pai enviar ao backend. */
  value() {
    return {
      observacao: this.observacao(),
      matricula: this.matricula(),
      userId: this.userId(),
      assinatura: this.assinatura(),
      respostas: this.respostas(),
      machineRespostas: this.machineRespostas(),
      temMaquina: this.machines().length > 0,
    };
  }
}
