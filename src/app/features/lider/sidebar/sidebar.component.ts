import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);   

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

  logout() {
    this.auth.logout();   
  }
}
