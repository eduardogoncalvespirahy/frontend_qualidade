import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Credential, CredentialCreate, CredentialUpdate } from '../models/credential.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class CredentialService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/credentials`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(credential: CredentialCreate): Observable<Credential> {
    return this.http.post<Credential>(this.apiUrl, credential);
  }

  getById(id: string): Observable<Credential> {
    return this.http.get<Credential>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Credential>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Credential>>(this.apiUrl, { params });
  }

  update(id: string, credential: CredentialUpdate): Observable<Credential> {
    return this.http.put<Credential>(`${this.apiUrl}/${id}`, credential, this.httpOptions);
  }

  delete(id: string): Observable<Credential> {
    return this.http.delete<Credential>(`${this.apiUrl}/${id}`);
  }
}
