import { Routes } from '@angular/router';

export const InspetorRoutes: Routes = [
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
    loadComponent: () => import('./formulario/formulario.component').then((c) => c.FormularioComponent),
  },  
  { path: 'inspetor/local/**', redirectTo: 'local/:local_id' },
];
