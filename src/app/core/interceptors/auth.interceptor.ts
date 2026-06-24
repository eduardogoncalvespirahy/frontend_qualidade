import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from '../services/cookie.service';

const TOKEN_KEY = 'aq_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cookie = inject(CookieService);  
  const token = cookie.get(TOKEN_KEY);

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
