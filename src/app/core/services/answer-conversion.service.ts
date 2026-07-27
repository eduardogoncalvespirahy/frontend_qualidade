import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AnswerConversion, AnswerConversionCreate, AnswerConversionUpdate } from '../models/answer-conversion.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class AnswerConversionService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/answer-conversions`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(answer: AnswerConversionCreate): Observable<AnswerConversion> {
    return this.http.post<AnswerConversion>(this.apiUrl, answer);
  }

  getByAnswerId(answerId: string): Observable<AnswerConversion> {
    return this.http.get<AnswerConversion>(`${this.apiUrl}/answer/${answerId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<AnswerConversion>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<AnswerConversion>>(this.apiUrl, { params });
  }

  update(answerId: string, answer: AnswerConversionUpdate): Observable<AnswerConversion> {
    return this.http.put<AnswerConversion>(
      `${this.apiUrl}/answer/${answerId}`,
      answer,
      this.httpOptions
    );
  }

  delete(answerId: string): Observable<AnswerConversion> {
    return this.http.delete<AnswerConversion>(`${this.apiUrl}/answer/${answerId}`);
  }
}
