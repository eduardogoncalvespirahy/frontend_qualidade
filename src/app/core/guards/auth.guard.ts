import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

const FORBIDDEN_REDIRECT = '/';
const LOGIN_REDIRECT = '/login';

type GuardResult = boolean | UrlTree;

/**
 * Resolve o acesso garantindo que o perfil/roles estejam carregados antes de
 * checar (essencial após um reload, quando as roles ainda não vieram).
 *  - sem sessão            → vai ao login;
 *  - perfil não carregável → vai ao login (sessão inválida);
 *  - roles insuficientes   → vai ao FORBIDDEN;
 *  - ok                    → libera.
 */
function resolveAccess(
  auth: AuthService,
  router: Router,
  allowed: () => boolean,
): Observable<GuardResult> {
  if (!auth.isAuthenticated()) {
    return of(router.createUrlTree([LOGIN_REDIRECT]));
  }

  return auth.ensureProfileLoaded().pipe(
    map((ok) => {
      if (!ok) return router.createUrlTree([LOGIN_REDIRECT]);
      return allowed() ? true : router.createUrlTree([FORBIDDEN_REDIRECT]);
    }),
  );
}

/**
 * Guard de autenticação: exige apenas uma sessão válida.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Sem restrição de role → allowed sempre true.
  return resolveAccess(auth, router, () => true);
};

/**
 * Guard de autorização (fábrica) — exige QUALQUER UMA das roles informadas.
 *
 *   { path: 'admin', canActivate: [roleGuard('ADMIN', 'GESTOR')] }
 */
export function roleGuard(...roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return resolveAccess(auth, router, () => roles.length === 0 || auth.hasAnyRole(...roles));
  };
}

/**
 * Guard de autorização (fábrica) — exige TODAS as roles informadas.
 *
 *   { path: 'auditoria', canActivate: [roleGuardAll('ADMIN', 'AUDITOR')] }
 */
export function roleGuardAll(...roles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return resolveAccess(
      auth,
      router,
      () => roles.length === 0 || roles.every((r) => auth.hasRole(r)),
    );
  };
}

/**
 * Guard de autorização que lê as roles exigidas de `route.data.roles`
 * (exige QUALQUER UMA). Útil para declarar as roles direto na rota:
 *
 *   { path: 'relatorios', canActivate: [roleDataGuard], data: { roles: ['ADMIN'] } }
 */
export const roleDataGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const required = (route.data?.['roles'] as string[] | undefined) ?? [];

  return resolveAccess(auth, router, () => required.length === 0 || auth.hasAnyRole(...required));
};
