import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { Control, ControlCreate, ControlUpdate } from '../models/control.model';

// Serviço responsável pelas sessões de inspeção (controls)
// Cada Control representa uma inspeção completa de um formulário por um usuário
@Injectable({
  providedIn: 'root',
})
export class ControlService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/controls`;

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // Abre uma nova sessão de inspeção
  create(data: ControlCreate): Observable<Control> {
    return this.http.post<Control>(this.apiUrl, data, this.httpOptions);
  }

  getById(id: string): Observable<Control> {
    return this.http.get<Control>(`${this.apiUrl}/${id}`);
  }

  // Busca todas as inspeções de um formulário específico
  getByFormId(formId: string): Observable<Control[]> {
    return this.http.get<Control[]>(`${this.apiUrl}/form/${formId}`);
  }

  // Busca todas as inspeções feitas por um usuário específico
  getByUserId(userId: string): Observable<Control[]> {
    return this.http.get<Control[]>(`${this.apiUrl}/user/${userId}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<Control>> {
    let params = new HttpParams();
    if (limit != null) params = params.set('limit', limit.toString());
    if (page  != null) params = params.set('page',  page.toString());
    return this.http.get<PaginatedResult<Control>>(this.apiUrl, { params });
  }

  // Atualiza observação ou data de emissão de uma inspeção
  update(id: string, data: ControlUpdate): Observable<Control> {
    return this.http.put<Control>(`${this.apiUrl}/${id}`, data, this.httpOptions);
  }

  delete(id: string): Observable<Control> {
    return this.http.delete<Control>(`${this.apiUrl}/${id}`);
  }
}
