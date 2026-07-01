import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import {
  Observable,
  EMPTY,
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';

import { CookieService } from './cookie.service';
import { UserService } from './user.service';
import { CredentialRoleService } from './credential-role.service';

import { environment } from '../../../environments/environment';

import { LoginRequest, LoginResponse } from '../models/auth.model';
import { UserProfile } from '../models/user-profile.model';

const TOKEN_KEY = 'aq_token';
const REFRESH_KEY = 'aq_refresh';
const USER_ID = 'aq_userId';
const CREDENTIAL_ID = 'aq_credentialId';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly cookie = inject(CookieService);
  private readonly router = inject(Router);

  private readonly userService = inject(UserService);
  private readonly credentialRoleService = inject(CredentialRoleService);

  // =====================================================
  // AUTH
  // =====================================================

  private readonly _token = signal<string | null>(this.read(TOKEN_KEY));

  readonly token = this._token.asReadonly();

  readonly isAuthenticated = computed(() => !!this._token());

  private readonly _userId = signal<string | null>(this.read(USER_ID));

  readonly userId = this._userId.asReadonly();

  private readonly _credentialId = signal<string | null>(this.read(CREDENTIAL_ID));

  readonly credentialId = this._credentialId.asReadonly();

  // =====================================================
  // PROFILE
  // =====================================================

  private readonly _userProfile = signal<UserProfile | null>(null);

  private readonly _loading = signal(false);

  readonly userProfile = this._userProfile.asReadonly();

  readonly loading = this._loading.asReadonly();

  readonly isProfileLoaded = computed(() => this._userProfile() !== null);

  // =====================================================
  // ROLES
  // =====================================================

  private readonly _roles = signal<string[]>([]);

  /** Nomes das roles da credencial autenticada. */
  readonly roles = this._roles.asReadonly();

  /** Verifica se a credencial autenticada possui uma role específica. */
  hasRole(role: string): boolean {
    return this._roles().includes(role);
  }

  /** Verifica se possui ao menos uma das roles informadas. */
  hasAnyRole(...roles: string[]): boolean {
    return roles.some((r) => this._roles().includes(r));
  }

  constructor() {}

  // =====================================================
  // LOGIN
  // =====================================================

  login(request: LoginRequest): Observable<UserProfile> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap((response) => {
        console.log('Login bem-sucedido:', response);
        this.insert(response);
      }),

      // Carrega perfil + roles (reaproveita loadProfile).
      switchMap(() => this.loadProfile()),
    );
  }

  // =====================================================
  // SESSION RESTORE
  // =====================================================

  restoreSession(): void {
    const token = this._token();
    const userId = this._userId();

    if (!token || !userId) {
      return;
    }

    this.loadProfile().subscribe({
      error: (error) => {
        console.error('Erro ao restaurar sessão:', error);
      },
    });
  }

  // =====================================================
  // PROFILE + ROLES
  // =====================================================

  loadProfile(): Observable<UserProfile> {
    const userId = this.userId();
    const credentialId = this.credentialId();

    if (!userId) {
      return throwError(() => new Error('UserId não encontrado'));
    }

    if (this._loading()) {
      return EMPTY;
    }

    this._loading.set(true);

    return forkJoin({
      profile: this.userService.getByIdUserProfile(userId),
      // Se a falha nas roles não deve impedir o login, mantemos o catchError → [].
      roles: credentialId
        ? this.credentialRoleService
            .getRoleNamesByCredential(credentialId)
            .pipe(catchError(() => of<string[]>([])))
        : of<string[]>([]),
    }).pipe(
      tap(({ profile, roles }) => {
        this._userProfile.set(profile);
        this._roles.set(roles ?? []);
      }),

      map(({ profile }) => profile),

      finalize(() => {
        this._loading.set(false);
      }),

      catchError((error) => {
        console.error('Erro ao carregar perfil:', error);

        this.clearProfile();

        return throwError(() => error);
      }),
    );
  }

  refreshProfile(): void {
    this.clearProfile();

    this.loadProfile().subscribe({
      error: (error) => {
        console.error(error);
      },
    });
  }

  forceReloadProfile(): void {
    this.refreshProfile();
  }

  private clearProfile(): void {
    this._userProfile.set(null);
    this._roles.set([]);
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    this.clearProfile();
    this.clear();

    this.router.navigate(['/login']);
  }

  // =====================================================
  // COOKIE MANAGEMENT
  // =====================================================

  private insert(response: LoginResponse): void {
    this.write(TOKEN_KEY, response.token);
    this.write(REFRESH_KEY, response.refreshToken);
    this.write(USER_ID, response.userId);
    this.write(CREDENTIAL_ID, response.credentialId);

    this._token.set(response.token);
    this._userId.set(response.userId);
    this._credentialId.set(response.credentialId);
  }

  private read(key: string): string | null {
    return this.cookie.get(key);
  }

  private write(key: string, value: string): void {
    this.cookie.set(key, value, {
      httpOnly: environment.production,
      secure: environment.production,
      sameSite: environment.production ? 'Strict' : 'Lax',
      maxAge: 3600000,
    });
  }

  private clear(): void {
    this.cookie.delete(TOKEN_KEY);
    this.cookie.delete(REFRESH_KEY);
    this.cookie.delete(USER_ID);
    this.cookie.delete(CREDENTIAL_ID);

    this._token.set(null);
    this._userId.set(null);
    this._credentialId.set(null);
  }
}