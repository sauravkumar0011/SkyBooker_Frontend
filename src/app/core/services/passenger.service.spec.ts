import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PassengerService } from './passenger.service';

describe('PassengerService', () => {
  let service: PassengerService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/passengers`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PassengerService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(PassengerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a passenger', () => {
    const payload = {
      bookingId: 'booking-1',
      seatId: 'seat-1',
      firstName: 'Sky',
      lastName: 'Traveler'
    } as any;

    service.createPassenger(payload).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should get passengers by booking id', () => {
    service.getPassengersByBooking('booking-1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/booking/booking-1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should propagate backend errors', () => {
    let actualStatus: number | undefined;

    service.getPassengersByBooking('booking-404').subscribe({
      error: error => actualStatus = error.status
    });

    const req = httpMock.expectOne(`${baseUrl}/booking/booking-404`);
    req.flush({}, { status: 404, statusText: 'Not Found' });

    expect(actualStatus).toBe(404);
  });
});
