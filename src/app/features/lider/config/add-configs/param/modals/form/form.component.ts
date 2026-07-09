import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';

import { Answer } from '../../../../../../../core/models/answer.model';
import { LimitAnswer } from '../../../../../../../core/models/limit-answer.model';
import { AnswerGroups } from '../../../../../../../core/models/answer-group.model';

import { CategorieAnswerService } from '../../../../../../../core/services/categorieAnswer.service';

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

  // Limite existente — passado quando mode = 'edit', para pré-preencher os campos de limite
  readonly existingLimit = input<LimitAnswer | null>(null);

  // ID do formulário pai — passado quando mode = 'new'
  readonly parentId = input<string>('');

  // ─── Grupos ───────────────────────────────────────────────────────────────
  // Lista de grupos disponíveis (do formulário) e o grupo atual do parâmetro.
  readonly groups = input<AnswerGroups[]>([]);
  readonly currentGroupId = input<string>('');

  // traz categoria
  private readonly categorieAnswerService = inject(CategorieAnswerService);

  // para fazer as pesquisas
  protected readonly categoriesResource = rxResource({
    stream: () => this.categorieAnswerService.getAll(),
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
  protected categoryId = signal<number>(0);

  // Grupo selecionado ('' = sem grupo) e criação de grupo novo
  protected groupId = signal<string>('');
  protected criandoGrupo = signal(false);
  protected novoGrupoNome = signal('');

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.nome = u.nome;
      this.descricao = u.descricao || '';
      this.status = u.status === 1;
      this.dataCriacao = u.dataCriacao;
      this.categoryId.set(Number(u.categoryId));
    }

    const l = this.existingLimit();
    if (l) {
      this.limitMin.set(l.limitMin ?? '');
      this.limitMax.set(l.limitMax ?? '');
    }

    // pré-seleciona o grupo atual (edição) ou o grupo ativo (criação)
    this.groupId.set(this.currentGroupId());
  }

  protected abrirNovoGrupo(): void {
    this.criandoGrupo.set(true);
    this.groupId.set('');
  }

  protected cancelarNovoGrupo(): void {
    this.criandoGrupo.set(false);
    this.novoGrupoNome.set('');
  }

  limitValue() {
    if (!this.limitMin() && !this.limitMax()) return null;
    return {
      limitMin: this.limitMin() || null,
      limitMax: this.limitMax() || null,
    };
  }

  /**
   * Intenção de grupo escolhida no modal:
   * - { groupId, novoNome: null }  → vincular a um grupo existente (ou nenhum se '')
   * - { groupId: '', novoNome }    → criar um grupo novo e vincular a ele
   */
  groupSelection(): { groupId: string; novoNome: string | null } {
    const novo = this.novoGrupoNome().trim();
    if (this.criandoGrupo() && novo) {
      return { groupId: '', novoNome: novo };
    }
    return { groupId: this.groupId(), novoNome: null };
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
      categoryId: this.categoryId(),
    };
  }
}
