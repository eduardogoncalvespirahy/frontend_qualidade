import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-credential-location-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-location-form.component.html',
  styleUrl: './credential-location-form.component.css',
})
export class CredentialLocationFormComponent {
  /** Locais que ainda NÃO estão vinculados à credencial. */
  readonly availableLocations = input<{ id: string; nome: string }[]>([]);

  readonly query = signal('');
  readonly selectedIds = signal<string[]>([]);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const base = this.availableLocations();
    return (q ? base.filter((l) => (l.nome ?? '').toLowerCase().includes(q)) : base).slice(0, 100);
  });

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  toggle(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  value(): { locationIds: string[] } {
    return { locationIds: this.selectedIds() };
  }
}
