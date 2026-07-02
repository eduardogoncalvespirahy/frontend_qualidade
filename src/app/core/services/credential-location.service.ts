import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CredentialLocation,
  CredentialLocationCreate,
  CredentialLocationUpdate,
} from '../models/credential-location.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CredentialLocationService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/credentials-locations`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(credentialLocation: CredentialLocationCreate): Observable<CredentialLocation> {
    return this.http.post<CredentialLocation>(this.apiUrl, credentialLocation);
  }

  getByCredential(credentialId: string): Observable<CredentialLocation> {
    return this.http.get<CredentialLocation>(`${this.apiUrl}/${credentialId}`);
  }

  getLocationNamesByCredential(credentialId: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/locations/credential/${credentialId}`);
  }

  delete(credentialId: string, locationId: string): Observable<CredentialLocation> {
    return this.http.delete<CredentialLocation>(`${this.apiUrl}/${credentialId}/${locationId}`);
  }
}
