import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BreakMachine,
  CreateBreakMachine,
  UpdateBreakMachine,
} from '../models/break-machine.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class BreakMachineService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/breaks-machines`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(breakMachine: CreateBreakMachine): Observable<BreakMachine> {
    return this.http.post<BreakMachine>(this.apiUrl, breakMachine);
  }

  getById(id: string): Observable<BreakMachine> {
    return this.http.get<BreakMachine>(`${this.apiUrl}/${id}`);
  }

  getByMachineId(machineId: string): Observable<BreakMachine[]> {
    return this.http.get<BreakMachine[]>(`${this.apiUrl}/machine/${machineId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<BreakMachine>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<BreakMachine>>(this.apiUrl, { params });
  }

  update(id: string, breakMachine: UpdateBreakMachine): Observable<BreakMachine> {
    return this.http.put<BreakMachine>(`${this.apiUrl}/${id}`, breakMachine, this.httpOptions);
  }

  delete(id: string): Observable<BreakMachine> {
    return this.http.delete<BreakMachine>(`${this.apiUrl}/${id}`);
  }
}
