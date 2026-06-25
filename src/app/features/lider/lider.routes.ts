import { Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard.component';
import { ConfigComponent } from './config/config.component';
import { HomeComponent } from '../home/home.component';
import { PainelComponent } from './painel/painel.component';
import { HistoricoComponent } from './historico/historico.component';

export const LiderRoutes: Routes = [
  {
  path: '',
  loadComponent: () => DashboardComponent,   // layout shell
  children: [
    { 
      path: 'config', 
      loadComponent: () => ConfigComponent 
    },
    { 
      path: 'painel', 
      loadComponent: () => PainelComponent 
    },
    { 
      path: 'historico', 
      loadComponent: () => HistoricoComponent 
    },    
  ]
}

];
