import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import {
  MachineAnswerResult,
  MachineAnswerResultCreate,
  MachineAnswerResultUpdate,
} from '../models/machine-answer-result.model';
import { AnswerResult } from '../models/answer-result.model';

// Serviço responsável pelas respostas de parâmetros de máquina (machine_answer_result)
@Injectable({
  providedIn: 'root',
})
export class MachineAnswerResultService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/machine-answer-result`;

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  create(data: MachineAnswerResultCreate): Observable<MachineAnswerResult> {
    return this.http.post<MachineAnswerResult>(this.apiUrl, data, this.httpOptions);
  }

  getById(id: string): Observable<MachineAnswerResult> {
    return this.http.get<MachineAnswerResult>(`${this.apiUrl}/${id}`);
  }

  // Busca a resposta de um parâmetro de máquina específico mais atual
  getByAnswerId(answerId: string): Observable<MachineAnswerResult[]> {
    return this.http.get<MachineAnswerResult[]>(
      `${this.apiUrl}/answer/${answerId}`,
    );
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<MachineAnswerResult>> {
    let params = new HttpParams();
    if (limit != null) params = params.set('limit', limit.toString());
    if (page  != null) params = params.set('page',  page.toString());
    return this.http.get<PaginatedResult<MachineAnswerResult>>(this.apiUrl, { params });
  }

  // Busca todas as respostas de maquina de um controle de envio específico  
  getControlIdAll(controlId: string, limit?: number, page?: number): Observable<PaginatedResult<MachineAnswerResult>> {
    let params = new HttpParams();
    if (limit != null) params = params.set('limit', limit.toString());
    if (page  != null) params = params.set('page',  page.toString());
    return this.http.get<PaginatedResult<MachineAnswerResult>>(`${this.apiUrl}/control/${controlId}`, { params });
  }

  update(id: string, data: MachineAnswerResultUpdate): Observable<MachineAnswerResult> {
    return this.http.put<MachineAnswerResult>(
      `${this.apiUrl}/${id}`,
      data,
      this.httpOptions,
    );
  }

  delete(id: string): Observable<MachineAnswerResult> {
    return this.http.delete<MachineAnswerResult>(`${this.apiUrl}/${id}`);
  }
}
