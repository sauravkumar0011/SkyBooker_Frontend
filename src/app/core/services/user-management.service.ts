import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RegisterRequest, User } from '../../models';

type StaffCreatePayload = Omit<RegisterRequest, 'role' | 'passportNumber' | 'airlineId'> & { airlineId: string };

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private authBase = `${environment.apiBaseUrl}/auth`;
  private authUsersBase = `${environment.apiBaseUrl}/auth/users`;

  constructor(private http: HttpClient) {}

  getStaffUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.authUsersBase).pipe(
      map(users => users.filter(user => user.role === 'AIRLINE_STAFF'))
    );
  }

  createStaff(data: StaffCreatePayload): Observable<any> {
    const payload: RegisterRequest = {
      ...data,
      role: 'AIRLINE_STAFF',
      passportNumber: null,
    };

    return this.http.post(`${this.authBase}/register`, payload);
  }

  deactivateUser(userId: string): Observable<string> {
    return this.http.put(`${this.authUsersBase}/${userId}/deactivate`, {}, { responseType: 'text' });
  }

  deleteUser(userId: string): Observable<string> {
    return this.http.delete(`${this.authUsersBase}/${userId}`, { responseType: 'text' });
  }
}
