import { Routes } from '@angular/router';

export const ConfigRoutes: Routes = [
  {
    path: '',
    title: 'config',
    loadComponent: () => import('./config.component').then((c) => c.ConfigComponent),
    children: [
        {
            path:'machine',
            title:'Maquinas',
            loadComponent: () =>
                import('./add-configs/machine/machine.component')
                    .then(m => m.MachineComponent), 
        },
        {
            path:'param',
            title:'Parametros e Regras',
            loadComponent: () =>
                import('./add-configs/param/param.component')
                    .then(m => m.ParamComponent), 
        },
        {
            path:'register',
            title:'Cadastro',
            loadComponent: () =>
                import('./add-configs/registration/registration.component')
                    .then(m => m.RegistrationComponent), 
        },
    ]} 
];
