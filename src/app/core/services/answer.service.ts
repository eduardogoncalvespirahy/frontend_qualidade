import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Answer, AnswerCreate, AnswerUpdate } from '../models/answer.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class AnswerService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/answers`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(answer: AnswerCreate): Observable<Answer> {
    return this.http.post<Answer>(this.apiUrl, answer);
  }

  getById(id: string): Observable<Answer> {
    return this.http.get<Answer>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Answer>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<Answer>>(this.apiUrl, { params });
  }

  update(id: string, answer: AnswerUpdate): Observable<Answer> {
    return this.http.put<Answer>(
      `${this.apiUrl}/${id}`,
      answer,
      this.httpOptions
    );
  }

  delete(id: string): Observable<Answer> {
    return this.http.delete<Answer>(`${this.apiUrl}/${id}`);
  }
}
