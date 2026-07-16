import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RepairerMachineAnswerResult,
  CreateRepairerMachineAnswerResult,
  UpdateRepairerMachineAnswerResult,
} from '../models/repairer-machine-answer-result.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class RepairerMachineAnswerResultService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/repairer-machine-answer-result`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(RepairerMachineAnswerResult: CreateRepairerMachineAnswerResult): Observable<RepairerMachineAnswerResult> {
    return this.http.post<RepairerMachineAnswerResult>(this.apiUrl, RepairerMachineAnswerResult);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<RepairerMachineAnswerResult>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<RepairerMachineAnswerResult>>(this.apiUrl, { params });
  }

  getById(answerResultId: string, userId: string): Observable<RepairerMachineAnswerResult> {
    return this.http.get<RepairerMachineAnswerResult>(`${this.apiUrl}/${answerResultId}/${userId}`);
  }

  getByAnswerResultId(answerResultId: string): Observable<RepairerMachineAnswerResult> {
    return this.http.get<RepairerMachineAnswerResult>(`${this.apiUrl}/answerResultId/${answerResultId}`);
  }

  getByUserId(userId: string): Observable<RepairerMachineAnswerResult> {
    return this.http.get<RepairerMachineAnswerResult>(`${this.apiUrl}/userId/${userId}`);
  }

  update(
    answerResultId: string,
    userId: string,
    RepairerAnswerResult: UpdateRepairerMachineAnswerResult,
  ): Observable<RepairerMachineAnswerResult> {
    return this.http.put<RepairerMachineAnswerResult>(
      `${this.apiUrl}/${answerResultId}/${userId}`,
      RepairerAnswerResult,
      this.httpOptions,
    );
  }

  delete(answerResultId: string, userId: string): Observable<RepairerMachineAnswerResult> {
    return this.http.delete<RepairerMachineAnswerResult>(`${this.apiUrl}/${answerResultId}/${userId}`);
  }
}
