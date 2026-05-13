import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Flight, FlightRequest, FlightStatus } from '../../models';

@Injectable({ providedIn: 'root' })
export class FlightService {
  private base = `${environment.apiBaseUrl}/flights`;

  constructor(private http: HttpClient) {}

  searchFlights(origin: string, destination: string, departureDate: string): Observable<Flight[]> {
    const params = new HttpParams()
      .set('origin', origin)
      .set('destination', destination)
      .set('departureDate', departureDate);
    return this.http.get<Flight[]>(`${this.base}/search`, { params });
  }

  getFlightById(flightId: string): Observable<Flight> {
    return this.http.get<Flight>(`${this.base}/${flightId}`);
  }

  getFlightByNumber(flightNumber: string): Observable<Flight> {
    return this.http.get<Flight>(`${this.base}/number/${flightNumber}`);
  }

  getFlightsByAirline(airlineId: string): Observable<Flight[]> {
    return this.http.get<Flight[]>(`${this.base}/airline/${airlineId}`);
  }

  getAllFlights(): Observable<Flight[]> {
    return this.http.get<Flight[]>(this.base);
  }

  createFlight(data: FlightRequest): Observable<Flight> {
    return this.http.post<Flight>(this.base, data);
  }

  updateFlight(flightId: string, data: Partial<FlightRequest>): Observable<Flight> {
    return this.http.put<Flight>(`${this.base}/${flightId}`, data);
  }

  updateFlightStatus(flightId: string, status: FlightStatus): Observable<Flight> {
    return this.http.put<Flight>(`${this.base}/${flightId}/status`, { status });
  }

  decrementSeats(flightId: string, count: number): Observable<Flight> {
    const params = new HttpParams().set('count', count);
    return this.http.put<Flight>(`${this.base}/${flightId}/decrement-seats`, {}, { params });
  }

  incrementSeats(flightId: string, count: number): Observable<Flight> {
    const params = new HttpParams().set('count', count);
    return this.http.put<Flight>(`${this.base}/${flightId}/increment-seats`, {}, { params });
  }

  deleteFlight(flightId: string): Observable<string> {
    return this.http.delete(`${this.base}/${flightId}`, { responseType: 'text' });
  }
}
