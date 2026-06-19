import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Form, FormCreate, FormUpdate } from '../models/form.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class FormService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/forms`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(form: FormCreate): Observable<Form> {
    return this.http.post<Form>(this.apiUrl, form);
  }

  getById(id: string): Observable<Form> {
    return this.http.get<Form>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Form>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Form>>(this.apiUrl, { params });
  }

  update(id: string, form: FormUpdate): Observable<Form> {
    return this.http.put<Form>(`${this.apiUrl}/${id}`, form, this.httpOptions);
  }

  delete(id: string): Observable<Form> {
    return this.http.delete<Form>(`${this.apiUrl}/${id}`);
  }
}
