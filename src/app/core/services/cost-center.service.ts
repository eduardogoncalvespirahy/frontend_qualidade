import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CostCenter, CostCenterCreate, CostCenterUpdate } from '../models/cost-center.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class CostCenterService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/cost-centers`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(costCenter: CostCenterCreate): Observable<CostCenter> {
    return this.http.post<CostCenter>(this.apiUrl, costCenter);
  }

  getById(id: string): Observable<CostCenter> {
    return this.http.get<CostCenter>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<CostCenter>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<CostCenter>>(this.apiUrl, { params });
  }

  update(id: string, costCenter: CostCenterUpdate): Observable<CostCenter> {
    return this.http.put<CostCenter>(
      `${this.apiUrl}/${id}`,
      costCenter,
      this.httpOptions
    );
  }

  delete(id: string): Observable<CostCenter> {
    return this.http.delete<CostCenter>(`${this.apiUrl}/${id}`);
  }
}
