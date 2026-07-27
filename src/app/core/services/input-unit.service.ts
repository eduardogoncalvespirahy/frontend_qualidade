import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { InputUnits, InputUnitsCreate, InputUnitsUpdate } from '../models/input-units.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class InputUnitService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/input-units`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(inputunits: InputUnitsCreate): Observable<InputUnits> {
    return this.http.post<InputUnits>(this.apiUrl, inputunits);
  }

  getById(id: string): Observable<InputUnits> {
    return this.http.get<InputUnits>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<InputUnits>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<InputUnits>>(this.apiUrl, { params });
  }

  update(id: string, inputunits: InputUnitsUpdate): Observable<InputUnits> {
    return this.http.put<InputUnits>(
      `${this.apiUrl}/${id}`,
      inputunits,
      this.httpOptions
    );
  }

  delete(id: string): Observable<InputUnits> {
    return this.http.delete<InputUnits>(`${this.apiUrl}/${id}`);
  }
}
