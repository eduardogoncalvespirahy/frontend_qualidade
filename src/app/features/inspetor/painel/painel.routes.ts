import { Routes } from '@angular/router';

export const PainelRoutes: Routes = [
  {
    path: '',
    title: 'painel industria',
    loadComponent: () => import('./painel.component').then((c) => c.PainelComponent),
  },
];
