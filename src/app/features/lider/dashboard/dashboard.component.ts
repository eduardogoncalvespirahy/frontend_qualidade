import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected readonly layout = inject(LayoutService);

  readonly activeComponent = signal<unknown | null>(null);

  onActivate(componentRef: unknown) {
    this.activeComponent.set(componentRef);
  }

  onDeactivate() {
    this.activeComponent.set(null);
  }
}
