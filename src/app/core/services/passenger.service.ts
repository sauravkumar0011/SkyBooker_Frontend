import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Passenger, PassengerBulkRequest, PassengerCreateRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class PassengerService {
  private base = `${environment.apiBaseUrl}/passengers`;

  constructor(private http: HttpClient) {}

  createPassengers(data: PassengerBulkRequest): Observable<Passenger[]> {
    return this.http.post<Passenger[]>(`${this.base}/bulk`, data);
  }

  createPassenger(data: PassengerCreateRequest): Observable<Passenger> {
    const { bookingId, ...passenger } = data;

    return this.createPassengers({
      bookingId,
      passengers: [passenger],
    }).pipe(
      map(passengers => passengers[0])
    );
  }

  getPassengersByBooking(bookingId: string): Observable<Passenger[]> {
    return this.http.get<Passenger[]>(`${this.base}/booking/${bookingId}`);
  }
}
