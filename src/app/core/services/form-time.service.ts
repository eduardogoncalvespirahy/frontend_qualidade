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

  private readonly apiUrl = `${environment.apiUrl}/form-time`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(FormTime: CreateFormTime): Observable<FormTime> {
    return this.http.post<FormTime>(this.apiUrl, FormTime);
  }

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

  getByFormId(formId: string): Observable<FormTime> {
    return this.http.get<FormTime>(`${this.apiUrl}/${formId}`);
  }

  update(formId: string, FormTime: UpdateFormTime): Observable<FormTime> {
    return this.http.put<FormTime>(`${this.apiUrl}/${formId}`, FormTime, this.httpOptions);
  }

  delete(formId: string): Observable<FormTime> {
    return this.http.delete<FormTime>(`${this.apiUrl}/${formId}`);
  }
}
