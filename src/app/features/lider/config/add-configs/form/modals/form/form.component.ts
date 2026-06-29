import { ChangeDetectionStrategy, Component, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Form } from '../../../../../../../core/models/form.model';
import { Section } from '../../../../../../../core/models/section.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form.component.html',
})
export class FormularioFormComponent implements OnInit {
  readonly mode = input<'new' | 'edit'>('new');
  readonly item = input<Form | null>(null);
  readonly sections = input<Section[]>([]);

  protected id = '';
  protected nome = '';
  protected descricao = '';
  protected status = true;
  protected sectionId = signal('');

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.nome = u.nome;
      this.descricao = u.descricao || '';
      this.status = u.status === 1;
      this.sectionId.set(u.sectionId);
    }
  }

  value() {
    return {
      id: this.id,
      sectionId: this.sectionId(),
      nome: this.nome,
      descricao: this.descricao || null,
      status: this.status ? 1 : 0,
    };
  }
}