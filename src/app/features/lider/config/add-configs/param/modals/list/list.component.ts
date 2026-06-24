import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Answer } from '../../../../../../../core/models/answer.model'

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './list.component.html',
  styleUrl: './list.component.css',
})
export class ListComponent {

readonly answers = input.required<Answer[]>()

readonly formNome = input.required<string>()

readonly selecionado = output<Answer>()

protected selecionar(a:Answer):void {
  this.selecionado.emit(a);
}


}
