import { ChangeDetectionStrategy, Component, computed, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Section } from '../../../../../../../core/models/section.model';
import { Employer } from '../../../../../../../core/models/employer.model';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form.component.html',
})
export class FormComponent implements OnInit {
  readonly mode = input<'new' | 'edit'>('new');
  readonly item = input<Section | null>(null);
  // Catálogo de empresas para buscar pelo nome fantasia (tradingName → id).
  readonly employers = input<Employer[]>([]);
  // Quando vem do drill-down, o employer é definido pelo local selecionado.
  readonly lockedEmployerId = input<string>('');

  protected id = '';
  protected employerId = ''; // id resolvido a partir da seleção (ou travado)
  protected nome = '';
  protected descricao = '';
  protected status = true;

  // ── combobox de empresa ──
  protected readonly query = signal('');
  protected readonly open = signal(false);
  private blurTimer: ReturnType<typeof setTimeout> | null = null;

  /** Empresa travada pelo local (drill-down) → campo somente-leitura. */
  readonly locked = computed(() => !!this.lockedEmployerId());

  private label(e: Employer): string {
    return e.tradingName || e.id;
  }

  readonly filteredEmployers = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = [...this.employers()].sort((a, b) => this.label(a).localeCompare(this.label(b)));
    const base = q ? list.filter((e) => this.label(e).toLowerCase().includes(q)) : list;
    return base.slice(0, 50);
  });

  ngOnInit(): void {
    const u = this.item();
    if (u) {
      this.id = u.id;
      this.employerId = u.employerId;
      this.nome = u.nome;
      this.descricao = u.descricao || '';
      this.status = u.status === 1;
    }
    const locked = this.lockedEmployerId();
    if (locked) this.employerId = locked;

    const sel = this.employers().find((e) => e.id === this.employerId);
    this.query.set(sel ? this.label(sel) : this.employerId || '');
  }

  onQuery(text: string): void {
    if (this.locked()) return;
    this.query.set(text);
    this.open.set(true);
    this.employerId = ''; // digitar exige nova seleção
  }

  selectEmployer(e: Employer): void {
    if (this.blurTimer) clearTimeout(this.blurTimer);
    this.employerId = e.id;
    this.query.set(this.label(e));
    this.open.set(false);
  }

  onBlur(): void {
    this.blurTimer = setTimeout(() => this.open.set(false), 150);
  }

  clearEmployer(): void {
    this.employerId = '';
    this.query.set('');
    this.open.set(true);
  }

  value() {
    return {
      id: this.id,
      employerId: this.employerId,
      nome: this.nome,
      descricao: this.descricao || null,
      status: this.status ? 1 : 0,
    };
  }
}
