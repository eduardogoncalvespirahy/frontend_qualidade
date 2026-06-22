import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ConfigComponent } from './config/config.component';
import { LocalComponent } from '../inspetor/local/local.component';
import { HomeComponent } from '../home/home.component';

export const LiderRoutes: Routes = [
  {
  path: '',
  loadComponent: () => DashboardComponent,   // layout shell
  children: [
    // { path: '', loadComponent: () => , pathMatch: 'full' },
    { 
      path: 'config', 
      loadComponent: () => ConfigComponent 
    },
    { 
      path: 'painel', 
      loadComponent: () => HomeComponent 
    },
  ]
}

];
