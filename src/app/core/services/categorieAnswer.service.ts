import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CategorieAnswer,
  CategorieAnswerCreate,
  CategorieAnswerUpdate,
} from '../models/categorieAnswer.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class CategorieAnswerService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/categories-answers`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(category: CategorieAnswerCreate): Observable<CategorieAnswer> {
    return this.http.post<CategorieAnswer>(this.apiUrl, category);
  }

  getById(id: string): Observable<CategorieAnswer> {
    return this.http.get<CategorieAnswer>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<CategorieAnswer>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<CategorieAnswer>>(this.apiUrl, { params });
  }

  update(id: string, category: CategorieAnswerUpdate): Observable<CategorieAnswer> {
    return this.http.put<CategorieAnswer>(`${this.apiUrl}/${id}`, category, this.httpOptions);
  }

  delete(id: string): Observable<CategorieAnswer> {
    return this.http.delete<CategorieAnswer>(`${this.apiUrl}/${id}`);
  }
}
