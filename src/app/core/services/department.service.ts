import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Department, DepartmentCreate, DepartmentUpdate } from '../models/department.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/departments`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(department: DepartmentCreate): Observable<Department> {
    return this.http.post<Department>(this.apiUrl, department);
  }

  getById(id: string): Observable<Department> {
    return this.http.get<Department>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Department>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Department>>(this.apiUrl, { params });
  }

  update(id: string, department: DepartmentUpdate): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/${id}`, department, this.httpOptions);
  }

  delete(id: string): Observable<Department> {
    return this.http.delete<Department>(`${this.apiUrl}/${id}`);
  }
}
