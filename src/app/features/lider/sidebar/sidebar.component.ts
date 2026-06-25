import { Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';
import { ExitComponent } from '../../../core/modals/exit/exit.component';
import { LayoutService } from '../../../core/services/layout.service';
import { UserProfile } from '../../../core/models/user-profile.model';
import { filter } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly modal = inject(ModalService);
  protected readonly auth = inject(AuthService);
  protected readonly layout = inject(LayoutService);

  protected readonly profile = signal<UserProfile | null>(null);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      if (window.innerWidth <= 991.98) {
        this.layout.closeMobile();
      }
    });
  }

  toggleSidebar() {
    this.layout.toggleSidebar();
  }

  toggleMobile() {
    this.layout.toggleMobile();
  }

  toggleConfig() {
    this.layout.configOpen();
  }

  closeMobileMenu(): void {
    if (window.innerWidth <= 991.98) {
      this.layout.closeMobile();
    }
  }

  async logout() {
    if (await this.sair()) {
      this.auth.logout();
    }
  }

  async sair(): Promise<boolean | undefined> {
    const ref = this.modal.openComponent(ExitComponent, {
      title: 'Sair do Sistema',
      centered: true,
      inputs: {
        message: 'Deseja realmente sair do sistema?',
        details: 'Sua sessão será encerrada e será necessário realizar login novamente.',
      },
      buttons: [
        {
          text: 'Cancelar',
          variant: 'secondary',
          value: false,
        },
        {
          text: 'Sair',
          variant: 'danger',
          value: true,
        },
      ],
    });

    const confirmed = await ref.result;

    return confirmed;
  }
}
