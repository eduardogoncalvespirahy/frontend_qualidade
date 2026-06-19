import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Role, RoleCreate, RoleUpdate } from '../models/role.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/roles`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(role: RoleCreate): Observable<Role> {
    return this.http.post<Role>(this.apiUrl, role);
  }

  getById(id: string): Observable<Role> {
    return this.http.get<Role>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Role>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Role>>(this.apiUrl, { params });
  }

  update(id: string, role: RoleUpdate): Observable<Role> {
    return this.http.put<Role>(
      `${this.apiUrl}/${id}`,
      role,
      this.httpOptions
    );
  }

  delete(id: string): Observable<Role> {
    return this.http.delete<Role>(`${this.apiUrl}/${id}`);
  }
}
