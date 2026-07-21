import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import {
  FormGroupItems,
  FormGroupItemsCreate,
  FormGroupItemsUpdate,
} from '../models/form-group-items.model';

@Injectable({
  providedIn: 'root',
})
export class FormGroupItemsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/form-group-items`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(formGroupItem: FormGroupItemsCreate): Observable<FormGroupItems> {
    return this.http.post<FormGroupItems>(this.apiUrl, formGroupItem);
  }

  getById(formGroupId: string, formId: string): Observable<FormGroupItems> {
    return this.http.get<FormGroupItems>(
      `${this.apiUrl}/formGroup/${formGroupId}/form/${formId}`,
    );
  }

  getByFormGroupId(formGroupId: string): Observable<FormGroupItems> {
    return this.http.get<FormGroupItems>(`${this.apiUrl}/formGroup/${formGroupId}`);
  }

  getByFormId(formId: string): Observable<FormGroupItems> {
    return this.http.get<FormGroupItems>(`${this.apiUrl}/form/${formId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<FormGroupItems>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<FormGroupItems>>(this.apiUrl, { params });
  }

  update(
    formGroupId: string,
    formId: string,
    formGroupItem: FormGroupItemsUpdate,
  ): Observable<FormGroupItems> {
    return this.http.put<FormGroupItems>(
      `${this.apiUrl}/formGroup/${formGroupId}/form/${formId}`,
      formGroupItem,
      this.httpOptions,
    );
  }

  delete(formGroupId: string, formId: string): Observable<FormGroupItems> {
    return this.http.delete<FormGroupItems>(
      `${this.apiUrl}/formGroup/${formGroupId}/form/${formId}`,
    );
  }
}
