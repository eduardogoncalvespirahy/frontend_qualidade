import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  WorkstationGroup,
  WorkstationGroupCreate,
  WorkstationGroupUpdate,
} from '../models/workstation-group.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class WorkstationGroupService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/workstation-groups`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(workstationGroup: WorkstationGroupCreate): Observable<WorkstationGroup> {
    return this.http.post<WorkstationGroup>(this.apiUrl, workstationGroup);
  }

  getById(id: string): Observable<WorkstationGroup> {
    return this.http.get<WorkstationGroup>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<WorkstationGroup>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<WorkstationGroup>>(this.apiUrl, { params });
  }

  update(id: string, workstationGroup: WorkstationGroupUpdate): Observable<WorkstationGroup> {
    return this.http.put<WorkstationGroup>(
      `${this.apiUrl}/${id}`,
      workstationGroup,
      this.httpOptions,
    );
  }

  delete(id: string): Observable<WorkstationGroup> {
    return this.http.delete<WorkstationGroup>(`${this.apiUrl}/${id}`);
  }
}
