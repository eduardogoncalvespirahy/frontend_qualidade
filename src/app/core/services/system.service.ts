import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { System, SystemCreate, SystemUpdate } from '../models/system.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class SystemService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/systems`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(system: SystemCreate): Observable<System> {
    return this.http.post<System>(this.apiUrl, system);
  }

  getById(id: string): Observable<System> {
    return this.http.get<System>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<System>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<System>>(this.apiUrl, { params });
  }

  update(id: string, system: SystemUpdate): Observable<System> {
    return this.http.put<System>(`${this.apiUrl}/${id}`, system, this.httpOptions);
  }

  delete(id: string): Observable<System> {
    return this.http.delete<System>(`${this.apiUrl}/${id}`);
  }
}
