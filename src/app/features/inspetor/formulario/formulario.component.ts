import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';

import { Form } from '../../../core/models/form.model';
import { PaginatedResult } from '../../../core/models/paginated.model';

import { FormService } from '../../../core/services/form.service';
import { NavigationContextService } from '../../../core/services/navigation-context.service';
import { AnswerService } from '../../../core/services/answer.service';
import { Answer } from '../../../core/models/answer.model';

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

  protected readonly query = signal('');

  protected readonly page = signal(1);
  protected readonly limit = signal(undefined);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly formularioId = signal('');
  protected readonly secaoId = signal('');
  protected readonly localId = signal('');

  constructor() {
    this.setContext();
  }

  private setContext(): void {
    this.navigationContext.formnId.set(this.route.snapshot.paramMap.get('formulario_id')!);
    this.formularioId.set(this.navigationContext.formnId() ?? '');
    this.secaoId.set(this.navigationContext.sectionId() ?? '');
    this.localId.set(this.navigationContext.locationId() ?? '');
  }

  protected readonly formResource = rxResource<Form, { id: string }>({
    params: () => ({
      id: this.formularioId(),
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
    const formId = this.formularioId();

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
}
