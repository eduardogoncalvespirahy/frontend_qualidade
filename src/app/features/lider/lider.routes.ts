import { Routes } from '@angular/router';

import { authGuard, roleGuard } from '../../core/guards/auth.guard';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ConfigComponent } from './config/config.component';
import { PainelComponent } from './painel/painel.component';
import { HistoricoComponent } from './historico/historico.component';

export const LiderRoutes: Routes = [
  {
    path: '',
    loadComponent: () => DashboardComponent, // layout shell
    canActivate: [authGuard, roleGuard('ADMIN','LIDER')],
    children: [
      {
        path: 'config',
        loadComponent: () => ConfigComponent,
      },
      {
        path: 'painel',
        loadComponent: () => PainelComponent,
      },
      {
        path: 'historico',
        loadComponent: () => HistoricoComponent,
      },
    ],
  },
];
