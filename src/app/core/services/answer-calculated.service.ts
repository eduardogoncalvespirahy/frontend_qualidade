import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AnswerCalculated, AnswerCalculatedCreate, AnswerCalculatedUpdate } from '../models/answer-calculated.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class AnswerCalculatedService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/answer-calculated`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(item: AnswerCalculatedCreate): Observable<AnswerCalculated> {
    return this.http.post<AnswerCalculated>(this.apiUrl, item);
  }

  getByAnswerId(answerId: string): Observable<AnswerCalculated> {
    return this.http.get<AnswerCalculated>(`${this.apiUrl}/answer/${answerId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<AnswerCalculated>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<AnswerCalculated>>(this.apiUrl, { params });
  }

  update(answerId: string, item: AnswerCalculatedUpdate): Observable<AnswerCalculated> {
    return this.http.put<AnswerCalculated>(
      `${this.apiUrl}/answer/${answerId}`,
      item,
      this.httpOptions
    );
  }

  delete(answerId: string): Observable<AnswerCalculated> {
    return this.http.delete<AnswerCalculated>(`${this.apiUrl}/answer/${answerId}`);
  }
}
