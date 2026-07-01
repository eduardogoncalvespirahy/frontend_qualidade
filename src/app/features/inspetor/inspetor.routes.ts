import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PainelComponent } from './painel/painel.component';
import { RelatorioComponent } from './relatorio/relatorio.component';
import { HistoricoComponent } from './historico/historico.component';

export const InspetorRoutes: Routes = [
  {
    path: '',
    loadComponent: () => DashboardComponent, // layout shell
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
  {
    path: 'local/:local_id',
    title: 'Local',
    loadComponent: () => import('./local/local.component').then((c) => c.LocalComponent),
  },
  {
    path: 'local/:local_id/secao/:secao_id',
    title: 'Seção',
    loadComponent: () => import('./secao/secao.component').then((c) => c.SecaoComponent),
  },
  {
    path: 'local/:local_id/secao/:secao_id/formulario/:formulario_id',
    title: 'Formulario',
    loadComponent: () =>
      import('./formulario/formulario.component').then((c) => c.FormularioComponent),
  },
  { path: 'inspetor/local/**', redirectTo: 'local/:local_id' },
];
