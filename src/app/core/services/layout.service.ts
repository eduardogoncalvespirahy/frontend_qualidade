import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly configOpen = signal(false);

  toggleSidebar(): void {
    this.collapsed.update((v) => {
      const collapsed = !v;

      document.body.classList.toggle('sidebar-collapsed', collapsed);

      return collapsed;
    });
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  toggleConfig() {
    this.configOpen.update((v) => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
