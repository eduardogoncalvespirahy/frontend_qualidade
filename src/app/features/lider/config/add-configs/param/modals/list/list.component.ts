import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Answer } from '../../../../../../../core/models/answer.model';
import { LimitAnswer } from '../../../../../../../core/models/limit-answer.model';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.component.html',
  styleUrl: './list.component.css',
})
export class ListComponent {

  readonly answers      = input.required<Answer[]>();
  readonly formNome     = input.required<string>();
  readonly limitAnswers = input<LimitAnswer[]>([]);

  readonly selecionado = output<Answer>();

  protected selecionar(a: Answer): void {
    this.selecionado.emit(a);
  }

  // Verifica se um parâmetro possui limite cadastrado
  protected hasLimit(answerId: string): boolean {
    return this.limitAnswers().some(l => l.answerId === answerId);
  }
}
