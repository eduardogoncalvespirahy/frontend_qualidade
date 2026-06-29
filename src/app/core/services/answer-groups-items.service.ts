import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import {
  AnswerGroupItems,
  AnswerGroupItemsCreate,
  AnswerGroupItemsUpdate,
} from '../models/answer-group-items.model';

@Injectable({
  providedIn: 'root',
})
export class AnswerGroupsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/answer-groups-items`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(answerGroupItem: AnswerGroupItemsCreate): Observable<AnswerGroupItems> {
    return this.http.post<AnswerGroupItems>(this.apiUrl, answerGroupItem);
  }

  getById(answerGroupId: string, answerId: string): Observable<AnswerGroupItems> {
    return this.http.get<AnswerGroupItems>(
      `${this.apiUrl}/answerGroup/${answerGroupId}/answer/${answerId}`,
    );
  }

  getByAnswerGroupId(answerGroupId: string): Observable<AnswerGroupItems> {
    return this.http.get<AnswerGroupItems>(`${this.apiUrl}/answerGroup/${answerGroupId}`);
  }

  getByIdAnswerId(answerId: string): Observable<AnswerGroupItems> {
    return this.http.get<AnswerGroupItems>(`${this.apiUrl}/answer/${answerId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<AnswerGroupItems>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<AnswerGroupItems>>(this.apiUrl, { params });
  }

  update(
    answerGroupId: string,
    answerId: string,
    answerGroupItem: AnswerGroupItemsUpdate,
  ): Observable<AnswerGroupItems> {
    return this.http.put<AnswerGroupItems>(
      `${this.apiUrl}/answerGroup/${answerGroupId}/answer/${answerId}`,
      answerGroupItem,
      this.httpOptions,
    );
  }

  delete(answerGroupId: string, answerId: string): Observable<AnswerGroupItems> {
    return this.http.delete<AnswerGroupItems>(
      `${this.apiUrl}/answerGroup/${answerGroupId}/answer/${answerId}`,
    );
  }
}
