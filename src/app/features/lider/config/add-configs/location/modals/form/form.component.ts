import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Location } from '../../../../../../../core/models/location.model';

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
  readonly item = input<Location | null>(null);

  protected id = '';
  protected employerId = '';
  protected nome = '';
  protected descricao = '';
  protected status = true;

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.employerId = u.employerId;
      this.nome = u.nome;
      this.descricao = u.descricao || '';
      this.status = u.status === 1;
    }
  }

  value() {
    return {
      id: this.id,
      employerId: this.employerId,
      nome: this.nome,
      descricao: this.descricao || null,
      status: this.status ? 1 : 0,
    };
  }
}
