import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FormTime, CreateFormTime, UpdateFormTime } from '../models/form-time.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class FormTimeService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/form-times`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(FormTime: CreateFormTime): Observable<FormTime> {
    return this.http.post<FormTime>(this.apiUrl, FormTime);
  }

  getById(id: string): Observable<FormTime> {
    return this.http.get<FormTime>(`${this.apiUrl}/${id}`);
  }

//   getbyFormId(formId: string): Observable<FormTime[]> {
//     return this.http.get<FormTime[]>(`${this.apiUrl}/form/${formId}`);
//   }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<FormTime>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<FormTime>>(this.apiUrl, { params });
  }

  update(id: string, FormTime: UpdateFormTime): Observable<FormTime> {
    return this.http.put<FormTime>(`${this.apiUrl}/${id}`, FormTime, this.httpOptions);
  }

  delete(id: string): Observable<FormTime> {
    return this.http.delete<FormTime>(`${this.apiUrl}/${id}`);
  }
}
