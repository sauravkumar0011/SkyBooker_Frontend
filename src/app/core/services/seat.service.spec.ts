import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SUPPRESS_GLOBAL_ERROR_TOAST } from '../interceptors/http-context-tokens';
import { SeatService } from './seat.service';

describe('SeatService', () => {
  let service: SeatService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/seats`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SeatService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(SeatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch seat maps and available seats', () => {
    service.getSeatMap('flight-1').subscribe();
    let req = httpMock.expectOne(`${baseUrl}/flight/flight-1/map`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    service.getAvailableSeats('flight-1').subscribe();
    req = httpMock.expectOne(`${baseUrl}/flight/flight-1/available`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch available seats by class', () => {
    service.getAvailableSeatsByClass('flight-1', 'BUSINESS' as any).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/flight/flight-1/available/BUSINESS`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should create single and bulk seats', () => {
    const singlePayload = { seatNumber: '12A' } as any;
    const bulkPayload = { flightId: 'flight-1', columns: ['A', 'B'] } as any;

    service.createSeat(singlePayload).subscribe();
    let req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(singlePayload);
    req.flush({});

    service.createBulkSeats(bulkPayload).subscribe();
    req = httpMock.expectOne(`${baseUrl}/bulk`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(bulkPayload);
    req.flush([]);
  });

  it('should delete seats for a flight as text', () => {
    service.deleteSeatsForFlight('flight-1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/flight/flight-1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.responseType).toBe('text');
    req.flush('Deleted');
  });

  it('should hold and release seats', () => {
    service.holdSeat('seat-1', 'hold-ref-1').subscribe();
    let req = httpMock.expectOne(`${baseUrl}/seat-1/hold`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ holdReference: 'hold-ref-1' });
    req.flush({});

    service.releaseSeat('seat-1', 'hold-ref-1').subscribe();
    req = httpMock.expectOne(`${baseUrl}/seat-1/release`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ holdReference: 'hold-ref-1' });
    expect(req.request.context.get(SUPPRESS_GLOBAL_ERROR_TOAST)).toBeFalse();
    req.flush({});

    service.confirmSeat('seat-1', 'hold-ref-1').subscribe();
    req = httpMock.expectOne(`${baseUrl}/seat-1/confirm`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ holdReference: 'hold-ref-1' });
    req.flush({});
  });

  it('should allow release seat requests to suppress global error toasts', () => {
    service.releaseSeat('seat-1', 'hold-ref-1', { suppressHandledErrorToast: true }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/seat-1/release`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.context.get(SUPPRESS_GLOBAL_ERROR_TOAST)).toBeTrue();
    req.flush({});
  });
});
