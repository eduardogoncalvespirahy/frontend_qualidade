import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import {
  Observable,
  EMPTY,
  catchError,
  filter,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';

import { CookieService } from './cookie.service';
import { UserService } from './user.service';
import { CredentialRoleService } from './credential-role.service';
import { CredentialLocationService } from './credential-location.service';

import { environment } from '../../../environments/environment';

import { LoginRequest, LoginResponse } from '../models/auth.model';
import { UserProfile } from '../models/user-profile.model';

// Identificadores NÃO sensíveis, mantidos no cliente apenas para restaurar a
// sessão e carregar o perfil após um reload. O token e o refreshToken NÃO são
// mais guardados aqui — vivem em cookies httpOnly setados pelo servidor.
const USER_ID = 'aq_userId';
const CREDENTIAL_ID = 'aq_credentialId';

// Chaves legadas (token/refresh no cliente). Mantidas só para limpeza.
const LEGACY_TOKEN_KEY = 'aq_token';
const LEGACY_REFRESH_KEY = 'aq_refresh';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly cookie = inject(CookieService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private readonly userService = inject(UserService);
  private readonly credentialRoleService = inject(CredentialRoleService);
  private readonly credentialLocationService = inject(CredentialLocationService);

  // =====================================================
  // AUTH
  // =====================================================

  // O token real fica no cookie httpOnly (inacessível ao JS). Mantemos uma
  // cópia EM MEMÓRIA só para o tempo de vida da aba (útil para quem quiser ler
  // auth.token()). Após um reload ela é null — a autenticação continua válida
  // pelo cookie, e o estado é derivado do userId persistido.
  private readonly _token = signal<string | null>(null);
  readonly token = this._token.asReadonly();

  private readonly _userId = signal<string | null>(this.read(USER_ID));
  readonly userId = this._userId.asReadonly();

  private readonly _credentialId = signal<string | null>(this.read(CREDENTIAL_ID));
  readonly credentialId = this._credentialId.asReadonly();

  // Autenticação é derivada da presença do userId persistido (o servidor é a
  // fonte de verdade: se o cookie estiver expirado, a 1ª chamada dá 401 e o
  // fluxo de refresh/logout assume).
  readonly isAuthenticated = computed(() => !!this._userId());

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
  private readonly _locations = signal<string[]>([]);

  /** Nomes das roles da credencial autenticada. */
  readonly roles = this._roles.asReadonly();

  /** Nomes das locations da credencial autenticada. */
  readonly locations = this._locations.asReadonly();

  /** Verifica se a credencial autenticada possui uma role específica. */
  hasRole(role: string): boolean {
    return this._roles().includes(role);
  }

  /** Verifica se a credencial autenticada possui uma location específica. */
  hasLocation(location: string): boolean {
    return this._locations().includes(location);
  }

  /** Verifica se possui ao menos uma das roles informadas. */
  hasAnyRole(...roles: string[]): boolean {
    return roles.some((r) => this._roles().includes(r));
  }

  /** Verifica se possui ao menos uma das locations informadas. */
  hasAnyLocation(...locations: string[]): boolean {
    return locations.some((l) => this._locations().includes(l));
  }

  constructor() {}

  // =====================================================
  // LOGIN
  // =====================================================

  login(request: LoginRequest): Observable<UserProfile> {
    // withCredentials: o servidor devolve os cookies httpOnly (token/refresh)
    // no Set-Cookie; o navegador os guarda e reenvia nas próximas chamadas.
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, request, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => this.persistSession(response)),

        // Carrega perfil + roles (reaproveita loadProfile).
        switchMap(() => this.loadProfile()),
      );
  }

  // =====================================================
  // REFRESH
  // =====================================================

  /**
   * Renova o token usando o cookie httpOnly de refresh (enviado automaticamente
   * com withCredentials). O servidor rotaciona o refresh e reescreve os cookies;
   * aqui só atualizamos userId/credentialId (e o token em memória).
   *
   * Em caso de falha (refresh inválido/expirado), encerra a sessão localmente.
   * Ideal ser chamado por um HTTP interceptor ao receber 401.
   */
  refresh(): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.persistSession(response)),
        catchError((error) => {
          this.clearProfile();
          this.clear();
          this.router.navigate(['/login']);
          return throwError(() => error);
        }),
      );
  }

  // =====================================================
  // SESSION RESTORE
  // =====================================================

  restoreSession(): void {
    const userId = this._userId();

    // Sem userId persistido não há o que restaurar. O token não é verificável
    // aqui (é httpOnly); a validade real é conferida ao carregar o perfil.
    if (!userId) {
      return;
    }

    this.loadProfile().subscribe({
      error: (error) => {
        console.error('Erro ao restaurar sessão:', error);
      },
    });
  }

  // =====================================================
  // PROFILE + ROLES + LOCATIONS
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

      // Se a falha nas locations não deve impedir o login, mantemos o catchError → [].
      locations: credentialId
        ? this.credentialLocationService
            .getLocationNamesByCredential(credentialId)
            .pipe(catchError(() => of<string[]>([])))
        : of<string[]>([]),
    }).pipe(
      tap(({ profile, roles, locations }) => {
        this._userProfile.set(profile);
        this._roles.set(roles ?? []);
        this._locations.set(locations ?? []);
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

  /**
   * Garante que o perfil (e as roles/locations) estejam carregados antes de
   * uma verificação — essencial para os guards logo após um reload, quando as
   * roles ainda não vieram. Reaproveita o carregamento em andamento, se houver.
   *
   *  - perfil já carregado            → true;
   *  - sem userId (sem sessão)        → false;
   *  - carregamento em andamento      → aguarda terminar e devolve o resultado;
   *  - senão                          → dispara loadProfile e mapeia sucesso/erro.
   */
  ensureProfileLoaded(): Observable<boolean> {
    if (this.isProfileLoaded()) {
      return of(true);
    }

    if (!this._userId()) {
      return of(false);
    }

    if (this._loading()) {
      // espera o loadProfile em andamento concluir (sucesso → profile setado).
      return toObservable(this._loading, { injector: this.injector }).pipe(
        filter((loading) => !loading),
        take(1),
        map(() => this.isProfileLoaded()),
      );
    }

    return this.loadProfile().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  private clearProfile(): void {
    this._userProfile.set(null);
    this._roles.set([]);
    this._locations.set([]);
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {
    // Pede ao servidor para invalidar a sessão e limpar os cookies httpOnly.
    // Independente do resultado, limpamos o estado local e vamos para o login.
    this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.clearProfile();
          this.clear();
          this.router.navigate(['/login']);
        }),
      )
      .subscribe();
  }

  // =====================================================
  // SESSION STATE (client-side, não sensível)
  // =====================================================

  /** Persiste apenas identificadores não sensíveis + token em memória. */
  private persistSession(response: LoginResponse): void {
    this.write(USER_ID, response.userId);
    this.write(CREDENTIAL_ID, response.credentialId);

    this._userId.set(response.userId);
    this._credentialId.set(response.credentialId);

    // token/refresh são cookies httpOnly do servidor; guardamos o token só em
    // memória (opcional). NÃO escrevemos token/refresh em cookie no cliente.
    this._token.set(response.token ?? null);
  }

  private read(key: string): string | null {
    return this.cookie.get(key);
  }

  private write(key: string, value: string): void {
    this.cookie.set(key, value, {
      path: '/',
      sameSite: 'Strict',
      secure: location.protocol === 'https:',
      maxAge: 3600000,
    });
  }

  private clear(): void {
    // Remove os identificadores do cliente + eventuais cookies legados.
    this.cookie.delete(USER_ID);
    this.cookie.delete(CREDENTIAL_ID);
    this.cookie.delete(LEGACY_TOKEN_KEY);
    this.cookie.delete(LEGACY_REFRESH_KEY);

    this._token.set(null);
    this._userId.set(null);
    this._credentialId.set(null);
  }
}
