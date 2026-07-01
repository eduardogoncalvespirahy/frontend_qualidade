import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { UserProfile } from '../../../core/models/user-profile.model';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly router = inject(Router);
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
}

