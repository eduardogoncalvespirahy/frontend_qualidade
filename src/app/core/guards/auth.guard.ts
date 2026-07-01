import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Rota para onde redirecionar quando o usuário está autenticado mas não tem a role.
const FORBIDDEN_REDIRECT = '/';
const LOGIN_REDIRECT = '/login';

/**
 * Guard de autenticação: libera se houver sessão; caso contrário, envia ao login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? true : router.createUrlTree([LOGIN_REDIRECT]);
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

    if (!auth.isAuthenticated()) return router.createUrlTree([LOGIN_REDIRECT]);
    if (roles.length === 0 || auth.hasAnyRole(...roles)) return true;

    return router.createUrlTree([FORBIDDEN_REDIRECT]);
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

    if (!auth.isAuthenticated()) return router.createUrlTree([LOGIN_REDIRECT]);
    if (roles.length === 0 || roles.every((r) => auth.hasRole(r))) return true;

    return router.createUrlTree([FORBIDDEN_REDIRECT]);
  };
}

/**
 * Guard de autorização que lê as roles exigidas de `route.data.roles`
 * (exige QUALQUER UMA). Útil para declarar as roles direto na rota:
 *
 *   { path: 'relatorios', canActivate: [authGuard, roleDataGuard], data: { roles: ['ADMIN'] } }
 */
export const roleDataGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree([LOGIN_REDIRECT]);

  const required = (route.data?.['roles'] as string[] | undefined) ?? [];
  if (required.length === 0 || auth.hasAnyRole(...required)) return true;

  return router.createUrlTree([FORBIDDEN_REDIRECT]);
};
