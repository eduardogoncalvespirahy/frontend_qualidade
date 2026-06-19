import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';

import { Section } from '../../../core/models/section.model';
import { PaginatedResult } from '../../../core/models/paginated.model';

import { SectionService } from '../../../core/services/section.service';
import { NavigationContextService } from '../../../core/services/navigation-context.service';
import { FormService } from '../../../core/services/form.service';
import { Form } from '../../../core/models/form.model';

@Component({
  selector: 'app-secao',
  standalone: true,
  imports: [RouterModule, RouterLink],
  templateUrl: './secao.component.html',
  styleUrl: './secao.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecaoComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly sectionService = inject(SectionService);
  protected readonly formService = inject(FormService);
  protected readonly navigationContext = inject(NavigationContextService);

  protected readonly query = signal('');

  protected readonly page = signal(1);
  protected readonly limit = signal(undefined);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(0);

  constructor() {
    this.setContext();
  }

  protected setContext(): void {
    this.navigationContext.update({
      locationId: this.route.snapshot.paramMap.get('local_id')!,      
      sectionId: this.route.snapshot.paramMap.get('secao_id')!,
    });
  }
  protected readonly sectionResource = rxResource<Section, { id: string }>({
    params: () => ({
      id: this.navigationContext.context().sectionId,
    }),
    stream: ({ params }) => this.sectionService.getById(params.id),
  });

  protected readonly section = computed(() => this.sectionResource.value());

  protected readonly pagination = computed(() => {
    const result = this.formsResource.value();

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

  protected readonly formsResource = rxResource<
    PaginatedResult<Form>,
    { page?: number; limit?: number }
  >({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
    }),
    stream: ({ params }) => this.formService.getAll(params.limit, params.page),
  });

  protected readonly forms = computed(() => {
    const sectionId = this.section()?.id;

    if (!sectionId) {
      return [];
    }

    return this.formsResource.value()?.data.filter((form) => form.sectionId == sectionId) ?? [];
  });

  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();

    if (!term) {
      return this.forms();
    }

    return this.forms().filter(
      (form: Form) =>
        (form.nome ?? '').toLowerCase().includes(term) || form.id.toLowerCase().includes(term),
    );
  });

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  protected reload() {
    this.formsResource.reload();
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
