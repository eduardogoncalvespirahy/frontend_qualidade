import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Machine, MachineCreate, MachineUpdate } from '../models/machine.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class MachineService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/machines`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(machine: MachineCreate): Observable<Machine> {
    return this.http.post<Machine>(this.apiUrl, machine);
  }

  getById(id: string): Observable<Machine> {
    return this.http.get<Machine>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Machine>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Machine>>(this.apiUrl, { params });
  }

  update(id: string, machine: MachineUpdate): Observable<Machine> {
    return this.http.put<Machine>(`${this.apiUrl}/${id}`, machine, this.httpOptions);
  }

  delete(id: string): Observable<Machine> {
    return this.http.delete<Machine>(`${this.apiUrl}/${id}`);
  }
}
