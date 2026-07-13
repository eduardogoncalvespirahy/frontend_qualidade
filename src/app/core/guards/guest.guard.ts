import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

function homeRouteFor(auth: AuthService): string {
  if (auth.hasRole('LIDER')) return '/lider';
  if (auth.hasRole('INSPETOR')) return '/inspetor';
  return '/';
}

/**
 * Guard de visitante: libera rotas públicas (ex.: /login) apenas para quem
 * NÃO está autenticado. Se já houver sessão VÁLIDA, redireciona para a área
 * da role.
 *
 * Como as roles chegam de forma assíncrona (perfil), garantimos o carregamento
 * antes de decidir o destino — assim, após um reload, o redirecionamento usa a
 * role correta em vez de cair sempre em '/'. Se a sessão estiver inválida
 * (perfil não carrega), liberamos a rota pública.
 */
export const guestGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Sem sessão → rota pública liberada.
  if (!auth.isAuthenticated()) {
    return of(true);
  }

  return auth.ensureProfileLoaded().pipe(
    map((ok) =>
      // Sessão válida → manda para a área da role; inválida → libera o login.
      ok ? router.createUrlTree([homeRouteFor(auth)]) : true,
    ),
  );
};
