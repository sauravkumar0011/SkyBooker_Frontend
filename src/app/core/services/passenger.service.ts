import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Passenger, PassengerRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class PassengerService {
  private base = `${environment.apiBaseUrl}/passengers`;

  constructor(private http: HttpClient) {}

  createPassenger(data: PassengerRequest): Observable<Passenger> {
    return this.http.post<Passenger>(this.base, data);
  }

  getPassengersByBooking(bookingId: string): Observable<Passenger[]> {
    return this.http.get<Passenger[]>(`${this.base}/booking/${bookingId}`);
  }
}
