import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PaymentService } from '../../../core/services/payment.service';
import { BookingService } from '../../../core/services/booking.service';
import { PassengerService } from '../../../core/services/passenger.service';
import { FlightService } from '../../../core/services/flight.service';
import { SeatService } from '../../../core/services/seat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Booking,
  Flight,
  Passenger,
  PassengerRequest,
  Payment,
  PaymentInitiateResponse,
  PaymentProcessRequest,
  PaymentMode,
  Seat,
} from '../../../models';

type ReturnToBookingContext = {
  flightId: string;
  seatId: string;
};

type PendingPassengerDraft = Omit<PassengerRequest, 'bookingId'>;

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit, OnDestroy {
  bookingId = '';
  booking: Booking | null = null;
  flight: Flight | null = null;
  seat: Seat | null = null;
  passenger: Passenger | null = null;
  payment: Payment | null = null;
  loadingBooking = true;
  processingPayment = false;
  generatingTicket = false;
  bookingError = '';
  ticketReady = false;
  autoStart = false;
  checkoutTriggered = false;
  holdingSeat = false;
  selectedPaymentMode: PaymentMode = 'UPI';
  returnToBooking: ReturnToBookingContext | null = null;
  holdReference = '';
  private paymentCompleted = false;
  private releasedSeatId = '';
  readonly paymentModes: Array<{ value: PaymentMode; label: string; caption: string }> = [
    { value: 'CARD', label: 'Card', caption: 'Credit, debit, and RuPay cards' },
    { value: 'UPI', label: 'UPI', caption: 'Fast payment via any UPI app' },
    { value: 'NETBANKING', label: 'Netbanking', caption: 'Direct payment from bank accounts' },
    { value: 'WALLET', label: 'Wallet', caption: 'Supported prepaid wallets' },
  ];
  readonly brandColor = '#12cfe3';

  constructor(
    private ngZone: NgZone,
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private bookingService: BookingService,
    private passengerService: PassengerService,
    private flightService: FlightService,
    private seatService: SeatService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const state = this.readNavigationState();
    this.autoStart = state.autoStart;
    this.returnToBooking = state.returnToBooking;
    this.selectedPaymentMode = state.selectedPaymentMode;
    this.holdReference = state.holdReference;

    this.route.paramMap.subscribe(params => {
      const routeBookingId = String(
        params.get('bookingId') || this.route.snapshot.queryParamMap.get('bookingId') || state.booking?.bookingId || ''
      ).trim();

      this.bookingId = routeBookingId;

      if (state.booking && state.booking.bookingId === routeBookingId) {
        this.booking = state.booking;
        this.loadingBooking = false;
        this.handleResolvedBooking();
        return;
      }

      this.loadBooking();
    });
  }

  ngOnDestroy(): void {
    if (this.paymentCompleted) return;
    this.releaseHeldSeat();
  }

  loadBooking(): void {
    if (!this.bookingId) {
      this.bookingError = 'Booking ID is missing. Please return to the booking page and try again.';
      this.autoStart = false;
      this.loadingBooking = false;
      return;
    }

    this.loadingBooking = true;
    this.bookingError = '';

    this.bookingService.getBookingById(this.bookingId)
      .pipe(finalize(() => { this.loadingBooking = false; }))
      .subscribe({
        next: booking => {
          this.booking = booking;
          this.handleResolvedBooking();
        },
        error: () => {
          this.booking = null;
          this.bookingError = 'We could not load this booking right now.';
          this.autoStart = false;
        }
      });
  }

  payNow(): void {
    if (!this.booking) {
      this.toast.error('Booking details are not available yet.');
      return;
    }

    if (this.booking.status === 'CONFIRMED' || this.booking.status === 'COMPLETED') {
      this.toast.info('This booking is already confirmed.');
      return;
    }

    if (!this.auth.getUserIdValue()) {
      this.toast.error('Please log in again before making the payment.');
      return;
    }

    this.startPaymentCheckout();
  }

  private startPaymentCheckout(): void {
    if (!this.booking) return;

    if (!window.Razorpay) {
      this.handleFailedPaymentFlow('Razorpay checkout is not available right now. Please try again.');
      return;
    }

    this.processingPayment = true;
    this.checkoutTriggered = true;
    this.paymentService.initiatePayment({
      bookingId: this.booking.bookingId,
      userId: this.auth.getUserIdValue(),
      amount: this.booking.totalFare,
      currency: 'INR',
      paymentMode: this.selectedPaymentMode,
      contactEmail: this.booking.contactEmail,
    }).subscribe({
      next: paymentResponse => {
        this.payment = paymentResponse;
        this.openRazorpayCheckout(paymentResponse);
      },
      error: () => {
        this.processingPayment = false;
        this.checkoutTriggered = false;
      }
    });
  }

  goToMyBookings(): void {
    this.router.navigate(['/passenger/my-bookings']);
  }

  bookAnotherFlight(): void {
    this.router.navigate(['/passenger/flights']);
  }

  printTicket(): void {
    window.print();
  }

  get seatNumber(): string {
    return this.seat?.seatNumber || this.booking?.seatId || '--';
  }

  private handleResolvedBooking(): void {
    if (!this.booking) return;

    if (this.booking.status === 'CONFIRMED' || this.booking.status === 'COMPLETED') {
      this.paymentCompleted = true;
      this.clearStoredHoldReference();
    }

    if (!this.returnToBooking) {
      this.returnToBooking = {
        flightId: this.booking.flightId,
        seatId: this.booking.seatId,
      };
    }

    this.loadFlightDetails();
    this.loadSeatDetails();

    if (this.autoStart && this.booking.status !== 'PENDING') {
      this.autoStart = false;
    }

    this.maybeAutoStartPayment();
  }

  private openRazorpayCheckout(paymentResponse: PaymentInitiateResponse): void {
    const options: RazorpayOptions = {
      key: paymentResponse.razorpayKey,
      amount: this.resolveCheckoutAmount(paymentResponse),
      currency: paymentResponse.currency,
      order_id: paymentResponse.razorpayOrderId,
      name: 'SkyBooker',
      description: 'Flight Ticket Booking Payment',
      handler: (response: RazorpaySuccessResponse) => {
        this.ngZone.run(() => {
          this.handlePaymentSuccess(response, paymentResponse);
        });
      },
      prefill: {
        email: this.booking?.contactEmail || '',
        contact: this.booking?.contactPhone || '',
      },
      notes: {
        bookingId: paymentResponse.bookingId,
        paymentId: paymentResponse.paymentId,
        paymentMode: String(paymentResponse.paymentMode || this.selectedPaymentMode),
      },
      theme: {
        color: this.brandColor,
      },
      modal: {
        ondismiss: () => {
          this.ngZone.run(() => {
            this.handleFailedPaymentFlow('Payment was cancelled. Redirecting you back to travel preferences.');
          });
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on('payment.failed', (failure) => {
      this.ngZone.run(() => {
        const message = failure.error?.description || 'Payment failed. Redirecting you back to travel preferences.';
        this.handleFailedPaymentFlow(message);
      });
    });

    razorpay.open();
  }

  private handlePaymentSuccess(
    response: RazorpaySuccessResponse,
    paymentResponse: PaymentInitiateResponse
  ): void {
    const processPayload: PaymentProcessRequest = {
      paymentId: paymentResponse.paymentId,
      razorpayOrderId: response.razorpay_order_id || paymentResponse.razorpayOrderId,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
      gatewayResponse: JSON.stringify({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id || paymentResponse.razorpayOrderId,
        razorpay_signature: response.razorpay_signature,
      }),
      success: true,
    };

    this.paymentService.processPayment(processPayload).subscribe({
      next: processedPayment => {
        this.payment = processedPayment;
        this.verifyPaidStatusAndGenerateTicket(processedPayment);
      },
      error: () => {
        this.handleFailedPaymentFlow('Payment verification failed. Redirecting you back to travel preferences.');
      }
    });
  }

  private verifyPaidStatusAndGenerateTicket(processedPayment: Payment): void {
    if (processedPayment.status === 'PAID') {
      this.confirmSeatAndGenerateTicket();
      return;
    }

    this.paymentService.getPaymentStatus(processedPayment.paymentId).subscribe({
      next: latestPayment => {
        this.payment = latestPayment;

        if (latestPayment.status === 'PAID') {
          this.confirmSeatAndGenerateTicket();
          return;
        }

        this.handleFailedPaymentFlow('Payment is not marked as PAID yet. Redirecting you back to travel preferences.');
      },
      error: () => {
        this.handleFailedPaymentFlow('Unable to confirm payment status. Redirecting you back to travel preferences.');
      }
    });
  }

  private generateTicket(): void {
    const passengerRequest = this.buildPassengerRequest();
    if (!passengerRequest) {
      this.processingPayment = false;
      this.generatingTicket = false;
      this.toast.warning('Payment succeeded, but passenger details were missing for ticket generation.');
      this.goToMyBookings();
      return;
    }

    this.generatingTicket = true;
    this.passengerService.createPassenger(passengerRequest).subscribe({
      next: passenger => {
        this.passenger = passenger;
        this.generatingTicket = false;
        this.processingPayment = false;
        this.ticketReady = true;
        this.autoStart = false;

        if (this.booking) {
          this.booking = { ...this.booking, status: 'CONFIRMED' };
        }

        this.clearStoredHoldReference();
        this.clearStoredDrafts();
        this.toast.success(`Payment successful. Ticket ${passenger.ticketNumber} generated.`);
      },
      error: () => {
        this.generatingTicket = false;
        this.processingPayment = false;
        this.toast.warning('Payment succeeded, but the ticket could not be generated right now.');
        this.goToMyBookings();
      }
    });
  }

  private handleFailedPaymentFlow(message: string): void {
    this.processingPayment = false;
    this.generatingTicket = false;
    this.checkoutTriggered = false;
    window.alert(message);
    this.releaseHeldSeat();

    const fallback = this.returnToBooking || (this.booking ? {
      flightId: this.booking.flightId,
      seatId: this.booking.seatId,
    } : null);

    if (!fallback) {
      this.goToMyBookings();
      return;
    }

    this.router.navigate(['/passenger/booking'], {
      queryParams: {
        flightId: fallback.flightId,
        seatId: fallback.seatId,
      },
      state: {
        paymentFailed: true,
        retryBooking: this.booking,
      }
    });
  }

  private loadFlightDetails(): void {
    if (!this.booking?.flightId) return;

    this.flightService.getFlightById(this.booking.flightId).subscribe({
      next: flight => {
        this.flight = flight;
      },
      error: () => {}
    });
  }

  private loadSeatDetails(): void {
    if (!this.booking?.flightId || !this.booking?.seatId) return;

    this.seatService.getSeatMap(this.booking.flightId).subscribe({
      next: seats => {
        this.seat = seats.find(seat => seat.seatId === this.booking?.seatId) || null;
      },
      error: () => {
        this.seat = null;
      }
    });
  }

  private resolveCheckoutAmount(paymentResponse: PaymentInitiateResponse): number {
    const amount = Number(paymentResponse.amount || 0);

    // The initiate API example returns the booking fare in rupees.
    // If your backend already returns Razorpay subunits, remove the * 100 here.
    return Math.round(amount * 100);
  }

  private buildPassengerRequest(): PassengerRequest | null {
    if (!this.booking) return null;

    const rawDraft = sessionStorage.getItem(`pending-passenger:${this.booking.bookingId}`);
    if (!rawDraft) return null;

    try {
      const draft = JSON.parse(rawDraft) as PendingPassengerDraft;

      return {
        bookingId: this.booking.bookingId,
        seatId: this.booking.seatId,
        firstName: draft.firstName || '',
        lastName: draft.lastName || '',
        dateOfBirth: draft.dateOfBirth || '',
        gender: draft.gender || 'MALE',
        passportNumber: draft.passportNumber || '',
        nationality: draft.nationality || '',
      };
    } catch {
      return null;
    }
  }

  private clearStoredDrafts(): void {
    if (!this.booking) return;

    sessionStorage.removeItem(`pending-passenger:${this.booking.bookingId}`);

    if (this.returnToBooking) {
      sessionStorage.removeItem(`booking-form:${this.returnToBooking.flightId}:${this.returnToBooking.seatId}`);
    }
  }

  private readNavigationState(): {
    booking: Booking | null;
    autoStart: boolean;
    returnToBooking: ReturnToBookingContext | null;
    selectedPaymentMode: PaymentMode;
    holdReference: string;
  } {
    const state = this.router.getCurrentNavigation()?.extras.state || history.state || {};

    return {
      booking: (state['booking'] as Booking | undefined) || null,
      autoStart: Boolean(state['autoStart']),
      returnToBooking: (state['returnToBooking'] as ReturnToBookingContext | undefined) || null,
      selectedPaymentMode: (state['selectedPaymentMode'] as PaymentMode | undefined) || 'UPI',
      holdReference: String(state['holdReference'] || '').trim(),
    };
  }

  private releaseHeldSeat(): void {
    const seatId = this.booking?.seatId || this.returnToBooking?.seatId || '';
    if (!seatId || !this.holdReference || this.releasedSeatId === seatId) return;

    this.releasedSeatId = seatId;
    const holdReference = this.holdReference;
    this.clearStoredHoldReference();
    this.seatService.releaseSeat(seatId, holdReference).subscribe({ error: () => {} });
  }

  private maybeAutoStartPayment(): void {
    if (this.holdingSeat) return;

    if (this.autoStart && !this.ticketReady && !this.checkoutTriggered && this.booking?.status === 'PENDING') {
      queueMicrotask(() => this.payNow());
    }
  }

  private confirmSeatAndGenerateTicket(): void {
    if (!this.booking?.seatId || !this.holdReference) {
      this.paymentCompleted = true;
      this.generateTicket();
      return;
    }

    this.paymentCompleted = true;
    this.seatService.confirmSeat(this.booking.seatId, this.holdReference).subscribe({
      next: seat => {
        this.seat = seat;
        this.generateTicket();
      },
      error: () => {
        this.clearStoredHoldReference();
        this.processingPayment = false;
        this.generatingTicket = false;
        this.toast.warning('Payment succeeded, but the seat confirmation could not be completed right now.');
        this.goToMyBookings();
      }
    });
  }

  private clearStoredHoldReference(): void {
    if (!this.booking) return;

    sessionStorage.removeItem(this.getBookingHoldKey(this.booking.bookingId));
    sessionStorage.removeItem(this.getSeatHoldKey(this.booking.flightId, this.booking.seatId));
  }

  private getBookingHoldKey(bookingId: string): string {
    return `seat-hold-booking:${bookingId}`;
  }

  private getSeatHoldKey(flightId: string, seatId: string): string {
    return `seat-hold:${flightId}:${seatId}`;
  }

  private createHoldReference(): string {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `hold-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private navigateBackToBooking(): void {
    const fallback = this.returnToBooking || (this.booking ? {
      flightId: this.booking.flightId,
      seatId: this.booking.seatId,
    } : null);

    if (!fallback) {
      this.goToMyBookings();
      return;
    }

    this.router.navigate(['/passenger/booking'], {
      queryParams: {
        flightId: fallback.flightId,
        seatId: fallback.seatId,
      },
      state: {
        paymentFailed: true,
        retryBooking: this.booking,
      }
    });
  }

}
