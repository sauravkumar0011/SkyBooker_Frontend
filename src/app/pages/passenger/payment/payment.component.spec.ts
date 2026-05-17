import { TestBed } from '@angular/core/testing';
import { BookingService } from 'src/app/core/services/booking.service';
import { PassengerService } from 'src/app/core/services/passenger.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PaymentService } from 'src/app/core/services/payment.service';
import { SeatService } from 'src/app/core/services/seat.service';
import { ToastService } from 'src/app/core/services/toast.service';
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

  it('should confirm the booking and generate the ticket after payment succeeds', () => {
    sessionStorage.setItem('pending-passenger:booking-1', JSON.stringify({
      seatId: 'seat-1',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      passportNumber: 'P1234567',
      nationality: 'INDIAN',
    }));
    sessionStorage.setItem('seat-hold-booking:booking-1', holdReference);
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
    }, '');

    const fixture = TestBed.createComponent(PaymentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const bookingService = TestBed.inject(BookingService) as jasmine.SpyObj<BookingService>;
    const seatService = TestBed.inject(SeatService) as jasmine.SpyObj<SeatService>;
    const passengerService = TestBed.inject(PassengerService) as jasmine.SpyObj<PassengerService>;

    (component as any).confirmBookingAndGenerateTicket();

    expect(bookingService.confirmBooking).toHaveBeenCalledWith('booking-1', {
      suppressHandledErrorToast: true,
    });
    expect(seatService.confirmSeat).not.toHaveBeenCalled();
    expect(passengerService.createPassenger).toHaveBeenCalled();
  });

  it('should continue ticket generation when confirm booking reports the booking is already confirmed', () => {
    sessionStorage.setItem('pending-passenger:booking-1', JSON.stringify({
      seatId: 'seat-1',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      passportNumber: 'P1234567',
      nationality: 'INDIAN',
    }));
    sessionStorage.setItem('seat-hold-booking:booking-1', holdReference);
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
    }, '');

    const fixture = TestBed.createComponent(PaymentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const bookingService = TestBed.inject(BookingService) as jasmine.SpyObj<BookingService>;
    const passengerService = TestBed.inject(PassengerService) as jasmine.SpyObj<PassengerService>;
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    bookingService.confirmBooking.and.returnValue(throwError(() => new Error('Only pending bookings can be confirmed')));
    bookingService.getBookingById.and.returnValue(of({
      bookingId: 'booking-1',
      userId: 'user-1',
      flightId: 'flight-1',
      seatId: 'seat-1',
      totalFare: 6372,
      status: 'CONFIRMED',
      contactEmail: 'user@example.com',
      contactPhone: '+911234567890',
    } as never));

    (component as any).confirmBookingAndGenerateTicket();

    expect(bookingService.confirmBooking).toHaveBeenCalledWith('booking-1', {
      suppressHandledErrorToast: true,
    });
    expect(bookingService.getBookingById).toHaveBeenCalledWith('booking-1');
    expect(passengerService.createPassenger).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalledWith(['/passenger/flights']);
  });

  it('should release the held seat and redirect to flight search after payment failure', () => {
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
    }, '');
    sessionStorage.setItem('seat-hold-booking:booking-1', holdReference);

    const fixture = TestBed.createComponent(PaymentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const seatService = TestBed.inject(SeatService) as jasmine.SpyObj<SeatService>;
    const router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    const toast = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;

    (component as any).handleFailedPaymentFlow('Payment failed.');

    expect(toast.warning).toHaveBeenCalledWith('Payment failed. Redirecting to flight search.');
    expect(seatService.releaseSeat).toHaveBeenCalledWith('seat-1', holdReference, {
      suppressHandledErrorToast: true,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/passenger/flights']);
  });

  it('should mark the initiated payment as failed before redirecting after a Razorpay failure', () => {
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
    }, '');
    sessionStorage.setItem('seat-hold-booking:booking-1', holdReference);

    const fixture = TestBed.createComponent(PaymentComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const paymentService = TestBed.inject(PaymentService) as jasmine.SpyObj<PaymentService>;
    const seatService = TestBed.inject(SeatService) as jasmine.SpyObj<SeatService>;

    (component as any).payment = {
      paymentId: 'payment-1',
      bookingId: 'booking-1',
      razorpayOrderId: 'order-1',
      status: 'PENDING',
    };
    (component as any).pendingRazorpayFailure = {
      error: {
        description: 'Declined by bank',
        metadata: {
          order_id: 'order-1',
          payment_id: 'pay-failed-1',
        },
      },
    } as RazorpayFailureResponse;

    (component as any).handleFailedPaymentFlow('Declined by bank');

    expect(paymentService.processPayment).toHaveBeenCalledWith(jasmine.objectContaining({
      paymentId: 'payment-1',
      razorpayOrderId: 'order-1',
      razorpayPaymentId: 'pay-failed-1',
      razorpaySignature: '',
      success: false,
    }), {
      suppressHandledErrorToast: true,
    });

    const payload = paymentService.processPayment.calls.mostRecent().args[0];
    expect(JSON.parse(payload.gatewayResponse)).toEqual(jasmine.objectContaining({
      error: jasmine.objectContaining({
        description: 'Declined by bank',
      }),
    }));
    expect(seatService.releaseSeat).toHaveBeenCalledWith('seat-1', holdReference, {
      suppressHandledErrorToast: true,
    });
  });
});
