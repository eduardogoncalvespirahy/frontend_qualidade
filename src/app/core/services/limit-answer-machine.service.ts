import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { LimitAnswerMachine, LimitAnswerMachineCreate, LimitAnswerMachineUpdate } from '../models/limit-answer-machine.model';

@Injectable({
  providedIn: 'root',
})
export class LimitAnswerMachineService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}limits-answers-machine`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  create(answer: LimitAnswerMachineCreate): Observable<LimitAnswerMachine> {
    return this.http.post<LimitAnswerMachine>(this.apiUrl, answer);
  }

  getById(id: string): Observable<LimitAnswerMachine> {
    return this.http.get<LimitAnswerMachine>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<LimitAnswerMachine>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<LimitAnswerMachine>>(this.apiUrl, { params });
  }

  update(id: string, answer: LimitAnswerMachineUpdate): Observable<LimitAnswerMachine> {
    return this.http.put<LimitAnswerMachine>(
      `${this.apiUrl}/${id}`,
      answer,
      this.httpOptions
    );
  }

  delete(id: string): Observable<LimitAnswerMachine> {
    return this.http.delete<LimitAnswerMachine>(`${this.apiUrl}/${id}`);
  }
}
