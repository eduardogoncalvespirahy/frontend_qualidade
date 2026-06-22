import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ConfigComponent } from './config/config.component';

export const LiderRoutes: Routes = [
  {
  path: '',
  loadComponent: () => DashboardComponent,   // layout shell
  children: [
    // { path: '', loadComponent: () => , pathMatch: 'full' },
    { path: 'config', loadComponent: () => ConfigComponent },
  ]
}

];
