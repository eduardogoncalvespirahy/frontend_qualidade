import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Workshift, WorkshiftCreate, WorkshiftUpdate } from '../models/workshift.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class WorkshiftService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/workshifts`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(workshift: WorkshiftCreate): Observable<Workshift> {
    return this.http.post<Workshift>(this.apiUrl, workshift);
  }

  getById(id: string): Observable<Workshift> {
    return this.http.get<Workshift>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Workshift>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Workshift>>(this.apiUrl, { params });
  }

  update(id: string, workshift: WorkshiftUpdate): Observable<Workshift> {
    return this.http.put<Workshift>(`${this.apiUrl}/${id}`, workshift, this.httpOptions);
  }

  delete(id: string): Observable<Workshift> {
    return this.http.delete<Workshift>(`${this.apiUrl}/${id}`);
  }
}
