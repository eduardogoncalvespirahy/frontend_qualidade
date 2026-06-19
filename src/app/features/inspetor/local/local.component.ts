import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LocationService } from '../../../core/services/location.service';
import { Location } from './../../../core/models/location.model';
import { SectionService } from '../../../core/services/section.service';
import { PaginatedResult } from '../../../core/models/paginated.model';
import { Section } from '../../../core/models/section.model';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { NavigationContextService } from '../../../core/services/navigation-context.service';

@Component({
  selector: 'app-local',
  standalone: true,
  imports: [RouterOutlet,RouterLink],
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
  protected readonly page = signal<number | undefined>(undefined);
  protected readonly limit = signal<number | undefined>(10);
  protected readonly localId = signal('');

  constructor() {
    this.setLocalId();
  }

  protected setLocalId(): void {
    this.navigationContext.locationId.set(this.route.snapshot.paramMap.get('local_id')!);
    this.localId.set(this.navigationContext.locationId()!);
  }

  protected readonly locationResource = rxResource<Location, { id: string }>({
    params: () => ({
      id: this.localId(),
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

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  protected reload() {
    this.sectionsResource.reload();
  }
}
