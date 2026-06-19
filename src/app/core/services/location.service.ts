import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Location, LocationCreate, LocationUpdate } from '../models/location.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/locations`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(location: LocationCreate): Observable<Location> {
    return this.http.post<Location>(this.apiUrl, location);
  }

  getById(id: string): Observable<Location> {
    return this.http.get<Location>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Location>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Location>>(this.apiUrl, { params });
  }

  update(id: string, location: LocationUpdate): Observable<Location> {
    return this.http.put<Location>(`${this.apiUrl}/${id}`, location, this.httpOptions);
  }

  delete(id: string): Observable<Location> {
    return this.http.delete<Location>(`${this.apiUrl}/${id}`);
  }
}
