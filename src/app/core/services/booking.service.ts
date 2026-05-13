import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, BookingRequest, FareSummaryResponse } from '../../models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private base = `${environment.apiBaseUrl}/bookings`;

  constructor(private http: HttpClient) {}

  createBooking(data: BookingRequest): Observable<Booking> {
    return this.http.post<Booking>(this.base, data);
  }

  calculateFare(data: BookingRequest): Observable<FareSummaryResponse> {
    return this.http.post<FareSummaryResponse>(`${this.base}/fare/calculate`, data);
  }

  getBookingsByUser(userId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.base}/user/${userId}`);
  }

  getBookingByPnr(pnrCode: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/pnr/${pnrCode}`);
  }

  getBookingById(bookingId: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/${bookingId}`);
  }

  confirmBooking(bookingId: string): Observable<Booking> {
    return this.http.put<Booking>(`${this.base}/${bookingId}/confirm`, {});
  }

  cancelBooking(bookingId: string): Observable<Booking> {
    return this.http.put<Booking>(`${this.base}/${bookingId}/cancel`, {});
  }
}
