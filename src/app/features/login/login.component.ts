import { Component, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';

import { LoginIdentifierType, LoginRequest } from '../../core/models/auth.model';

import { AuthService } from '../../core/services/auth.service';
import { CookieService } from '../../core/services/cookie.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cookieService = inject(CookieService);

  constructor() {
    this.recuperarAcesso();
  }

  protected readonly types = [
    { value: 'email', label: 'E-mail' },
    { value: 'username', label: 'Usuário' },
    { value: 'registerNumber', label: 'Matrícula' },
  ] as const;

  protected readonly identifierType = signal<LoginIdentifierType>('registerNumber');

  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly rememberAccess = signal(false);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly systemId = environment.systemId;

  protected readonly identifierLabel = computed(() => {
    return this.types.find((t) => t.value === this.identifierType())?.label ?? '';
  });

  protected changeType(type: LoginIdentifierType): void {
    this.identifierType.set(type);
    this.identifier.set('');
    this.error.set(null);
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected submit(): void {
    this.error.set(null);

    const identifier = this.identifier().trim();
    const password = this.password();

    if (!identifier || !password) {
      this.error.set('Informe suas credenciais e a senha.');
      return;
    }

    const request: LoginRequest = {
      password,
    };

    switch (this.identifierType()) {
      case 'email':
        request.email = identifier;
        break;

      case 'username':
        request.username = identifier;
        break;

      case 'registerNumber':
        request.registerNumber = Number(identifier);
        break;
    }

    if (this.systemId?.trim()) {
      request.systemId = this.systemId.trim();
    }

    this.loading.set(true);

    this.lembrarAcesso(this.rememberAccess());

    // O AuthService.login autentica via cookies httpOnly (setados pelo servidor)
    // e encadeia o carregamento do perfil/roles — não há token para tratar aqui.
    this.auth
      .login(request)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: () => this.redirecionarPorRole(),
        error: (err) => {
          console.log(err);
          this.error.set(err?.error?.message ?? 'Não foi possível entrar. Verifique os dados.');
        },
      });
  }

  /** Redireciona conforme as roles já carregadas pelo login. */
  private redirecionarPorRole(): void {
    const roles = this.auth.roles();

    const isAdmin = roles.includes('ADMIN');
    const isLider = roles.includes('LIDER');
    const isInspetor = roles.includes('INSPETOR');

    if (isAdmin || (isInspetor && isLider)) {
      this.router.navigate(['/']);
      return;
    }

    if (isLider) {
      this.router.navigate(['/lider']);
      return;
    }

    if (isInspetor) {
      this.router.navigate(['/inspetor']);
      return;
    }

    // Sem role reconhecida → destino padrão (evita ficar preso no login).
    this.router.navigate(['/']);
  }

  protected lembrarAcesso(status: boolean): void {
    if (!status) {
      this.rememberAccess.set(false);
      this.cookieService.delete('aq_access');
      return;
    }

    const identifier = this.identifier().trim();

    if (!identifier) {
      return;
    }

    this.cookieService.set(
      'aq_access',
      JSON.stringify({
        identifierType: this.identifierType(),
        identifier,
        rememberAccess: true,
      }),
      {
        path: '/',
        sameSite: 'Strict',
        secure: location.protocol === 'https:',
      },
    );
  }

  protected recuperarAcesso(): void {
    const acessoCookie = this.cookieService.get('aq_access');

    if (!acessoCookie) {
      return;
    }

    try {
      const data = JSON.parse(acessoCookie);

      this.identifierType.set(data.identifierType ?? '');

      this.identifier.set(data.identifier?.trim() ?? '');

      this.rememberAccess.set(Boolean(data.rememberAccess));
    } catch (error) {
      console.error('Cookie de acesso inválido.', error);

      this.cookieService.delete('aq_access');
    }
  }
}
