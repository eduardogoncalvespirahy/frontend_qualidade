import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';

import { Answer } from '../../../../../../../core/models/answer.model';

import { CategoryService } from '../../../../../../../core/services/category-answer.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
})
export class FormComponent implements OnInit {
  // Modo: 'new' para criar, 'edit' para editar
  readonly mode = input<'new' | 'edit'>('new');

  // Item existente — só passado quando mode = 'edit'
  readonly item = input<Answer | null>(null);

  // ID do formulário pai — passado quando mode = 'new'
  readonly parentId = input<string>('');

  // traz categoria
  private readonly categoryService = inject(CategoryService);

  // para fazer as pesquisas 
  protected readonly categoriesResource = rxResource({
    stream: () => this.categoryService.getAll(),
  });

  protected readonly categories = computed(() => this.categoriesResource.value()?.data ?? []);

  // Campos do formulário
  protected id = '';
  protected nome = '';
  protected descricao = '';
  
  protected limitMin = signal('');
  protected limitMax = signal('');

  protected status = true;
  protected dataCriacao: Date = new Date(); // só usada no create
  protected categoryId: number = 1;

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.nome = u.nome;
      this.descricao = u.descricao || '';
      this.status = u.status === 1;
      this.dataCriacao = u.dataCriacao; // preserva a data original
      this.categoryId = u.categoryId;
    }
  }

limitValue() {
  if (!this.limitMin() && !this.limitMax()) return null;
  return {
    limit_min: this.limitMin() || null,
    limit_max: this.limitMax() || null,
  };
}



  value(): Answer {
    return {
      id: this.id,
      formId: this.parentId(),
      nome: this.nome,
      descricao: this.descricao || null,
      status: this.status ? 1 : 0,
      dataCriacao: this.dataCriacao, // retorna a original
      dataAlteracao: new Date(), // sempre atualiza
      categoryId: this.categoryId,
    };
  }
}
