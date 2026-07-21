import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { FormGroups, FormGroupsCreate, FormGroupsUpdate } from '../models/form-group.model';

@Injectable({
  providedIn: 'root',
})
export class FormGroupsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/form-groups`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(formGroup: FormGroupsCreate): Observable<FormGroups> {
    return this.http.post<FormGroups>(this.apiUrl, formGroup);
  }

  getById(id: string): Observable<FormGroups> {
    return this.http.get<FormGroups>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<FormGroups>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<FormGroups>>(this.apiUrl, { params });
  }

  update(id: string, formGroup: FormGroupsUpdate): Observable<FormGroups> {
    return this.http.put<FormGroups>(`${this.apiUrl}/${id}`, formGroup, this.httpOptions);
  }

  delete(id: string): Observable<FormGroups> {
    return this.http.delete<FormGroups>(`${this.apiUrl}/${id}`);
  }
}
