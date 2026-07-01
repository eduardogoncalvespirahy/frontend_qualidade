import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { File, CreateFileDTO, UpdateFileDTO } from '../models/file.model';
import { PaginatedResult } from '../models/paginated.model';

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/files`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(file: CreateFileDTO): Observable<File> {
    return this.http.post<File>(this.apiUrl, file);
  }

  getById(id: string): Observable<File> {
    return this.http.get<File>(`${this.apiUrl}/${id}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<File>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<File>>(this.apiUrl, { params });
  }

  update(id: string, file: UpdateFileDTO): Observable<File> {
    return this.http.put<File>(`${this.apiUrl}/${id}`, file, this.httpOptions);
  }

  delete(id: string): Observable<File> {
    return this.http.delete<File>(`${this.apiUrl}/${id}`);
  }
}
