import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Status, StatusCreate, StatusUpdate } from '../models/status.model';
import { PaginatedResult } from '../models/paginated.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StatusService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/status`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(status: StatusCreate): Observable<Status> {
    return this.http.post<Status>(this.apiUrl, status);
  }

  getById(id: string): Observable<Status> {
    return this.http.get<Status>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Status>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Status>>(this.apiUrl, { params });
  }

  update(id: string, status: StatusUpdate): Observable<Status> {
    return this.http.put<Status>(`${this.apiUrl}/${id}`, status, this.httpOptions);
  }

  delete(id: string): Observable<Status> {
    return this.http.delete<Status>(`${this.apiUrl}/${id}`);
  }
}
