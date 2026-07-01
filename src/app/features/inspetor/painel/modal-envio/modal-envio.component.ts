import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Answer } from '../../../../core/models/answer.model';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';
import { UserService } from '../../../../core/services/user.service';

import { SignatureComponent } from '../../../../core/modals/signature/signature.component';

@Component({
  selector: 'app-painel-modal-envio',
  standalone: true,
  imports: [CommonModule, FormsModule, SignatureComponent],
  templateUrl: './modal-envio.component.html',
  styleUrl: './modal-envio.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalEnvioComponent implements AfterViewInit {
  private readonly userService = inject(UserService);
  // Hierarquia do formulário — exibida no resumo antes de enviar
  readonly locationNome = input('');
  readonly sectionNome = input('');
  readonly formNome = input('');

  // Parâmetros agrupados por categoria e respostas preenchidas pelo inspetor
  readonly agrupados = input<{ categoria: any; answers: Answer[] }[]>([]);
  readonly respostas = input<Record<string, string>>({});

  // Campos preenchidos dentro do modal
  protected readonly observacao = signal('');
  protected readonly matricula = signal('');

  // Canvas de assinatura
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  protected hasSignature = false;

  //assinatura modal
  protected readonly assinatura = signal('');

  // pegar iduser da matricula
  protected readonly userId = signal<string | null>(null);

  @ViewChild('signature')
  private signature!: SignatureComponent;
  //assinatura modal

ngAfterViewInit(): void {
  this.iniciarBuscaReativa(); // ← sempre chama, independente do canvas

  if (!this.canvasRef?.nativeElement) return;
  const canvas = this.canvasRef.nativeElement;
  this.ctx = canvas.getContext('2d')!;
  this.ctx.strokeStyle = '#000';
  this.ctx.lineWidth = 2;
  this.ctx.lineCap = 'round';
}



  // Subject é como um "canal de eventos" — cada vez que o usuário digita,
  // jogamos o valor novo aqui dentro com .next()
  private readonly matriculaInput$ = new Subject<string>();

  // Signal que guarda o nome encontrado (null = ainda não buscou)
  protected readonly nomeInspetor = signal<string | null>(null);

  // Signal que controla o spinner de carregamento no HTML
  protected readonly buscandoInspetor = signal(false);

  private iniciarBuscaReativa(): void {
    this.matriculaInput$
      .pipe(
        // Espera 400ms depois que o usuário PAROU de digitar para disparar a busca.
        // Sem isso, chamaria a API a cada tecla pressionada.
        debounceTime(400),

        // Se o valor não mudou (ex: usuário apagou e redigitou o mesmo), ignora.
        distinctUntilChanged(),

        // switchMap cancela a chamada anterior se uma nova chegar antes de terminar.
        // Ex: digitou "12", chamou a API → digitou "123" antes de receber resposta
        // → cancela a busca por "12" e começa por "123".
        switchMap((matricula) => {
          // Se o campo está vazio, limpa o nome e não chama a API.
          if (!matricula) {
            this.nomeInspetor.set(null);
            return of(null); // of(null) = observable que emite null e termina
          }

          // Ativa o loading e dispara a busca de todos os profiles.
          this.buscandoInspetor.set(true);
          return this.userService.getAllUserProfile(1000, 1).pipe(
            // Se der erro na chamada (ex: rede caiu), retorna null
            // em vez de quebrar o observable inteiro.
            catchError(() => of(null)),
          );
        }),
      )
      .subscribe((profiles) => { 
        console.log('PROFILES:', profiles?.data?.map(p => ({ 
          matricula: p.employeeMatricula, 
          userId: p.userId, 
          nome: p.employeeNome 
        })));
        console.log('BUSCANDO POR:', this.matricula());
        // Aqui chegam os dados (ou null em caso de erro/vazio)

        if (!profiles) {
          this.nomeInspetor.set(null);
          this.buscandoInspetor.set(false);
          return;
        }

        // Busca dentro da lista o profile cuja matrícula bate com o que foi digitado.
        // employeeMatricula é o campo de matrícula dentro do UserProfile.
        const found = profiles.data.find(
          (p) => String(p.employeeMatricula) === String(this.matricula()),
        );

        // Se achou, pega o nome. Se não achou, mostra '—'.
        this.nomeInspetor.set(found?.employeeNome ?? '—');
        this.userId.set(found?.userId ?? null); // ← guarda o id real

        this.buscandoInspetor.set(false);
      });
  }

  // Chamado pelo (input) do campo de matrícula no HTML.
  // Atualiza o signal E empurra o valor novo no Subject para disparar a busca.
  protected onMatriculaChange(valor: string): void {
    this.matricula.set(valor);
    this.matriculaInput$.next(valor); // <-- isso acorda o pipe lá em cima
  }

  private getPos(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const source = event instanceof MouseEvent ? event : event.touches[0];
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (source.clientX - rect.left) * scaleX,
      y: (source.clientY - rect.top) * scaleY,
    };
  }

  protected iniciarDesenho(event: MouseEvent | TouchEvent): void {
    this.isDrawing = true;
    const pos = this.getPos(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  protected desenhar(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;
    event.preventDefault();
    const pos = this.getPos(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.hasSignature = true;
  }

  protected pararDesenho(): void {
    this.isDrawing = false;
  }

  protected limpar(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasSignature = false;
  }

  // Retorna todos os dados prontos para o pai enviar ao backend
  value() {
  return {
    observacao: this.observacao(),
    matricula:  this.matricula(),
    userId:     this.userId(),
    assinatura: this.canvasRef?.nativeElement?.toDataURL() ?? '',
    respostas:  this.respostas(),
  };
}

}
