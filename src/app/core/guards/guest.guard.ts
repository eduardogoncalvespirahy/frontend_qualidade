import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

function homeRouteFor(auth: AuthService): string {
  if (auth.hasRole('LIDER')) return '/lider';
  if (auth.hasRole('INSPETOR')) return '/inspetor';
  return '/';
}

/**
 * Guard de visitante: libera rotas públicas (ex.: /login) apenas para quem
 * NÃO está autenticado. Se já houver sessão, redireciona para a área da role.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([homeRouteFor(auth)]);
};
