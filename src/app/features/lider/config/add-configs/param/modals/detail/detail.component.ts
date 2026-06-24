import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { CommonModule } from '@angular/common';

import { Answer } from '../../../../../../../core/models/answer.model';
import { AnswerMachine } from '../../../../../../../core/models/answer-machine.model';
import { LimitAnswer } from '../../../../../../../core/models/limit-answer.model';
import { LimitAnswerMachine } from '../../../../../../../core/models/limit-answer-machine.model';

import { ModalService } from '../../../../../../../core/services/modal.service';
import { AnswerService } from '../../../../../../../core/services/answer.service';


// Os 4 possíveis tipos de parâmetro que este componente pode exibir
export type ParamType = 'answer' | 'answerMachine' | 'limitAnswer' | 'limitAnswerMachine';

// União dos 4 modelos — todos têm a mesma estrutura base
export type ParamItem = Answer | AnswerMachine | LimitAnswer | LimitAnswerMachine;

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.css',
})
export class DetailComponent {

  // Dados do parâmetro que será exibido — obrigatório, quem abrir o modal deve passar
  readonly item = input.required<ParamItem>();

  // Qual dos 4 tipos é esse item — obrigatório também
  readonly paramType = input.required<ParamType>();

  //identificar se está ativo
  protected readonly isActive = computed(() => this.item().status ===1 )

  // exibir status em tela
  protected readonly statusLabel = computed(() => this.isActive() ? 'Ativo' : 'Inativo')

  // Brincar com classe CSS
  protected readonly statusClass = computed(() => this.isActive() ? 'text-bg-success' : 'text-bg-secondary') 

  // Avisa o pai (param.component.ts) que algo mudou e precisa recarregar
  readonly reload_return = output<boolean>();

  // Converte o tipo técnico em texto legível para o usuário
  protected readonly typeLabel = computed(() => {
  // É um objeto onde as chaves são exatamente os 4 valores do ParamType. Se você esquecer um, o TypeScript avisa erro.
    const map: Record<ParamType, string> = { 
      answer:             'Parâmetro do Formulário',
      answerMachine:      'Parâmetro da Máquina',
      limitAnswer:        'Limite',
      limitAnswerMachine: 'Limite da Máquina',
    };
    return map[this.paramType()];
  });

  // Mostra o vínculo do item — Answer tem formId, os outros têm machineId
  protected readonly parentLabel = computed(() => {
    const i = this.item() as any;
    if (i.formId)    return `Formulário: ${i.formId}`;
    if (i.machineId) return `Máquina: ${i.machineId}`;
    return '—';
  });

  // Serviços para chamar a API
private readonly modalService = inject(ModalService);
private readonly answerService = inject(AnswerService);

protected async deletar(item: ParamItem): Promise<void> {
  const ref = this.modalService.open<boolean>({
    title: `Deletar Parâmetro`,
    body: `Deseja realmente deletar "${item.nome}"?`,
    centered: true,
    backdrop: 'static',
    buttons: [
      { text: 'Cancelar', variant: 'secondary', value: false },
      { text: 'Deletar', variant: 'danger', value: true },
    ],
  });

  const confirmed = await ref.result;
  if (!confirmed) return;

  this.answerService.delete(item.id).subscribe({
    next: () => {
      this.reload_return.emit(true);
      ref.close();
    },
  });
}

protected async editar(item: ParamItem): Promise<void> {
  const confirmed = await this.modalService.open<boolean>({
    title: `Editar: ${item.nome}`,
    centered: true,
    backdrop: 'static',
    buttons: [
      { text: 'Cancelar', variant: 'secondary', value: false },
      { text: 'Salvar', variant: 'primary', value: true },
    ],
  }).result;

  if (!confirmed) return;

  this.reload_return.emit(true);
}



}

