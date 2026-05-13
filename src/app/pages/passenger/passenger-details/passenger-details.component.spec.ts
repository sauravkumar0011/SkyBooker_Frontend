import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PassengerService } from '../../../core/services/passenger.service';
import { ToastService } from '../../../core/services/toast.service';
import { PassengerDetailsComponent } from './passenger-details.component';

describe('PassengerDetailsComponent', () => {
  let component: PassengerDetailsComponent;
  let fixture: ComponentFixture<PassengerDetailsComponent>;
  let passengerService: jasmine.SpyObj<PassengerService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;
  let queryParams$: Subject<Record<string, string>>;

  beforeEach(async () => {
    passengerService = jasmine.createSpyObj<PassengerService>('PassengerService', ['createPassenger']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'warning', 'info']);
    queryParams$ = new Subject<Record<string, string>>();

    await TestBed.configureTestingModule({
      declarations: [PassengerDetailsComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: PassengerService, useValue: passengerService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: jasmine.createSpyObj<AuthService>('AuthService', ['getUserIdValue']) },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$.asObservable() } },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PassengerDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should read booking and seat ids from route params', () => {
    queryParams$.next({ bookingId: 'booking-1', seatId: 'seat-1' });

    expect(component.bookingId).toBe('booking-1');
    expect(component.seatId).toBe('seat-1');
  });

  it('should mark the form touched when submitting invalid data', () => {
    spyOn(component.form, 'markAllAsTouched');

    component.onSubmit();

    expect(component.form.markAllAsTouched).toHaveBeenCalled();
    expect(passengerService.createPassenger).not.toHaveBeenCalled();
  });

  it('should create a passenger and show the generated ticket number', () => {
    queryParams$.next({ bookingId: 'booking-1', seatId: 'seat-1' });
    passengerService.createPassenger.and.returnValue(of({ ticketNumber: 'TKT-1' } as any));
    component.form.setValue({
      firstName: 'Sky',
      lastName: 'Traveler',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      passportNumber: 'P1234567',
      nationality: 'Indian',
    });

    component.onSubmit();

    expect(passengerService.createPassenger).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      seatId: 'seat-1',
      firstName: 'Sky',
      lastName: 'Traveler',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      passportNumber: 'P1234567',
      nationality: 'Indian',
    });
    expect(component.passenger).toEqual({ ticketNumber: 'TKT-1' } as any);
    expect(toast.success).toHaveBeenCalledWith('Ticket TKT-1 generated!');
    expect(component.loading).toBeFalse();
  });

  it('should reset loading when passenger creation fails', () => {
    queryParams$.next({ bookingId: 'booking-1', seatId: 'seat-1' });
    passengerService.createPassenger.and.returnValue(throwError(() => new Error('create failed')));
    component.form.setValue({
      firstName: 'Sky',
      lastName: 'Traveler',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      passportNumber: 'P1234567',
      nationality: 'Indian',
    });

    component.onSubmit();

    expect(component.loading).toBeFalse();
  });

  it('should navigate to the payment page for the current booking', () => {
    component.bookingId = 'booking-1';
    component.goToPayment();

    expect(router.navigate).toHaveBeenCalledWith(['/passenger/payment', 'booking-1']);
  });
});
