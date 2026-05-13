import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FlightService } from './flight.service';

describe('FlightService', () => {
  let service: FlightService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/flights`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FlightService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(FlightService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should search flights with the expected query params', () => {
    service.searchFlights('DEL', 'BOM', '2026-05-10').subscribe();

    const req = httpMock.expectOne(request =>
      request.url === `${baseUrl}/search`
      && request.params.get('origin') === 'DEL'
      && request.params.get('destination') === 'BOM'
      && request.params.get('departureDate') === '2026-05-10'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch flights by id, number, airline, and all flights', () => {
    service.getFlightById('flight-1').subscribe();
    let req = httpMock.expectOne(`${baseUrl}/flight-1`);
    expect(req.request.method).toBe('GET');
    req.flush({});

    service.getFlightByNumber('SB101').subscribe();
    req = httpMock.expectOne(`${baseUrl}/number/SB101`);
    expect(req.request.method).toBe('GET');
    req.flush({});

    service.getFlightsByAirline('airline-1').subscribe();
    req = httpMock.expectOne(`${baseUrl}/airline/airline-1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    service.getAllFlights().subscribe();
    req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should create and update flights', () => {
    const payload = { flightNumber: 'SB101' } as any;

    service.createFlight(payload).subscribe();
    let req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});

    service.updateFlight('flight-1', { status: 'ON_TIME' } as any).subscribe();
    req = httpMock.expectOne(`${baseUrl}/flight-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'ON_TIME' });
    req.flush({});
  });

  it('should update flight status and seat counters with correct params', () => {
    service.updateFlightStatus('flight-1', 'DELAYED' as any).subscribe();
    let req = httpMock.expectOne(`${baseUrl}/flight-1/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'DELAYED' });
    req.flush({});

    service.decrementSeats('flight-1', 2).subscribe();
    req = httpMock.expectOne(request =>
      request.url === `${baseUrl}/flight-1/decrement-seats`
      && request.params.get('count') === '2'
    );
    expect(req.request.method).toBe('PUT');
    req.flush({});

    service.incrementSeats('flight-1', 3).subscribe();
    req = httpMock.expectOne(request =>
      request.url === `${baseUrl}/flight-1/increment-seats`
      && request.params.get('count') === '3'
    );
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should delete flights as text responses', () => {
    service.deleteFlight('flight-1').subscribe(response => {
      expect(response).toBe('Deleted');
    });

    const req = httpMock.expectOne(`${baseUrl}/flight-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.responseType).toBe('text');
    req.flush('Deleted');
  });
});
