import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Session, SessionCreate } from '../models/session.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/sessions`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(session: SessionCreate): Observable<Session> {
    return this.http.post<Session>(this.apiUrl, session);
  }

  getById(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Session>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Session>>(this.apiUrl, { params });
  }

  revoke(id: string): Observable<Session> {
    return this.http.patch<Session>(
      `${this.apiUrl}/${id}/revoke`,
      { revoke: true },
      this.httpOptions,
    );
  }

  delete(id: string): Observable<Session> {
    return this.http.delete<Session>(`${this.apiUrl}/${id}`);
  }
}
