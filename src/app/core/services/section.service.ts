import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Section, SectionCreate, SectionUpdate } from '../models/section.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class SectionService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/sections`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(section: SectionCreate): Observable<Section> {
    return this.http.post<Section>(this.apiUrl, section);
  }

  getById(id: string): Observable<Section> {
    return this.http.get<Section>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Section>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Section>>(this.apiUrl, { params });
  }

  update(id: string, section: SectionUpdate): Observable<Section> {
    return this.http.put<Section>(
      `${this.apiUrl}/${id}`,
      section,
      this.httpOptions
    );
  }

  delete(id: string): Observable<Section> {
    return this.http.delete<Section>(`${this.apiUrl}/${id}`);
  }
}
