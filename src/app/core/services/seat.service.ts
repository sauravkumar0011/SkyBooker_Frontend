import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Seat, SeatRequest, BulkSeatRequest, SeatClass } from '../../models';

@Injectable({ providedIn: 'root' })
export class SeatService {
  private base = `${environment.apiBaseUrl}/seats`;

  constructor(private http: HttpClient) {}

  getSeatMap(flightId: string): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${this.base}/flight/${flightId}/map`);
  }

  getAvailableSeats(flightId: string): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${this.base}/flight/${flightId}/available`);
  }

  getAvailableSeatsByClass(flightId: string, seatClass: SeatClass): Observable<Seat[]> {
    return this.http.get<Seat[]>(`${this.base}/flight/${flightId}/available/${seatClass}`);
  }

  createSeat(data: SeatRequest): Observable<Seat> {
    return this.http.post<Seat>(this.base, data);
  }

  createBulkSeats(data: BulkSeatRequest): Observable<Seat[]> {
    return this.http.post<Seat[]>(`${this.base}/bulk`, data);
  }

  deleteSeatsForFlight(flightId: string): Observable<string> {
    return this.http.delete(`${this.base}/flight/${flightId}`, { responseType: 'text' });
  }

  holdSeat(seatId: string, holdReference: string): Observable<Seat> {
    return this.http.put<Seat>(`${this.base}/${seatId}/hold`, { holdReference });
  }

  releaseSeat(seatId: string, holdReference: string): Observable<Seat> {
    return this.http.put<Seat>(`${this.base}/${seatId}/release`, { holdReference });
  }

  confirmSeat(seatId: string, holdReference: string): Observable<Seat> {
    return this.http.put<Seat>(`${this.base}/${seatId}/confirm`, { holdReference });
  }
}
