import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';

import { Form } from '../../../core/models/form.model';
import { PaginatedResult } from '../../../core/models/paginated.model';

import { FormService } from '../../../core/services/form.service';
import { NavigationContextService } from '../../../core/services/navigation-context.service';
import { AnswerService } from '../../../core/services/answer.service';
import { Answer } from '../../../core/models/answer.model';
import { CategoryService } from '../../../core/services/category-answer.service';
import { readonly } from '@angular/forms/signals';
import { Category } from '../../../core/models/category-answer.model';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [RouterModule, RouterLink],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly formService = inject(FormService);
  protected readonly answerService = inject(AnswerService);
  protected readonly navigationContext = inject(NavigationContextService);
  private readonly categoryService = inject(CategoryService);

  protected readonly categoriesResource = rxResource({
    stream: () => this.categoryService.getAll(),
  });

  protected readonly categories = computed(() => this.categoriesResource.value()?.data ?? []);

  protected readonly query = signal('');

  // Dicionário de respostas: chave = answerId, valor = texto digitado pelo inspetor
  // Começa vazio e vai sendo preenchido conforme o usuário digita
  protected readonly respostas = signal<Record<string, string>>({});

  // Atualiza a resposta de um parâmetro específico sem apagar as outras
  protected setResposta(answerId: string, valor: string): void {
    this.respostas.update((atual) => ({ ...atual, [answerId]: valor }));
  }

  protected readonly agrupados = computed(() => {
    const answers = this.filtered(); // parâmetros já filtrados
    const categorias = this.categories(); // todas as categorias carregadas

    // Pega só os IDs únicos de categoria que aparecem nos answers
    const ids = [...new Set(answers.map((a) => a.categoryId))];

    // Para cada ID, monta o grupo
    return ids.map((id) => ({
      categoria: categorias.find((c: Category) => String(c.id) === String(id)) ?? null,
      answers: answers.filter((a) => a.categoryId === id),
    }));
  });

  protected readonly page = signal(1);
  protected readonly limit = signal(undefined);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);

  constructor() {
    this.setContext();
  }

  private setContext(): void {
    this.navigationContext.update({
      locationId: this.route.snapshot.paramMap.get('local_id')!,
      sectionId: this.route.snapshot.paramMap.get('secao_id')!,
      formId: this.route.snapshot.paramMap.get('formulario_id')!,
    });
  }

  protected readonly formResource = rxResource<Form, { id: string }>({
    params: () => ({
      id: this.navigationContext.context().formId,
    }),
    stream: ({ params }) => this.formService.getById(params.id),
  });

  protected readonly form = computed(() => this.formResource.value());

  protected readonly answersResource = rxResource<
    PaginatedResult<Answer>,
    { page?: number; limit?: number }
  >({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
    }),
    stream: ({ params }) => this.answerService.getAll(params.limit, params.page),
  });

  protected readonly answers = computed(() => {
    const formId = this.navigationContext.context().formId;

    return this.answersResource.value()?.data.filter((answers) => answers.formId === formId) ?? [];
  });

  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();

    if (!term) {
      return this.answers();
    }

    return this.answers().filter(
      (answer) =>
        answer.nome.toLowerCase().includes(term) ||
        answer.id.toLowerCase().includes(term) ||
        (answer.descricao ?? '').toLowerCase().includes(term),
    );
  });

  protected readonly pagination = computed(() => {
    const result = this.answersResource.value();

    return {
      page: result?.page ?? 1,
      limit: result?.limit ?? 10,
      total: result?.total ?? 0,
      totalPages: result?.totalPages ?? 1,
    };
  });

  protected readonly pages = computed(() => {
    const totalPages = this.pagination().totalPages;

    return Array.from({ length: totalPages }, (_, index) => index + 1);
  });

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  protected reload(): void {
    this.answersResource.reload();
  }

  protected goToPage(page: number): void {
    const totalPages = this.pagination().totalPages;

    if (page < 1 || page > totalPages) {
      return;
    }

    this.page.set(page);
  }

  protected nextPage(): void {
    this.goToPage(this.pagination().page + 1);
  }

  protected previousPage(): void {
    this.goToPage(this.pagination().page - 1);
  }
  private salvarRascunho(): void {
  const formId = this.navigationContext.context().formId;
  localStorage.setItem(`formulario_rascunho_${formId}`, JSON.stringify(this.respostas()));
}
  private restaurarRascunho(): void {
  const formId = this.navigationContext.context().formId;
  const salvo  = localStorage.getItem(`formulario_rascunho_${formId}`);
  if (salvo) this.respostas.set(JSON.parse(salvo));
}

// protected setResposta(answerId: string, valor: string): void {
//   this.respostas.update(atual => ({ ...atual, [answerId]: valor }));
//   this.salvarRascunho();
// }






}
