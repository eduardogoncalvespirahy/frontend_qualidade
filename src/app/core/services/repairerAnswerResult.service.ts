import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RepairerAnswerResult,
  RepairerAnswerResultCreate,
  RepairerAnswerResultUpdate,
} from '../models/repairerAnswerResult.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class RepairerAnswerResultService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/repairer-answer-result`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(RepairerAnswerResult: RepairerAnswerResultCreate): Observable<RepairerAnswerResult> {
    return this.http.post<RepairerAnswerResult>(this.apiUrl, RepairerAnswerResult);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<RepairerAnswerResult>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<RepairerAnswerResult>>(this.apiUrl, { params });
  }

  getById(answerResultId: string, userId: string): Observable<RepairerAnswerResult> {
    return this.http.get<RepairerAnswerResult>(`${this.apiUrl}/${answerResultId}/${userId}`);
  }

  getByAnswerResultId(answerResultId: string): Observable<RepairerAnswerResult> {
    return this.http.get<RepairerAnswerResult>(`${this.apiUrl}/answerResultId/${answerResultId}`);
  }

  getByUserId(userId: string): Observable<RepairerAnswerResult> {
    return this.http.get<RepairerAnswerResult>(`${this.apiUrl}/userId/${userId}`);
  }

  update(
    answerResultId: string,
    userId: string,
    RepairerAnswerResult: RepairerAnswerResultUpdate,
  ): Observable<RepairerAnswerResult> {
    return this.http.put<RepairerAnswerResult>(
      `${this.apiUrl}/${answerResultId}/${userId}`,
      RepairerAnswerResult,
      this.httpOptions,
    );
  }

  delete(answerResultId: string, userId: string): Observable<RepairerAnswerResult> {
    return this.http.delete<RepairerAnswerResult>(`${this.apiUrl}/${answerResultId}/${userId}`);
  }
}
