import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Home',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
    pathMatch: 'full',
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'lider',
    title: 'Lider',
    loadChildren: () => import('./features/lider/lider.routes').then((m) => m.LiderRoutes),
    canActivate: [authGuard],
  },
  {
    path: 'inspetor',
    title: 'Inspetor',
    loadChildren: () => import('./features/inspetor/inspetor.routes').then((m) => m.InspetorRoutes),
  },
  { path: '**', redirectTo: '' },
];
