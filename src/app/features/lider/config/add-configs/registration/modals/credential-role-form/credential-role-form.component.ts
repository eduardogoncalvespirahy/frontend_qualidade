import { ChangeDetectionStrategy, Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Role } from '../../../../../../../core/models/role.model';

@Component({
  selector: 'app-credential-role-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-role-form.component.html',
})
export class CredentialRoleFormComponent implements OnInit {
  // Regras disponíveis (já filtradas pelo systemId da credencial).
  readonly roles = input<Role[]>([]);
  // roleId atual (quando trocando a regra existente).
  readonly currentRoleId = input<string>('');

  protected roleId = '';

  ngOnInit(): void {
    this.roleId = this.currentRoleId();
  }

  value() {
    return { roleId: this.roleId };
  }
}
