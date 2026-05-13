import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { FlightService } from '../../../core/services/flight.service';
import { PassengerService } from '../../../core/services/passenger.service';
import { SeatService } from '../../../core/services/seat.service';
import { ToastService } from '../../../core/services/toast.service';
import { MyBookingsComponent } from './my-bookings.component';

describe('MyBookingsComponent', () => {
  let component: MyBookingsComponent;
  let fixture: ComponentFixture<MyBookingsComponent>;
  let bookingService: jasmine.SpyObj<BookingService>;
  let flightService: jasmine.SpyObj<FlightService>;
  let seatService: jasmine.SpyObj<SeatService>;
  let passengerService: jasmine.SpyObj<PassengerService>;
  let auth: jasmine.SpyObj<AuthService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;

  const booking = {
    bookingId: 'booking-1',
    flightId: 'flight-1',
    seatId: 'seat-1',
    pnrCode: 'PNR123',
    totalFare: 6400,
    status: 'PENDING'
  } as any;
  const flight = { flightId: 'flight-1', flightNumber: 'SB101', originAirportCode: 'DEL', destinationAirportCode: 'BOM' } as any;
  const seat = { seatId: 'seat-1', seatNumber: '12A' } as any;
  const passenger = { ticketNumber: 'TKT-1', firstName: 'Sky', lastName: 'Traveler' } as any;

  beforeEach(async () => {
    bookingService = jasmine.createSpyObj<BookingService>('BookingService', ['getBookingsByUser', 'cancelBooking']);
    flightService = jasmine.createSpyObj<FlightService>('FlightService', ['getFlightById']);
    seatService = jasmine.createSpyObj<SeatService>('SeatService', ['getSeatMap']);
    passengerService = jasmine.createSpyObj<PassengerService>('PassengerService', ['getPassengersByBooking']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getUserId']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'warning', 'error', 'info']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    auth.getUserId.and.returnValue('user-1');
    bookingService.getBookingsByUser.and.returnValue(of([booking]));
    bookingService.cancelBooking.and.returnValue(of({ ...booking, status: 'CANCELLED' } as any));
    flightService.getFlightById.and.returnValue(of(flight));
    seatService.getSeatMap.and.returnValue(of([seat]));
    passengerService.getPassengersByBooking.and.returnValue(of([passenger]));

    await TestBed.configureTestingModule({
      declarations: [MyBookingsComponent],
      providers: [
        { provide: BookingService, useValue: bookingService },
        { provide: FlightService, useValue: flightService },
        { provide: SeatService, useValue: seatService },
        { provide: PassengerService, useValue: passengerService },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(MyBookingsComponent);
    component = fixture.componentInstance;
  });

  it('should load bookings and related flight and seat labels on init', () => {
    fixture.detectChanges();

    expect(bookingService.getBookingsByUser).toHaveBeenCalledWith('user-1');
    expect(component.bookings).toEqual([booking]);
    expect(component.loading).toBeFalse();
    expect(component.getFlightLabel(booking)).toBe('SB101');
    expect(component.getSeatLabel(booking)).toBe('12A');
  });

  it('should stop loading when booking retrieval fails', () => {
    bookingService.getBookingsByUser.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();

    expect(component.loading).toBeFalse();
  });

  it('should open and close the cancel confirmation dialog', () => {
    component.openCancelConfirm(booking);
    expect(component.cancelTarget).toEqual(booking);

    component.closeCancelConfirm();
    expect(component.cancelTarget).toBeNull();
  });

  it('should keep the cancel dialog open while cancellation is in progress', () => {
    component.cancelTarget = booking;
    component.cancellingId = booking.bookingId;

    component.closeCancelConfirm();

    expect(component.cancelTarget).toEqual(booking);
  });

  it('should cancel a booking, reload data, and clear dialog state', () => {
    bookingService.getBookingsByUser.and.returnValues(of([booking]), of([]));
    fixture.detectChanges();
    component.cancelTarget = booking;

    component.confirmCancelBooking();

    expect(bookingService.cancelBooking).toHaveBeenCalledWith('booking-1');
    expect(toast.success).toHaveBeenCalledWith('Booking cancelled.');
    expect(component.cancellingId).toBeNull();
    expect(component.cancelTarget).toBeNull();
    expect(bookingService.getBookingsByUser).toHaveBeenCalledTimes(2);
  });

  it('should reset cancelling state when cancel fails', () => {
    bookingService.cancelBooking.and.returnValue(throwError(() => new Error('cancel failed')));
    component.cancelTarget = booking;

    component.confirmCancelBooking();

    expect(component.cancellingId).toBeNull();
    expect(component.cancelTarget).toEqual(booking);
  });

  it('should navigate to payment with booking state', () => {
    component.goToPayment(booking);
    expect(router.navigate).toHaveBeenCalledWith(['/passenger/payment', 'booking-1'], {
      state: { booking }
    });
  });

  it('should warn when ticket details are incomplete', () => {
    flightService.getFlightById.and.returnValue(of(null));

    component.downloadTicket(booking);

    expect(toast.warning).toHaveBeenCalledWith('Ticket details are not available for this booking yet.');
    expect(component.downloadingTicketId).toBeNull();
  });

  it('should generate and download a ticket when all details are present', () => {
    const blob = new Blob(['pdf']);
    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    const revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');
    const anchor = { click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(anchor as any);
    spyOn<any>(component, 'buildTicketPdf').and.returnValue(blob);
    spyOn(window, 'setTimeout').and.callFake(((callback: TimerHandler) => {
      if (typeof callback === 'function') callback();
      return 0 as any;
    }) as any);

    component.downloadTicket(booking);

    expect(component['buildTicketPdf']).toHaveBeenCalledWith(booking, flight, seat, passenger);
    expect(createObjectUrlSpy).toHaveBeenCalledWith(blob);
    expect(anchor.click).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test');
    expect(toast.success).toHaveBeenCalledWith('Ticket TKT-1 downloaded.');
    expect(component.downloadingTicketId).toBeNull();
  });

  it('should map booking status classes', () => {
    expect(component.getStatusClass('PENDING')).toBe('badge-warning');
    expect(component.getStatusClass('CONFIRMED')).toBe('badge-success');
    expect(component.getStatusClass('UNKNOWN')).toBe('badge-default');
  });
});
