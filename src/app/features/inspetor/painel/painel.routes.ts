import { Routes } from '@angular/router';

export const PainelRoutes: Routes = [
  {
    path: '',
    title: 'painel industria',
    loadComponent: () => import('./painel.component').then((c) => c.PainelComponent),
    children: [
        {
            path:'local',
            title:'Locais',
            loadComponent: () =>
                import('./itens/local/local.component')
                    .then(m => m.LocalComponent), 
        },
        {
            path:'secao',
            title:'Seções',
            loadComponent: () =>
                import('./itens/secao/secao.component')
                    .then(m => m.SecaoComponent), 
        },
        {
            path:'formulario',
            title:'Formularios',
            loadComponent: () =>
                import('./itens/formulario/formulario.component')
                    .then(m => m.FormularioComponent), 
        },
    ]} 
];
