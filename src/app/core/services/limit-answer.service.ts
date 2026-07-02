import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LimitAnswer, LimitAnswerCreate, LimitAnswerUpdate } from '../models/limit-answer.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class LimitAnswerService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/limits-answers`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(answer: LimitAnswerCreate): Observable<LimitAnswer> {
    return this.http.post<LimitAnswer>(this.apiUrl, answer);
  }

  getById(id: string): Observable<LimitAnswer> {
    return this.http.get<LimitAnswer>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<LimitAnswer>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<LimitAnswer>>(this.apiUrl, { params });
  }

  getAllByAnswerId(
    answerId: string,
    limit?: number,
    page?: number,
  ): Observable<PaginatedResult<LimitAnswer>> {
    let params = new HttpParams();
    if (answerId == null || answerId.trim() === '') {
      throw new Error('answerId is required');
    }
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<LimitAnswer>>(`${this.apiUrl}/answer/${answerId}`, {
      params,
    });
  }

  update(id: string, answer: LimitAnswerUpdate): Observable<LimitAnswer> {
    return this.http.put<LimitAnswer>(`${this.apiUrl}/${id}`, answer, this.httpOptions);
  }

  delete(id: string): Observable<LimitAnswer> {
    return this.http.delete<LimitAnswer>(`${this.apiUrl}/${id}`);
  }
}
