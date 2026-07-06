import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { ControlStatus, ControlStatusCreate } from '../models/controlStatus.model';

@Injectable({
  providedIn: 'root',
})
export class ControlStatusService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/control-status`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(controlStatus: ControlStatusCreate): Observable<ControlStatus> {
    return this.http.post<ControlStatus>(this.apiUrl, controlStatus);
  }

  getByControl(controlId: string): Observable<ControlStatus> {
    return this.http.get<ControlStatus>(`${this.apiUrl}/${controlId}`);
  }

  getStatusNamesByControl(controlId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/status/control/${controlId}`);
  }

  update(controlId: string, statusId: string): Observable<ControlStatus> {
    return this.http.put<ControlStatus>(
      `${this.apiUrl}/${controlId}/${statusId}`,
      {},
      this.httpOptions,
    );
  }

  delete(controlId: string, statusId: string): Observable<ControlStatus> {
    return this.http.delete<ControlStatus>(`${this.apiUrl}/${controlId}/${statusId}`);
  }
}
