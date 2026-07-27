import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputUnits } from '../../../../../../../core/models/input-units.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
})
export class FormComponent implements OnInit {
  readonly mode = input<'new' | 'edit'>('new');
  readonly item = input<InputUnits | null>(null);

  protected id = '';
  protected nome = '';
  protected descricao = '';
  protected status = true;

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.nome = u.nome;
      this.descricao = u.descricao || '';
      this.status = u.status === 1;
    }
  }

  value() {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao || null,
      status: this.status ? 1 : 0,
    };
  }
}
