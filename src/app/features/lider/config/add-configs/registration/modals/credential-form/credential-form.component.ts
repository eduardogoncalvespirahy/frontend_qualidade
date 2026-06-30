import { ChangeDetectionStrategy, Component, computed, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { System } from '../../../../../../../core/models/system.model';
import { Credential } from '../../../../../../../core/models/credential.model';

@Component({
  selector: 'app-credential-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-form.component.html',
})
export class CredentialFormComponent implements OnInit {
  readonly mode = input<'new' | 'edit'>('new');
  readonly item = input<Credential | null>(null);
  // userId vem travado pelo usuário selecionado no drill-down.
  readonly lockedUserId = input<string>('');
  // Sistemas onde o usuário ainda NÃO tem credencial (seleção na criação).
  readonly availableSystems = input<System[]>([]);
  // Nome do sistema da credencial em edição (somente leitura).
  readonly systemName = input<string>('');

  protected senha = '';
  protected status = true;
  // Sistemas selecionados na criação (múltiplos).
  protected readonly selectedSystemIds = signal<string[]>([]);

  readonly isEdit = computed(() => this.mode() === 'edit');
  readonly selectedCount = computed(() => this.selectedSystemIds().length);

  ngOnInit(): void {
    const c = this.item();
    if (c) {
      this.status = c.status === 1;
      // senha nunca é pré-preenchida (só temos o hash).
    }
  }

  isSelected(id: string): boolean {
    return this.selectedSystemIds().includes(id);
  }

  toggleSystem(id: string): void {
    this.selectedSystemIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  value() {
    return {
      systemIds: this.selectedSystemIds(),
      senha: this.senha,
      status: this.status ? 1 : 0,
    };
  }
}
