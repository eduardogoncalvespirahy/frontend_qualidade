import { inject } from '@angular/core';
import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

/** Marca requisições já reprocessadas após um refresh (evita loop de 401). */
const RETRIED = new HttpContextToken<boolean>(() => false);

/**
 * Refresh EM ANDAMENTO, compartilhado entre requisições. Se vários 401
 * acontecerem juntos, todos aguardam o MESMO refresh em vez de disparar vários.
 */
let refresh$: Observable<unknown> | null = null;

function isAuthEndpoint(url: string): boolean {
  return (
    url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Só mexe nas chamadas à nossa API; o resto passa intacto.
  const isApi = req.url.startsWith(environment.apiUrl);
  if (!isApi) {
    return next(req);
  }

  // withCredentials → o navegador envia os cookies httpOnly (token/refresh).
  const request = req.clone({ withCredentials: true });

  return next(request).pipe(
    catchError((error: unknown) => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;
      const jaTentou = request.context.get(RETRIED);

      // Sem 401, em endpoint de auth, ou já reprocessada → propaga o erro.
      if (!is401 || isAuthEndpoint(request.url) || jaTentou) {
        return throwError(() => error);
      }

      // Dispara (ou reaproveita) um único refresh.
      if (!refresh$) {
        refresh$ = auth.refresh().pipe(
          finalize(() => (refresh$ = null)),
          shareReplay(1),
        );
      }

      return refresh$.pipe(
        // refresh OK → refaz a requisição original, marcada como já reprocessada.
        switchMap(() =>
          next(
            request.clone({
              withCredentials: true,
              context: request.context.set(RETRIED, true),
            }),
          ),
        ),
        // refresh falhou → o próprio AuthService.refresh já limpou a sessão e
        // redirecionou para o login; aqui só propagamos o erro.
        catchError((refreshError) => throwError(() => refreshError)),
      );
    }),
  );
};
