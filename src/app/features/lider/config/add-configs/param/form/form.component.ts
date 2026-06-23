// import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
// import { FormsModule } from '@angular/forms';
// import { Answer } from '../../../../../core/models/answer.model';
// import { AnswerMachine } from '../../../../../core/models/answer-machine.model';
// import { LimitAnswer } from '../../../../../core/models/limit-answer.model';
// import { LimitAnswerMachine } from '../../../../../core/models/limit-answer-machine.model';

// export type ParamType = 'answer' | 'answerMachine' | 'limitAnswer' | 'limitAnswerMachine';
// export type ParamItem = Answer | AnswerMachine | LimitAnswer | LimitAnswerMachine;

// @Component({
//   selector: 'app-param-form',
//   standalone: true,
//   imports: [FormsModule],
//   changeDetection: ChangeDetectionStrategy.OnPush,
//   templateUrl: './form.component.html',
//   styleUrl: './form.component.css',
// })
// export class FormComponent implements OnInit {
//   readonly paramType = input.required<ParamType>();
//   readonly mode = input<'new' | 'edit'>('new');
//   readonly item = input<ParamItem | null>(null);
//   readonly parentId = input<string>('');

//   protected id = '';
//   protected nome = '';
//   protected descricao = '';
//   protected status = true;
//   protected dataCriacao: Date = new Date();
//   protected dataAlteracao: Date = new Date();

//   protected readonly paramTypeLabel: Record<ParamType, string> = {
//     answer: 'Parâmetro do Formulário',
//     answerMachine: 'Parâmetro da Máquina',
//     limitAnswer: 'Limite',
//     limitAnswerMachine: 'Limite da Máquina',
//   };

//   ngOnInit(): void {
//     const u = this.item();
//     if (u) {
//       this.id = u.id;
//       this.nome = u.nome;
//       this.descricao = u.descricao || '';
//       this.status = u.status === 1;
//       this.dataCriacao = u.dataCriacao;
//       this.dataAlteracao = u.dataAlteracao;
//     }
//   }

//   value(): ParamItem {
//     const base = {
//       id: this.id,
//       nome: this.nome,
//       descricao: this.descricao || null,
//       status: this.status ? 1 : 0,
//       dataCriacao: this.dataCriacao,
//       dataAlteracao: this.dataAlteracao,
//     };
//     if (this.paramType() === 'answer') {
//       return { ...base, formId: this.parentId() } as Answer;
//     }
//     return { ...base, machineId: this.parentId() } as AnswerMachine;
//   }
// }
