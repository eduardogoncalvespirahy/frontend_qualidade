import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { Observable, EMPTY, finalize, switchMap, tap } from 'rxjs';

import { CookieService } from './cookie.service';
import { UserService } from './user.service';
import { EmployeeService } from './employee.service';

import { environment } from '../../../environments/environment';

import { LoginRequest, LoginResponse } from '../models/auth.model';
import { User } from '../models/user.model';
import { Employee } from '../models/employee.model';

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
  private readonly employeeService = inject(EmployeeService);

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
  // SESSION
  // =====================================================

  private readonly _user = signal<User | null>(null);
  private readonly _employee = signal<Employee | null>(null);
  private readonly _loading = signal(false);

  readonly user = this._user.asReadonly();
  readonly employee = this._employee.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly fullName = computed(() => this._employee()?.personName ?? '');

  readonly isProfileLoaded = computed(() => !!this._user() && !!this._employee());

  constructor() {
    const userId = this._userId();

    if (userId && this._token()) {
      this.loadProfile();
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap((res) => this.insert(res)),
      tap(() => this.loadProfile()),
    );
  }

  logout(): void {
    this.clearProfile();
    this.clear();

    this.router.navigate(['/login']);
  }

  loadProfile(): void {
    if (this.isProfileLoaded()) {
      return;
    }

    const userId = this.userId();

    if (!userId) {
      return;
    }

    if (this._loading()) {
      return;
    }

    this._loading.set(true);

    this.userService
      .getById(userId)
      .pipe(
        tap((user) => this._user.set(user)),
        switchMap((user) => this.employeeService.getById(user.employeeId)),
        finalize(() => this._loading.set(false)),
      )
      .subscribe({
        next: (employee) => {
          this._employee.set(employee);
        },
        error: () => {
          this.clearProfile();
        },
      });
  }

  refreshProfile(): void {
    this.clearProfile();
    this.loadProfile();
  }

  private clearProfile(): void {
    this._user.set(null);
    this._employee.set(null);
  }

  forceReloadProfile(): void {
    this.clearProfile();
    this.loadProfile();
  }

  private insert(res: LoginResponse): void {
    this.write(TOKEN_KEY, res.token);
    this.write(REFRESH_KEY, res.refreshToken);
    this.write(USER_ID, res.userId);
    this.write(CREDENTIAL_ID, res.credentialId);

    this._token.set(res.token);
    this._userId.set(res.userId);
    this._credentialId.set(res.credentialId);
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
