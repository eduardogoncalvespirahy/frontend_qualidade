import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-credential-role-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-role-form.component.html',
})
export class CredentialRoleFormComponent {
  /** Regras que ainda NÃO estão vinculadas à credencial. */
  readonly availableRoles = input<{ id: string; nome: string }[]>([]);
 
  readonly query = signal('');
  readonly selectedIds = signal<string[]>([]);
 
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const base = this.availableRoles();
    return (q ? base.filter((r) => (r.nome ?? '').toLowerCase().includes(q)) : base).slice(0, 100);
  });
 
  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }
 
  toggle(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }
 
  value(): { roleIds: string[] } {
    return { roleIds: this.selectedIds() };
  }
}
