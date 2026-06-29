import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Answer, AnswerCreate, AnswerUpdate } from '../models/answer.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { AnswerGroups, AnswerGroupsCreate , AnswerGroupsUpdate } from '../models/answer-group.model';

@Injectable({
  providedIn: 'root',
})
export class AnswerGroupsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/answer-groups`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(answer: AnswerGroupsCreate): Observable<AnswerGroups> {
    return this.http.post<AnswerGroups>(this.apiUrl, answer);
  }

  getById(id: string): Observable<AnswerGroups> {
    return this.http.get<AnswerGroups>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<AnswerGroups>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<AnswerGroups>>(this.apiUrl, { params });
  }

  update(id: string, answer: AnswerGroupsUpdate): Observable<AnswerGroups> {
    return this.http.put<AnswerGroups>(
      `${this.apiUrl}/${id}`,
      answer,
      this.httpOptions
    );
  }

  delete(id: string): Observable<AnswerGroups> {
    return this.http.delete<AnswerGroups>(`${this.apiUrl}/${id}`);
  }
}
