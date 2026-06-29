import { Routes } from '@angular/router';

export const ConfigRoutes: Routes = [
  {
    path: '',
    title: 'config',
    loadComponent: () => import('./config.component').then((c) => c.ConfigComponent),
    children: [
        {
            path:'location',
            title:'Locais',
            loadComponent: () =>
                import('./add-configs/location/location.component')
                    .then(m => m.LocationComponent), 
        },
        {
            path:'section',
            title:'Seções',
            loadComponent: () =>
                import('./add-configs/section/section.component')
                    .then(m => m.SectionComponent), 
        },        
        {
            path:'form',
            title:'Formularios',
            loadComponent: () =>
                import('./add-configs/form/form.component')
                    .then(m => m.FormComponent), 
        },        
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
