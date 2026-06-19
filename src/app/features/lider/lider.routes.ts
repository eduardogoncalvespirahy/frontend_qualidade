import { Routes } from '@angular/router';

export const LiderRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/dashboard.component').then((c) => c.DashboardComponent),
    pathMatch: 'full',
    // children: [
    //   {
    //     path: '/config',
    //     loadChildren: () =>
    //       import('./config/config.routes').then((c) => c.ConfigRoutes),
    //     pathMatch: 'full',
    //   }
    // ],
  },
  { path: '**', redirectTo: '' },
];
