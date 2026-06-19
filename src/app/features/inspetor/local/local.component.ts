import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LocationService } from '../../../core/services/location.service';
import { Location } from './../../../core/models/location.model';
import { SectionService } from '../../../core/services/section.service';
import { PaginatedResult } from '../../../core/models/paginated.model';
import { Section } from '../../../core/models/section.model';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavigationContextService } from '../../../core/services/navigation-context.service';

@Component({
  selector: 'app-local',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './local.component.html',
  styleUrl: './local.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly locationService = inject(LocationService);
  protected readonly sectionService = inject(SectionService);
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
    });
  }

  protected readonly locationResource = rxResource<Location, { id: string }>({
    params: () => ({
      id: this.navigationContext.context().locationId,
    }),
    stream: ({ params }) => this.locationService.getById(params.id),
  });

  protected readonly location = computed(() => this.locationResource.value());

  protected readonly sectionsResource = rxResource<
    PaginatedResult<Section>,
    { page?: number; limit?: number }
  >({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
    }),
    stream: ({ params }) => this.sectionService.getAll(params.limit, params.page),
  });

  protected readonly sections = computed(() => {
    const employerId = this.location()?.employerId;

    if (!employerId) {
      return [];
    }

    return (
      this.sectionsResource.value()?.data.filter((section) => section.employerId === employerId) ??
      []
    );
  });

  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();

    if (!term) {
      return this.sections();
    }

    return this.sections().filter(
      (section: Section) =>
        (section.nome ?? '').toLowerCase().includes(term) ||
        section.id.toLowerCase().includes(term),
    );
  });

  protected readonly pagination = computed(() => {
    const result = this.sectionsResource.value();

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
    this.sectionsResource.reload();
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
