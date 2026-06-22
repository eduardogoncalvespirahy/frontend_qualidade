import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CookieService } from './cookie.service';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { Router } from '@angular/router';

const TOKEN_KEY = 'aq_token';
const REFRESH_KEY = 'aq_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly cookie = inject(CookieService);
  private readonly router = inject(Router);   

  private readonly _token = signal<string | null>(this.read(TOKEN_KEY));
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request)
      .pipe(tap((res) => this.setSession(res)));
  }

  logout(): void {
    this.clear();
    this._token.set(null); 
    this.router.navigate(['/login']);  
  }

  private setSession(res: LoginResponse): void {
    this.write(TOKEN_KEY, res.token);
    this.write(REFRESH_KEY, res.refreshToken);
    this._token.set(res.token);
  }

  private read(key: string): string | null {
    return this.cookie.get(key);
  }

  private write(key: string, value: string): void {
    this.cookie.set(key, value, 
      {
        httpOnly: environment.production,                     // Impede acesso via JavaScript no navegador (protege contra XSS)
        secure: environment.production,                       // Envia o cookie apenas via HTTPS
        sameSite: environment.production ? 'Strict' : 'Lax',  // Protege contra ataques CSRF
        maxAge: 3600000                                       // Duração do cookie em milissegundos (1 hora)
      }
    );
  }

  private clear(): void {
    this.cookie.delete(TOKEN_KEY);
    this.cookie.delete(REFRESH_KEY);
  }
}
