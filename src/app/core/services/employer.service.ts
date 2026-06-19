import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Employer, EmployerCreate, EmployerUpdate } from '../models/employer.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class EmployerService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/employers`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(employer: EmployerCreate): Observable<Employer> {
    return this.http.post<Employer>(this.apiUrl, employer);
  }

  getById(id: string): Observable<Employer> {
    return this.http.get<Employer>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Employer>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Employer>>(this.apiUrl, { params });
  }

  update(id: string, employer: EmployerUpdate): Observable<Employer> {
    return this.http.put<Employer>(`${this.apiUrl}/${id}`, employer, this.httpOptions);
  }

  delete(id: string): Observable<Employer> {
    return this.http.delete<Employer>(`${this.apiUrl}/${id}`);
  }
}
