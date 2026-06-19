import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { Location } from '../../core/models/location.model';
import { PaginatedResult } from '../../core/models/paginated.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly locationService = inject(LocationService);

  protected readonly query = signal('');

  protected readonly page = signal<number | undefined>(undefined);
  protected readonly limit = signal<number | undefined>(undefined);

  protected readonly locationsResource = rxResource<PaginatedResult<Location>, { page?: number; limit?: number }>({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
    }),
    stream: ({ params }) => this.locationService.getAll(params.limit, params.page),
  });

  protected readonly locations = computed(() => this.locationsResource.value()?.data ?? []);

  protected readonly filtered = computed(() => {
    const term = this.query().trim().toLowerCase();

    if (!term) {
      return this.locations();
    }

    return this.locations().filter(
      (location: Location) =>
        (location.nome ?? '').toLowerCase().includes(term) ||
        location.id.toLowerCase().includes(term),
    );
  });

  protected onSearch(value: string): void {
    this.query.set(value);
  }

  protected reload(): void {
    this.locationsResource.reload();
  }
}
