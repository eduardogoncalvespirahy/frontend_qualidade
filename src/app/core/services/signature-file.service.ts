import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { SignatureFile, SignatureFileCreate } from '../models/signature-file.model';

@Injectable({
  providedIn: 'root',
})
export class SignatureFileService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/files`;

  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  create(data: SignatureFileCreate): Observable<SignatureFile> {
    return this.http.post<SignatureFile>(this.apiUrl, data, this.httpOptions);
  }

  getById(id: string): Observable<SignatureFile> {
    return this.http.get<SignatureFile>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<SignatureFile>> {
    let params = new HttpParams();
    if (limit != null) params = params.set('limit', limit.toString());
    if (page  != null) params = params.set('page',  page.toString());
    return this.http.get<PaginatedResult<SignatureFile>>(this.apiUrl, { params });
  }

  delete(id: string): Observable<SignatureFile> {
    return this.http.delete<SignatureFile>(`${this.apiUrl}/${id}`);
  }
}
