import { Component, inject, signal } from '@angular/core';
import { LayoutService } from '../../../core/services/layout.service';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HomeComponent } from './home/home.component';

@Component({
  selector: 'app-dashboard-inspetor',
  standalone: true,  
  imports: [RouterOutlet, SidebarComponent, HomeComponent],
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
