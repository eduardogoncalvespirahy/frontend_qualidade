import { Routes } from '@angular/router';

export const LiderRoutes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./dashboard/dashboard.component').then(c => c.DashboardComponent), 
    pathMatch: 'full' 
  },
  // { 
  //   path: '', 
  //   loadComponent: () => import('./dashboard/dashboard.component').then(c => c.DashboardComponent), 
  //   pathMatch: 'full' 
  // },
  // { 
  //   path: '', 
  //   loadComponent: () => import('./dashboard/dashboard.component').then(c => c.DashboardComponent), 
  //   pathMatch: 'full' 
  // },
  // { 
  //   path: '', 
  //   loadComponent: () => import('./dashboard/dashboard.component').then(c => c.DashboardComponent), 
  //   pathMatch: 'full' 
  // },
  { path: '**', redirectTo: '' },
];
