import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);

  collapsed = signal(false);
  mobileOpen = signal(false);
  configOpen = signal(false);

  toggleSidebar() {
    this.collapsed.update((v) => !v);
  }

  toggleMobile() {
    this.mobileOpen.update((v) => !v);
  }

  toggleConfig() {
    this.configOpen.update((v) => !v);
  }

  async logout() {
    if (await this.sair()) {
      this.auth.logout();
    }
  }

  protected async sair(): Promise<boolean | undefined> {
    const ref = this.modal.open<boolean>({
      title: 'Sair do Sistema',
      body: 'Deseja realmente sair do sistema?',
      centered: true,
      backdrop: 'static',
      buttons: [
        { text: 'Cancelar', variant: 'secondary', value: false },
        { text: 'Sair', variant: 'danger', value: true },
      ],
    });

    return await ref.result; // true | false | undefined
  }
}
