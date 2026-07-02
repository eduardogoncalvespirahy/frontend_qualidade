import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BreakForm, CreateBreakForm, UpdateBreakForm } from '../models/break-form.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class BreakFormService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/break-forms`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(breakForm: CreateBreakForm): Observable<BreakForm> {
    return this.http.post<BreakForm>(this.apiUrl, breakForm);
  }

  getById(id: string): Observable<BreakForm> {
    return this.http.get<BreakForm>(`${this.apiUrl}/${id}`);
  }

  getbyFormId(formId: string): Observable<BreakForm[]> {
    return this.http.get<BreakForm[]>(`${this.apiUrl}/form/${formId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<BreakForm>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<BreakForm>>(this.apiUrl, { params });
  }

  update(id: string, breakForm: UpdateBreakForm): Observable<BreakForm> {
    return this.http.put<BreakForm>(`${this.apiUrl}/${id}`, breakForm, this.httpOptions);
  }

  delete(id: string): Observable<BreakForm> {
    return this.http.delete<BreakForm>(`${this.apiUrl}/${id}`);
  }
}
