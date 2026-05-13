import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Airline, AirlineRequest, Airport, AirportRequest } from '../../models';

@Injectable({ providedIn: 'root' })
export class AirlineAirportService {
  private airlinesBase = `${environment.apiBaseUrl}/airlines`;
  private airportsBase = `${environment.apiBaseUrl}/airports`;

  constructor(private http: HttpClient) {}

  // ─── Airlines ────────────────────────────────────────
  getAirlines(): Observable<Airline[]> {
    return this.http.get<Airline[]>(this.airlinesBase);
  }

  createAirline(data: AirlineRequest): Observable<Airline> {
    return this.http.post<Airline>(this.airlinesBase, data);
  }

  updateAirline(airlineId: string, data: Partial<AirlineRequest>): Observable<Airline> {
    return this.http.put<Airline>(`${this.airlinesBase}/${airlineId}`, data);
  }

  deactivateAirline(airlineId: string): Observable<any> {
    return this.http.put(`${this.airlinesBase}/${airlineId}/deactivate`, {});
  }

  // ─── Airports ────────────────────────────────────────
  searchAirports(keyword: string): Observable<Airport[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Airport[]>(`${this.airportsBase}/search`, { params });
  }

  getAirportByIata(iataCode: string): Observable<Airport> {
    return this.http.get<Airport>(`${this.airportsBase}/iata/${iataCode}`);
  }

  createAirport(data: AirportRequest): Observable<Airport> {
    return this.http.post<Airport>(this.airportsBase, data);
  }

  updateAirport(airportId: number, data: Partial<AirportRequest>): Observable<Airport> {
    return this.http.put<Airport>(`${this.airportsBase}/${airportId}`, data);
  }
}
