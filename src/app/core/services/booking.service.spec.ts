import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SUPPRESS_GLOBAL_ERROR_TOAST } from '../interceptors/http-context-tokens';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/bookings`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BookingService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(BookingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a booking with the expected payload', () => {
    const payload = {
      userId: 'user-1',
      flightId: 'flight-1',
      seatId: 'seat-1',
      tripType: 'ONE_WAY',
      baseFare: 5400,
      taxes: 972,
      mealPreference: 'STANDARD',
      luggageKg: 15,
      contactEmail: 'user@example.com',
      contactPhone: '+911234567890'
    } as any;

    service.createBooking(payload).subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ bookingId: 'booking-1' });
  });

  it('should call the fare calculation endpoint', () => {
    const payload = { flightId: 'flight-1', seatId: 'seat-1' } as any;

    service.calculateFare(payload).subscribe(response => {
      expect(response.totalFare).toBe(6372);
    });

    const req = httpMock.expectOne(`${baseUrl}/fare/calculate`);
    expect(req.request.method).toBe('POST');
    req.flush({ totalFare: 6372 });
  });

  it('should fetch bookings by user id', () => {
    service.getBookingsByUser('user-42').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/user/user-42`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should fetch a booking by PNR', () => {
    service.getBookingByPnr('SKY123').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/pnr/SKY123`);
    expect(req.request.method).toBe('GET');
    req.flush({ bookingId: 'booking-1' });
  });

  it('should fetch a booking by id', () => {
    service.getBookingById('booking-1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/booking-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ bookingId: 'booking-1' });
  });

  it('should confirm and cancel bookings through PUT endpoints', () => {
    service.confirmBooking('booking-1').subscribe();
    let req = httpMock.expectOne(`${baseUrl}/booking-1/confirm`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    expect(req.request.context.get(SUPPRESS_GLOBAL_ERROR_TOAST)).toBeFalse();
    req.flush({ bookingId: 'booking-1', status: 'CONFIRMED' });

    service.cancelBooking('booking-1').subscribe();
    req = httpMock.expectOne(`${baseUrl}/booking-1/cancel`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush({ bookingId: 'booking-1', status: 'CANCELLED' });
  });

  it('should allow confirm booking requests to suppress global error toasts', () => {
    service.confirmBooking('booking-1', { suppressHandledErrorToast: true }).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/booking-1/confirm`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.context.get(SUPPRESS_GLOBAL_ERROR_TOAST)).toBeTrue();
    req.flush({ bookingId: 'booking-1', status: 'CONFIRMED' });
  });

  it('should propagate backend errors to subscribers', () => {
    let actualStatus: number | undefined;

    service.calculateFare({ flightId: 'flight-1' } as any).subscribe({
      error: error => actualStatus = error.status
    });

    const req = httpMock.expectOne(`${baseUrl}/fare/calculate`);
    req.flush({ message: 'fare failed' }, { status: 500, statusText: 'Server Error' });

    expect(actualStatus).toBe(500);
  });
});
