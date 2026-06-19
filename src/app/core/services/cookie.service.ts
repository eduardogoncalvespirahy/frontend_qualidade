import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export interface CookieOptions {
  /** Caminho do cookie. Padrão: '/'. */
  path?: string;
  /** Domínio do cookie. */
  domain?: string;
  /** Expiração: número (em dias) ou uma data específica. */
  expires?: number | Date;
  /** Tempo de vida em segundos (max-age). */
  maxAge?: number;
  /** Marca o cookie como Secure (só enviado via HTTPS). */
  secure?: boolean;
  /** Impede acesso via JavaScript no navegador (protege contra XSS). */
  httpOnly?: boolean;  
  /** Política SameSite. 'None' força Secure automaticamente. */
  sameSite?: 'Lax' | 'Strict' | 'None';
}

/**
 * Service de manipulação de cookies usando a API nativa `document.cookie`,
 * sem dependências externas. É seguro para SSR: no servidor, as leituras
 * retornam vazio e as escritas viram no-op.
 */
@Injectable({ providedIn: 'root' })
export class CookieService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Cria ou sobrescreve um cookie. 
   * @param name string
   * @param value string
   * @param options CookieOptions = {}
   * @example this.cookies.set('name', 'value', { expires: 30, sameSite: 'Lax' });
  */
  set(name: string, value: string, options: CookieOptions = {}): void {
    if (!this.isBrowser || !name) {
      return;
    }

    const { path = '/', domain, expires, maxAge, secure, httpOnly, sameSite } = options;
    const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

    if (path) {
      parts.push(`path=${path}`);
    }
    if (domain) {
      parts.push(`domain=${domain}`);
    }
    if (expires !== undefined) {
      const date =
        typeof expires === 'number'
          ? new Date(Date.now() + expires * 864e5) // dias → ms
          : expires;
      parts.push(`expires=${date.toUTCString()}`);
    }
    if (maxAge !== undefined) {
      parts.push(`max-age=${maxAge}`);
    }
    if (sameSite) {
      parts.push(`samesite=${sameSite}`);
    }
    // SameSite=None exige Secure
    if (secure || sameSite === 'None') {
      parts.push('secure');
    }
    if (httpOnly) {
      parts.push('httpOnly');
    }

    this.document.cookie = parts.join('; ');
  }

  /** Retorna o valor de um cookie, ou null se não existir. 
   * @param name String
   * @example this.cookies.get('name');
   * @returns String | null
  */
  get(name: string): string | null {
    if (!this.isBrowser || !name) {
      return null;
    }
    const all = this.getAll();
    return name in all ? all[name] : null;
  }

  /** Retorna todos os cookies como um objeto chave/valor. 
   * @example this.cookies.getAll();  
   * @returns Record<string, string>
  */
  getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    if (!this.isBrowser) {
      return result;
    }

    const cookieString = this.document.cookie;
    if (!cookieString) {
      return result;
    }

    for (const pair of cookieString.split(';')) {
      const index = pair.indexOf('=');
      if (index === -1) {
        continue;
      }
      const key = decodeURIComponent(pair.slice(0, index).trim());
      const value = decodeURIComponent(pair.slice(index + 1).trim());
      if (key) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Atualiza um cookie existente. Não cria caso não exista
   * (use `set` para criar). Retorna `true` se atualizou.
   * @param name string
   * @param value String
   * @param options CookieOptions = {}
   * @example this.cookies.update('name', 'value');
   * @returns boolean
   */
  update(name: string, value: string, options: CookieOptions = {}): boolean {
    if (!this.isBrowser || this.get(name) === null) {
      return false;
    }
    this.set(name, value, options);
    return true;
  }

  /**
   * Remove um cookie. Informe o mesmo `path`/`domain` usados na criação,
   * caso tenham sido diferentes do padrão.
   * @param name string
   * @param options Pick<CookieOptions, 'path' | 'domain'> = {}
   * @example this.cookies.delete('name');
   */
  delete(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
    if (!this.isBrowser || !name) {
      return;
    }
    this.set(name, '', {
      path: options.path ?? '/',
      domain: options.domain,
      expires: new Date(0),
    });
  }

  /** Remove todos os cookies acessíveis no documento atual. 
   * @param options Pick<CookieOptions, 'path' | 'domain'> = {}
   * @example this.cookies.clear();
  */
  clear(options: Pick<CookieOptions, 'path' | 'domain'> = {}): void {
    if (!this.isBrowser) {
      return;
    }
    for (const name of Object.keys(this.getAll())) {
      this.delete(name, options);
    }
  }
}
