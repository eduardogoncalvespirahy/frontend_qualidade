import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PackageTypes, PackageTypesCreate, PackageTypesUpdate } from '../models/package-types.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class PackageTypesService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/package-types`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(packege: PackageTypesCreate): Observable<PackageTypes> {
    return this.http.post<PackageTypes>(this.apiUrl, packege);
  }

  getById(id: string): Observable<PackageTypes> {
    return this.http.get<PackageTypes>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<PackageTypes>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<PackageTypes>>(this.apiUrl, { params });
  }

  update(id: string, packege: PackageTypesUpdate): Observable<PackageTypes> {
    return this.http.put<PackageTypes>(
      `${this.apiUrl}/${id}`,
      packege,
      this.httpOptions
    );
  }

  delete(id: string): Observable<PackageTypes> {
    return this.http.delete<PackageTypes>(`${this.apiUrl}/${id}`);
  }
}
