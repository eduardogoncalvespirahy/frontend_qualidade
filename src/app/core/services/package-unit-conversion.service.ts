import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PackageUnitConversion, PackageUnitConversionCreate, PackageUnitConversionUpdate } from '../models/package-unit-conversions.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class PackageUnitConversionService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/package-unit-conversions`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(packege: PackageUnitConversionCreate): Observable<PackageUnitConversion> {
    return this.http.post<PackageUnitConversion>(this.apiUrl, packege);
  }

  getById(id: string): Observable<PackageUnitConversion> {
    return this.http.get<PackageUnitConversion>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<PackageUnitConversion>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<PackageUnitConversion>>(this.apiUrl, { params });
  }

  update(id: string, packege: PackageUnitConversionUpdate): Observable<PackageUnitConversion> {
    return this.http.put<PackageUnitConversion>(
      `${this.apiUrl}/${id}`,
      packege,
      this.httpOptions
    );
  }

  delete(id: string): Observable<PackageUnitConversion> {
    return this.http.delete<PackageUnitConversion>(`${this.apiUrl}/${id}`);
  }
}
