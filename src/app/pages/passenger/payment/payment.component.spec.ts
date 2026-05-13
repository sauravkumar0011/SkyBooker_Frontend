import { TestBed } from '@angular/core/testing';
import { PassengerService } from 'src/app/core/services/passenger.service';
import { SeatService } from 'src/app/core/services/seat.service';
import { PaymentComponent } from './payment.component';
import { ComponentTestContext, configureComponentTest, createComponentTestContext } from 'src/app/testing/component-test-helpers';

describe('PaymentComponent', () => {
  const holdReference = 'hold-ref-1';
  let context: ComponentTestContext;

  beforeEach(async () => {
    history.replaceState({}, '');
    sessionStorage.clear();
    context = createComponentTestContext();
    await configureComponentTest(PaymentComponent, context);
  });

  afterEach(() => {
    history.replaceState({}, '');
    sessionStorage.clear();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PaymentComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should confirm the held seat before generating the ticket after payment succeeds', () => {
    sessionStorage.setItem('pending-passenger:booking-1', JSON.stringify({
      seatId: 'seat-1',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      passportNumber: 'P1234567',
      nationality: 'INDIAN',
    }));
    history.replaceState({
      booking: {
        bookingId: 'booking-1',
        userId: 'user-1',
        flightId: 'flight-1',
        seatId: 'seat-1',
        totalFare: 6372,
        status: 'PENDING',
        contactEmail: 'user@example.com',
        contactPhone: '+911234567890',
      },
      holdReference,
    }, '');

    const fixture = TestBed.createComponent(PaymentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const seatService = TestBed.inject(SeatService) as jasmine.SpyObj<SeatService>;
    const passengerService = TestBed.inject(PassengerService) as jasmine.SpyObj<PassengerService>;

    (component as any).confirmSeatAndGenerateTicket();

    expect(seatService.confirmSeat).toHaveBeenCalledWith('seat-1', holdReference);
    expect(passengerService.createPassenger).toHaveBeenCalled();
  });
});
