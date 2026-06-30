import { ChangeDetectionStrategy, Component, computed, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { User } from '../../../../../../../core/models/user.model';
import { Employee } from '../../../../../../../core/models/employee.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormComponent implements OnInit {
  readonly mode = input<'new' | 'edit'>('new');
  readonly item = input<User | null>(null);
  // Catálogo de funcionários para buscar pelo nome (personName → id).
  readonly employees = input<Employee[]>([]);

  protected id = '';
  protected employeeId = ''; // id resolvido a partir da seleção
  protected username = '';
  protected email = '';
  protected status = true;

  // ── combobox de funcionário ──
  protected readonly query = signal('');
  protected readonly open = signal(false);
  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  private label(e: Employee): string {
    return e.personName || e.id;
  }

  /** Funcionários que combinam com o texto digitado (limitado p/ performance). */
  readonly filteredEmployees = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = [...this.employees()].sort((a, b) => this.label(a).localeCompare(this.label(b)));
    const base = q ? list.filter((e) => this.label(e).toLowerCase().includes(q)) : list;
    return base.slice(0, 50);
  });

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.employeeId = u.employeeId;
      this.username = u.username;
      this.email = u.email;
      this.status = u.status === 1;
      const sel = this.employees().find((e) => e.id === u.employeeId);
      if (sel) this.query.set(this.label(sel));
    }
  }

  onQuery(text: string): void {
    this.query.set(text);
    this.open.set(true);
    this.employeeId = ''; // digitar exige nova seleção
  }

  selectEmployee(e: Employee): void {
    if (this.blurTimer) clearTimeout(this.blurTimer);
    this.employeeId = e.id;
    this.query.set(this.label(e));
    this.open.set(false);
  }

  onBlur(): void {
    // Fecha depois que o clique numa opção tenha tempo de registrar.
    this.blurTimer = setTimeout(() => this.open.set(false), 150);
  }

  clearEmployee(): void {
    this.employeeId = '';
    this.query.set('');
    this.open.set(true);
  }

  value() {
    return {
      id: this.id,
      employeeId: this.employeeId,
      username: this.username,
      email: this.email,
      status: this.status ? 1 : 0,
    };
  }
}
