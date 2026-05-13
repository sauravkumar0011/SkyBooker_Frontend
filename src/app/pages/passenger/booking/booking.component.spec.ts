import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { FlightService } from '../../../core/services/flight.service';
import { SeatService } from '../../../core/services/seat.service';
import { ToastService } from '../../../core/services/toast.service';
import { BookingComponent } from './booking.component';

describe('BookingComponent', () => {
  let component: BookingComponent;
  let fixture: ComponentFixture<BookingComponent>;
  let bookingService: jasmine.SpyObj<BookingService>;
  let flightService: jasmine.SpyObj<FlightService>;
  let seatService: jasmine.SpyObj<SeatService>;
  let auth: jasmine.SpyObj<AuthService>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let queryParams$: Subject<Record<string, string>>;

  const flight = {
    flightId: 'flight-1',
    flightNumber: 'SB101',
    basePrice: 5000,
  } as any;
  const seat = { seatId: 'seat-1', seatNumber: '12A' } as any;
  const fareSummary = { totalFare: 5900, taxes: 900 } as any;
  const createdBooking = { bookingId: 'booking-1', status: 'PENDING' } as any;
  let holdReference: string;

  beforeEach(async () => {
    bookingService = jasmine.createSpyObj<BookingService>('BookingService', ['calculateFare', 'createBooking']);
    flightService = jasmine.createSpyObj<FlightService>('FlightService', ['getFlightById']);
    seatService = jasmine.createSpyObj<SeatService>('SeatService', ['getSeatMap', 'holdSeat', 'releaseSeat']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getEmail', 'getUserIdValue']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['warning', 'success', 'error', 'info']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    queryParams$ = new Subject<Record<string, string>>();

    auth.getEmail.and.returnValue('user@example.com');
    auth.getUserIdValue.and.returnValue('user-1');
    flightService.getFlightById.and.returnValue(of(flight));
    seatService.getSeatMap.and.returnValue(of([seat]));
    seatService.holdSeat.and.returnValue(of({ ...seat, status: 'HELD' } as any));
    seatService.releaseSeat.and.returnValue(of({ ...seat, status: 'AVAILABLE' } as any));
    router.getCurrentNavigation.and.returnValue(null);
    holdReference = 'hold-ref-1';
    sessionStorage.setItem('seat-hold:flight-1:seat-1', holdReference);

    history.replaceState({}, '');

    await TestBed.configureTestingModule({
      declarations: [BookingComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: BookingService, useValue: bookingService },
        { provide: FlightService, useValue: flightService },
        { provide: SeatService, useValue: seatService },
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(BookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    history.replaceState({}, '');
    sessionStorage.clear();
  });

  function emitRoute(): void {
    queryParams$.next({ flightId: 'flight-1', seatId: 'seat-1' });
  }

  function fillValidForm(): void {
    component.form.setValue({
      tripType: 'ONE_WAY',
      mealPreference: 'STANDARD',
      luggageKg: 15,
      contactEmail: 'traveler@example.com',
      contactPhone: '+911234567890',
      firstName: ' Sky ',
      lastName: ' Booker ',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      passportNumber: ' P1234567 ',
      nationality: ' Indian ',
    });
  }

  it('should read query params and load flight and seat details', () => {
    emitRoute();

    expect(component.flightId).toBe('flight-1');
    expect(component.seatId).toBe('seat-1');
    expect(component.holdReference).toBe(holdReference);
    expect(seatService.holdSeat).toHaveBeenCalledWith('seat-1', holdReference);
    expect(flightService.getFlightById).toHaveBeenCalledWith('flight-1');
    expect(seatService.getSeatMap).toHaveBeenCalledWith('flight-1');
    expect(component.flight).toEqual(flight);
    expect(component.selectedSeat).toEqual(seat);
    expect(component.loadingDetails).toBeFalse();
  });

  it('should redirect back to seat selection when holding the seat fails', () => {
    seatService.holdSeat.and.returnValue(throwError(() => new Error('hold failed')));

    emitRoute();

    expect(toast.warning).toHaveBeenCalledWith('This seat could not be reserved. Please choose another seat.');
    expect(router.navigate).toHaveBeenCalledWith(['/passenger/seats', 'flight-1']);
  });

  it('should warn when payment failure state is present', () => {
    history.replaceState({ paymentFailed: true }, '');
    component = TestBed.createComponent(BookingComponent).componentInstance;
    fixture = TestBed.createComponent(BookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    queryParams$.next({ flightId: 'flight-1', seatId: 'seat-1' });

    expect(toast.warning).toHaveBeenCalledWith('Payment failed. Review your travel preferences and try again.');
  });

  it('should restore a stored booking draft and auto-restore fare calculation', () => {
    sessionStorage.setItem('booking-form:flight-1:seat-1', JSON.stringify({
      tripType: 'ROUND_TRIP',
      mealPreference: 'VEGAN',
      luggageKg: 20,
      contactEmail: 'saved@example.com',
      contactPhone: '+919999999999',
      firstName: 'Saved',
      lastName: 'Traveler',
      dateOfBirth: '1990-01-01',
      gender: 'FEMALE',
      passportNumber: 'P000001',
      nationality: 'Saved Nation'
    }));
    bookingService.calculateFare.and.returnValue(of(fareSummary));

    emitRoute();

    expect(component.form.get('tripType')?.value).toBe('ROUND_TRIP');
    expect(bookingService.calculateFare).toHaveBeenCalled();
    expect(component.fareSummary).toEqual(fareSummary);
  });

  it('should clear invalid saved draft JSON', () => {
    sessionStorage.setItem('booking-form:flight-1:seat-1', '{invalid-json');

    emitRoute();

    expect(sessionStorage.getItem('booking-form:flight-1:seat-1')).toBeNull();
  });

  it('should mark the form touched when calculateFare is called with invalid data', () => {
    spyOn(component.form, 'markAllAsTouched');

    component.calculateFare();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(bookingService.calculateFare).not.toHaveBeenCalled();
  });

  it('should warn when calculating fare before flight details load', () => {
    fillValidForm();
    component.flight = null;

    component.calculateFare();

    expect(toast.warning).toHaveBeenCalledWith('Flight details are still loading.');
  });

  it('should calculate fare successfully and toggle fare details', () => {
    emitRoute();
    bookingService.calculateFare.and.returnValue(of(fareSummary));
    fillValidForm();

    component.calculateFare();

    expect(bookingService.calculateFare).toHaveBeenCalled();
    expect(component.fareSummary).toEqual(fareSummary);
    expect(component.loadingFare).toBeFalse();

    component.toggleFareDetails();
    expect(component.showFareDetails).toBeTrue();
  });

  it('should reset fare state when fare calculation fails', () => {
    emitRoute();
    bookingService.calculateFare.and.returnValue(throwError(() => new Error('fare failed')));
    fillValidForm();

    component.calculateFare();

    expect(component.fareSummary).toBeNull();
    expect(component.loadingFare).toBeFalse();
  });

  it('should warn on continue when fare is missing', () => {
    emitRoute();
    fillValidForm();
    component.flight = flight;
    component.fareSummary = null;

    component.onContinue();

    expect(toast.warning).toHaveBeenCalledWith('Calculate fare before continuing to payment.');
  });

  it('should reuse a pending retry booking and navigate to payment', () => {
    emitRoute();
    fillValidForm();
    component.flight = flight;
    component.fareSummary = fareSummary;
    component.retryBooking = { bookingId: 'retry-1', status: 'PENDING' } as any;

    component.onContinue();

    expect(sessionStorage.getItem('pending-passenger:retry-1')).toContain('"seatId":"seat-1"');
    expect(router.navigate).toHaveBeenCalledWith(['/passenger/payment', 'retry-1'], jasmine.objectContaining({
      state: jasmine.objectContaining({
        autoStart: true,
        returnToBooking: { flightId: 'flight-1', seatId: 'seat-1' },
        holdReference,
      })
    }));
  });

  it('should create a booking, persist drafts, and navigate to payment', () => {
    emitRoute();
    fillValidForm();
    component.flight = flight;
    component.fareSummary = fareSummary;
    bookingService.createBooking.and.returnValue(of(createdBooking));

    component.onContinue();

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      userId: 'user-1',
      flightId: 'flight-1',
      seatId: 'seat-1',
      tripType: 'ONE_WAY',
      baseFare: 5000,
      taxes: 900,
      mealPreference: 'STANDARD',
      luggageKg: 15,
      contactEmail: 'traveler@example.com',
      contactPhone: '+911234567890',
      holdReference,
    });
    expect(sessionStorage.getItem('pending-passenger:booking-1')).toContain('"firstName":"Sky"');
    expect(sessionStorage.getItem('booking-form:flight-1:seat-1')).toContain('"nationality":"Indian"');
    expect(router.navigate).toHaveBeenCalledWith(['/passenger/payment', 'booking-1'], jasmine.objectContaining({
      state: jasmine.objectContaining({ booking: createdBooking, holdReference })
    }));
    expect(component.loading).toBeFalse();
  });

  it('should reset loading when booking creation fails', () => {
    emitRoute();
    fillValidForm();
    component.flight = flight;
    component.fareSummary = fareSummary;
    bookingService.createBooking.and.returnValue(throwError(() => new Error('create failed')));

    component.onContinue();

    expect(component.loading).toBeFalse();
  });

  it('should release the held seat when leaving booking without proceeding to payment', () => {
    emitRoute();

    component.ngOnDestroy();

    expect(seatService.releaseSeat).toHaveBeenCalledWith('seat-1', holdReference);
  });

  it('should keep the held seat when continuing to payment', () => {
    emitRoute();
    fillValidForm();
    component.flight = flight;
    component.fareSummary = fareSummary;
    bookingService.createBooking.and.returnValue(of(createdBooking));

    component.onContinue();
    component.ngOnDestroy();

    expect(seatService.releaseSeat).not.toHaveBeenCalled();
  });
});
