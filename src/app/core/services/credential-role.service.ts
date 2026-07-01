import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CredentialRole, CredentialRoleCreate, CredentialRoleUpdate } from '../models/credential-role.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CredentialRoleService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/credentials-roles`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(credentialRole: CredentialRoleCreate): Observable<CredentialRole> {
    return this.http.post<CredentialRole>(this.apiUrl, credentialRole);
  }

  getByCredential(credentialId: string): Observable<CredentialRole> {
    return this.http.get<CredentialRole>(`${this.apiUrl}/${credentialId}`);
  }

  getRoleNamesByCredential(credentialId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/roles/credential/${credentialId}`);
  }

  delete(credentialId: string, roleId: string): Observable<CredentialRole> {
    return this.http.delete<CredentialRole>(`${this.apiUrl}/${credentialId}/${roleId}`);
  }
}
