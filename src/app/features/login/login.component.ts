import { Component, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { environment } from '../../../environments/environment';

import { LoginIdentifierType, LoginRequest } from '../../core/models/auth.model';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly types = [
    { value: 'email', label: 'E-mail' },
    { value: 'username', label: 'Usuário' },
    { value: 'registerNumber', label: 'Matrícula' },
  ] as const;

  protected readonly identifierType = signal<LoginIdentifierType>('registerNumber');

  protected readonly identifier = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  
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
    this.showPassword.update(value => !value);
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

    this.auth
      .login(request)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/lider']);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Não foi possível entrar. Verifique os dados.');
        },
      });
  }
}
