// import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
// import { CommonModule } from '@angular/common';

// import { Answer } from '../../../../../core/models/answer.model';
// import { AnswerMachine } from '../../../../../core/models/answer-machine.model';
// import { LimitAnswer } from '../../../../../core/models/limit-answer.model';
// import { LimitAnswerMachine } from '../../../../../core/models/limit-answer-machine.model';

// // Os 4 possíveis tipos de parâmetro que este componente pode exibir
// export type ParamType = 'answer' | 'answerMachine' | 'limitAnswer' | 'limitAnswerMachine';

// // União dos 4 modelos — todos têm a mesma estrutura base
// export type ParamItem = Answer | AnswerMachine | LimitAnswer | LimitAnswerMachine;

// @Component({
//   selector: 'app-detail',
//   standalone: true,
//   imports: [CommonModule],
//   changeDetection: ChangeDetectionStrategy.OnPush,
//   templateUrl: './detail.component.html',
//   styleUrl: './detail.component.css',
// })
// export class DetailComponent {

//   // Dados do parâmetro que será exibido — obrigatório, quem abrir o modal deve passar
//   readonly item = input.required<ParamItem>();

//   // Qual dos 4 tipos é esse item — obrigatório também
//   readonly paramType = input.required<ParamType>();

//   //identificar se está ativo
//   protected readonly isActive = computed(() => this.item().status ===1 )

//   // exibir status em tela
//   protected readonly statusLabel = computed(() => this.isActive() ? 'Ativo' : 'Inativo')

//   // Brincar com classe CSS
//   protected readonly statusClass = computed(() => this.isActive() ? 'text-bg-sucess' : 'text-bg-segundary') 



// }

