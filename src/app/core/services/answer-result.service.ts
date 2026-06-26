import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { AnswerResult, AnswerResultCreate } from '../models/answer-result.model';

// Serviço responsável pelas respostas de parâmetros de formulário (answer_result)
// Não possui update — uma resposta errada deve ser deletada e recriada
@Injectable({
  providedIn: 'root',
})
export class AnswerResultService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/answer-result`;

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // Registra uma nova resposta para um parâmetro
  create(data: AnswerResultCreate): Observable<AnswerResult> {
    return this.http.post<AnswerResult>(this.apiUrl, data, this.httpOptions);
  }

  getById(id: string): Observable<AnswerResult> {
    return this.http.get<AnswerResult>(`${this.apiUrl}/${id}`);
  }

  // Busca todas as respostas de um parâmetro específico
  getByAnswerId(answerId: string): Observable<AnswerResult[]> {
    return this.http.get<AnswerResult[]>(`${this.apiUrl}/answer/${answerId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<AnswerResult>> {
    let params = new HttpParams();
    if (limit != null) params = params.set('limit', limit.toString());
    if (page  != null) params = params.set('page',  page.toString());
    return this.http.get<PaginatedResult<AnswerResult>>(this.apiUrl, { params });
  }

  delete(id: string): Observable<AnswerResult> {
    return this.http.delete<AnswerResult>(`${this.apiUrl}/${id}`);
  }
}
