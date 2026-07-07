import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User, UserCreate, UserUpdate } from '../models/user.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PaginatedResult } from '../models/paginated.model';
import { UserProfile } from '../models/user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/users`;

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  create(user: UserCreate): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  getByIdUserProfile(id: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile/${id}`);
  }

  getByRegisterNumber(registerNumber: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/registerNumber/${registerNumber}`);
  }

  getAll(limit?: number, page?: number): Observable<PaginatedResult<User>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<User>>(this.apiUrl, { params });
  }

  getAllUserProfile(limit?: number, page?: number): Observable<PaginatedResult<UserProfile>> {
    let params = new HttpParams();
    if (limit != null) {
      params = params.set('limit', limit.toString());
    }
    if (page != null) {
      params = params.set('page', page.toString());
    }
    return this.http.get<PaginatedResult<UserProfile>>(this.apiUrl + '/profiles', { params });
  }

  getInspetorByRegisterNumber(registerNumber: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/inspetor/registerNumber/${registerNumber}`);
  }

  update(id: string, user: UserUpdate): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user, this.httpOptions);
  }

  delete(id: string): Observable<User> {
    return this.http.delete<User>(`${this.apiUrl}/${id}`);
  }
}
