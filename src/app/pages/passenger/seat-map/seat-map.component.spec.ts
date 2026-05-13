import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { FlightService } from '../../../core/services/flight.service';
import { SeatService } from '../../../core/services/seat.service';
import { ToastService } from '../../../core/services/toast.service';
import { SeatMapComponent } from './seat-map.component';

describe('SeatMapComponent', () => {
  let component: SeatMapComponent;
  let fixture: ComponentFixture<SeatMapComponent>;
  let router: jasmine.SpyObj<Router>;
  let seatService: jasmine.SpyObj<SeatService>;
  let flightService: jasmine.SpyObj<FlightService>;
  let toast: jasmine.SpyObj<ToastService>;
  let auth: jasmine.SpyObj<AuthService>;

  const flight = {
    flightId: 'flight-1',
    flightNumber: 'SB101',
    originAirportCode: 'DEL',
    destinationAirportCode: 'BOM'
  } as any;

  const seats = [
    { seatId: 'seat-1', seatNumber: '12A', seatClass: 'ECONOMY', status: 'AVAILABLE' },
    { seatId: 'seat-2', seatNumber: '12B', seatClass: 'ECONOMY', status: 'HELD' },
    { seatId: 'seat-3', seatNumber: '13A', seatClass: 'BUSINESS', status: 'CONFIRMED' },
  ] as any[];

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'createUrlTree']);
    seatService = jasmine.createSpyObj<SeatService>('SeatService', ['getSeatMap']);
    flightService = jasmine.createSpyObj<FlightService>('FlightService', ['getFlightById']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['info', 'warning', 'error', 'success']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn']);
    router.createUrlTree.and.returnValue({ toString: () => '/passenger/booking?flightId=flight-1&seatId=seat-1' } as any);
    flightService.getFlightById.and.returnValue(of(flight));

    await TestBed.configureTestingModule({
      declarations: [SeatMapComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: SeatService, useValue: seatService },
        { provide: FlightService, useValue: flightService },
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ flightId: 'flight-1' }) } }
        },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SeatMapComponent);
    component = fixture.componentInstance;
  });

  it('should read the flightId from the route and load the seat map', () => {
    seatService.getSeatMap.and.returnValue(of(seats));

    fixture.detectChanges();

    expect(component.flightId).toBe('flight-1');
    expect(seatService.getSeatMap).toHaveBeenCalledWith('flight-1');
    expect(flightService.getFlightById).toHaveBeenCalledWith('flight-1');
    expect(component.loading).toBeFalse();
    expect(component.rows.length).toBe(2);
  });

  it('should stop loading when seat loading fails', () => {
    seatService.getSeatMap.and.returnValue(throwError(() => new Error('load failed')));

    fixture.detectChanges();

    expect(component.loading).toBeFalse();
  });

  it('should build grid rows grouped by seat number prefix', () => {
    component.seats = seats.map(seat => ({
      ...seat,
      columnLetter: seat.seatNumber.slice(-1),
      rowNumber: Number(seat.seatNumber.replace(/[A-Z]$/i, ''))
    })) as any;
    component.buildGrid();

    expect(component.rows.map(row => row.label)).toEqual(['12', '13']);
  });

  it('should select only available seats and show a toast', () => {
    component.selectSeat(seats[1]);
    expect(component.selectedSeat).toBeNull();

    component.selectSeat(seats[0]);
    expect(component.selectedSeat).toEqual(seats[0]);
    expect(toast.info).toHaveBeenCalledWith('Seat 12A (ECONOMY) selected');
  });

  it('should return seat CSS classes based on status and selection', () => {
    component.selectedSeat = seats[0] as any;

    expect(component.getSeatVisualClass(seats[0] as any)).toContain('seat-selected');
    expect(component.getSeatVisualClass(seats[1] as any)).toContain('seat-held');
    expect(component.getSeatVisualClass(seats[2] as any)).toContain('seat-confirmed');
    expect(component.getSeatVisualClass({ status: 'BLOCKED' } as any)).toContain('seat-blocked');
  });

  it('should expose a readable flight label when flight details load', () => {
    seatService.getSeatMap.and.returnValue(of(seats));

    fixture.detectChanges();

    expect(component.seatMapTitle).toBe('SB101');
    expect(component.seatMapSubtitle).toBe('DEL to BOM');
  });

  it('should warn when continuing without a selected seat', () => {
    component.continue();
    expect(toast.warning).toHaveBeenCalledWith('Please select a seat to continue.');
  });

  it('should redirect guests to login with a booking returnUrl', () => {
    auth.isLoggedIn.and.returnValue(false);
    component.selectedSeat = seats[0];
    component.flightId = 'flight-1';

    component.continue();

    expect(toast.info).toHaveBeenCalledWith('Please sign in or create an account to book this seat.');
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/passenger/booking?flightId=flight-1&seatId=seat-1' }
    });
  });

  it('should navigate logged-in users to booking', () => {
    auth.isLoggedIn.and.returnValue(true);
    component.selectedSeat = seats[0];
    component.flightId = 'flight-1';

    component.continue();

    expect(router.navigate).toHaveBeenCalledWith(['/passenger/booking'], {
      queryParams: { flightId: 'flight-1', seatId: 'seat-1' }
    });
  });

  it('should build the booking returnUrl from the selected seat', () => {
    expect(component.bookingReturnUrl).toBe('/passenger/flights');

    component.selectedSeat = seats[0];
    component.flightId = 'flight-1';
    expect(component.bookingReturnUrl).toBe('/passenger/booking?flightId=flight-1&seatId=seat-1');
  });
});
