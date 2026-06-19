import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { JobPosition, JobPositionCreate, JobPositionUpdate } from '../models/job-position.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class JobPositionService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/job-positions`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(jobPosition: JobPositionCreate): Observable<JobPosition> {
    return this.http.post<JobPosition>(this.apiUrl, jobPosition);
  }

  getById(id: string): Observable<JobPosition> {
    return this.http.get<JobPosition>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<JobPosition>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<JobPosition>>(this.apiUrl, { params });
  }

  update(id: string, jobPosition: JobPositionUpdate): Observable<JobPosition> {
    return this.http.put<JobPosition>(`${this.apiUrl}/${id}`, jobPosition, this.httpOptions);
  }

  delete(id: string): Observable<JobPosition> {
    return this.http.delete<JobPosition>(`${this.apiUrl}/${id}`);
  }
}
