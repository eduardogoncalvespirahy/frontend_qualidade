import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Employee, EmployeeCreate, EmployeeUpdate } from '../models/employee.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/employees`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(employee: EmployeeCreate): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee);
  }

  getById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Employee>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Employee>>(this.apiUrl, { params });
  }

  update(id: string, employee: EmployeeUpdate): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, employee, this.httpOptions);
  }

  delete(id: string): Observable<Employee> {
    return this.http.delete<Employee>(`${this.apiUrl}/${id}`);
  }
}
