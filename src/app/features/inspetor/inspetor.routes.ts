import { Routes } from '@angular/router';

import { authGuard, roleGuard } from '../../core/guards/auth.guard';

import { DashboardComponent } from './dashboard/dashboard.component';
import { PainelComponent } from './painel/painel.component';
import { RelatorioComponent } from './relatorio/relatorio.component';
import { HistoricoComponent } from './historico/historico.component';

export const InspetorRoutes: Routes = [
  {
    path: '',
    loadComponent: () => DashboardComponent, // layout shell
    canActivate: [authGuard, roleGuard('ADMIN','INSPETOR')],
    children: [
      {
        path: 'painel',
        loadComponent: () => PainelComponent,
      },
      {
        path: 'relatorio',
        loadComponent: () => RelatorioComponent,
      },
      {
        path: 'historico',
        loadComponent: () => HistoricoComponent,
      },
    ],
  },
];