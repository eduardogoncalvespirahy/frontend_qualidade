import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Answer, AnswerCreate, AnswerUpdate } from '../models/answer.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { AnswerMachine, AnswerMachineCreate, AnswerMachineUpdate } from '../models/answer-machine.model';

@Injectable({
  providedIn: 'root',
})
export class AnswerMachineService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/machine-answers`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(answer: AnswerMachineCreate): Observable<AnswerMachine> {
    return this.http.post<AnswerMachine>(this.apiUrl, answer);
  }

  getById(id: string): Observable<AnswerMachine> {
    return this.http.get<AnswerMachine>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<AnswerMachine>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<AnswerMachine>>(this.apiUrl, { params });
  }

  update(id: string, answer: AnswerMachineUpdate): Observable<AnswerMachine> {
    return this.http.put<AnswerMachine>(
      `${this.apiUrl}/${id}`,
      answer,
      this.httpOptions
    );
  }

  delete(id: string): Observable<AnswerMachine> {
    return this.http.delete<AnswerMachine>(`${this.apiUrl}/${id}`);
  }
}
