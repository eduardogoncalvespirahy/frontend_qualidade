import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'lider',
    canActivate: [authGuard],
    title: 'Lider',    
    loadChildren: () => import('./features/lider/lider.routes').then(m => m.LiderRoutes)
  },
  {
    path: 'inspetor',
    title: 'Inspetor',
    loadChildren: () => import('./features/inspetor/inspetor.routes').then(m => m.InspetorRoutes)
  },
  { path: '**', redirectTo: '' },
];
