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
  BookingRequest,
  FareSummaryResponse,
  Flight,
  Passenger,
  Payment,
  PaymentInitiateResponse,
  PaymentMode,
  PaymentProcessRequest,
  Seat,
} from '../../../models';

type ReturnToBookingContext = {
  flightId: string;
  seatIds: string[];
};

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
  passengers: Passenger[] = [];
  selectedSeats: Seat[] = [];
  fareSummary: FareSummaryResponse | null = null;
  payment: Payment | null = null;
  loadingBooking = true;
  processingPayment = false;
  generatingTicket = false;
  bookingError = '';
  ticketReady = false;
  autoStart = false;
  checkoutTriggered = false;
  selectedPaymentMode: PaymentMode = 'UPI';
  returnToBooking: ReturnToBookingContext | null = null;
  private paymentCompleted = false;
  private cancellationTriggered = false;
  private razorpayInstance: RazorpayInstance | null = null;
  private closingRazorpayProgrammatically = false;
  private pendingRazorpayFailureMessage: string | null = null;
  private pendingRazorpayFailure: RazorpayFailureResponse | null = null;
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
    if (this.paymentCompleted || this.ticketReady) return;
    this.cancelPendingBookingOnExit();
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
    return this.seat?.seatNumber || this.getPrimarySeatId(this.booking) || '--';
  }

  get passengerCount(): number {
    return this.passengers.length || this.booking?.totalPassengers || 0;
  }

  get routeCode(): string {
    if (!this.flight) return '--';
    return `${this.flight.originAirportCode}-${this.flight.destinationAirportCode}`;
  }

  get airlineDisplayName(): string {
    return this.flight?.airlineId || 'SkyBooker';
  }

  get checkedBaggageLabel(): string {
    return `${this.booking?.luggageKg || 0} KG`;
  }

  get cabinBaggageLabel(): string {
    return '7 KG';
  }

  get mealLabel(): string {
    return this.booking?.mealPreference?.replace(/_/g, ' ') || 'Standard';
  }

  get luggageFooterNote(): string {
    return `Checked baggage allowance is ${this.checkedBaggageLabel} and cabin baggage allowance is ${this.cabinBaggageLabel}.`;
  }

  get flightDateLabel(): string {
    return this.formatDate(this.flight?.departureTime, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  get bookingDateLabel(): string {
    return this.formatDate(this.booking?.bookedAt, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  get bookingTimeLabel(): string {
    return this.formatTime(this.booking?.bookedAt);
  }

  get departureTimeLabel(): string {
    return this.formatTime(this.flight?.departureTime);
  }

  get arrivalTimeLabel(): string {
    return this.formatTime(this.flight?.arrivalTime);
  }

  get journeyDurationLabel(): string {
    if (!this.flight?.departureTime || !this.flight?.arrivalTime) return '--';

    const departure = new Date(this.flight.departureTime).getTime();
    const arrival = new Date(this.flight.arrivalTime).getTime();
    const diffMinutes = Math.max(0, Math.round((arrival - departure) / 60000));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }

  private handleResolvedBooking(): void {
    if (!this.booking) return;

    if (this.booking.status === 'CONFIRMED' || this.booking.status === 'COMPLETED') {
      this.paymentCompleted = true;
      this.ticketReady = true;
      this.clearStoredDrafts();
    }

    if (!this.returnToBooking) {
      this.returnToBooking = {
        flightId: this.booking.flightId,
        seatIds: [...(this.booking.seatIds || [])],
      };
    }

    this.loadFlightDetails();
    this.loadSeatDetails();
    this.loadPassengers();
    this.loadFareSummary();

    if (this.autoStart && this.booking.status !== 'PENDING') {
      this.autoStart = false;
    }

    this.maybeAutoStartPayment();
  }

  private startPaymentCheckout(): void {
    if (!this.booking) return;

    if (!window.Razorpay) {
      this.handleFailedPaymentFlow('Razorpay checkout is not available right now.');
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
        this.handleFailedPaymentFlow('Unable to initiate payment.');
      }
    });
  }

  private openRazorpayCheckout(paymentResponse: PaymentInitiateResponse): void {
    this.closingRazorpayProgrammatically = false;
    this.pendingRazorpayFailureMessage = null;
    this.pendingRazorpayFailure = null;

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
            if (this.closingRazorpayProgrammatically) {
              this.closingRazorpayProgrammatically = false;
              this.razorpayInstance = null;
              return;
            }

            this.razorpayInstance = null;
            const message = this.pendingRazorpayFailureMessage || 'Payment was cancelled.';
            this.pendingRazorpayFailureMessage = null;
            this.handleFailedPaymentFlow(message);
          });
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    this.razorpayInstance = razorpay;

    razorpay.on('payment.failed', (failure) => {
      this.ngZone.run(() => {
        this.pendingRazorpayFailure = failure;
        this.pendingRazorpayFailureMessage =
          failure.error?.description || 'Payment failed. Please try again.';
      });
    });

    razorpay.open();
  }

  private handlePaymentSuccess(
    response: RazorpaySuccessResponse,
    paymentResponse: PaymentInitiateResponse
  ): void {
    this.razorpayInstance = null;
    this.pendingRazorpayFailureMessage = null;
    this.pendingRazorpayFailure = null;
    this.generatingTicket = true;
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

        if (processedPayment.status === 'PAID') {
          this.finalizeSuccessfulBooking();
          return;
        }

        this.handleFailedPaymentFlow('Payment could not be confirmed.');
      },
      error: () => {
        this.resolvePaymentOutcomeAfterError();
      }
    });
  }

  private handleFailedPaymentFlow(_message: string): void {
    this.processingPayment = false;
    this.generatingTicket = false;
    this.checkoutTriggered = false;

    this.processFailedPaymentIfNeeded(shouldCancelBooking => {
      this.pendingRazorpayFailureMessage = null;

      if (shouldCancelBooking) {
        this.cancelPendingBooking(() => {
          this.toast.warning('Payment failed. Redirecting to flight search.');
          this.router.navigate(['/passenger/flights']);
        });
        return;
      }

      this.toast.warning('Payment failed. Redirecting to flight search.');
      this.router.navigate(['/passenger/flights']);
    });
  }

  private processFailedPaymentIfNeeded(onComplete: (shouldCancelBooking: boolean) => void): void {
    if (!this.payment?.paymentId || !this.pendingRazorpayFailure) {
      this.pendingRazorpayFailure = null;
      onComplete(true);
      return;
    }

    const failure = this.pendingRazorpayFailure;
    this.pendingRazorpayFailure = null;

    const processPayload: PaymentProcessRequest = {
      paymentId: this.payment.paymentId,
      razorpayOrderId: failure.error?.metadata?.order_id || this.payment.razorpayOrderId || '',
      razorpayPaymentId: failure.error?.metadata?.payment_id || '',
      razorpaySignature: '',
      gatewayResponse: JSON.stringify(failure),
      success: false,
    };

    this.paymentService.processPayment(processPayload, {
      suppressHandledErrorToast: true,
    }).subscribe({
      next: processedPayment => {
        this.payment = processedPayment;
        this.cancellationTriggered = true;
        if (this.booking) {
          this.booking = { ...this.booking, status: 'CANCELLED' };
        }
        onComplete(false);
      },
      error: () => {
        onComplete(true);
      }
    });
  }

  private resolvePaymentOutcomeAfterError(): void {
    if (!this.booking) {
      this.handleFailedPaymentFlow('Payment verification failed.');
      return;
    }

    this.bookingService.getBookingById(this.booking.bookingId).subscribe({
      next: booking => {
        if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
          this.booking = booking;
          this.finalizeSuccessfulBooking(false);
          return;
        }

        this.handleFailedPaymentFlow('Payment verification failed.');
      },
      error: () => {
        this.handleFailedPaymentFlow('Payment verification failed.');
      }
    });
  }

  private finalizeSuccessfulBooking(showToast = true): void {
    if (!this.booking) return;

    this.paymentCompleted = true;
    this.ticketReady = true;
    this.autoStart = false;
    this.processingPayment = false;
    this.generatingTicket = false;
    this.checkoutTriggered = false;
    this.cancellationTriggered = false;

    this.bookingService.getBookingById(this.booking.bookingId).subscribe({
      next: booking => {
        this.booking = booking;
        this.loadSeatDetails();
      },
      error: () => {
        if (this.booking) {
          this.booking = { ...this.booking, status: 'CONFIRMED' };
        }
      }
    });

    this.loadPassengers();
    this.clearStoredDrafts();

    if (showToast) {
      this.toast.success('Payment successful. Your booking is confirmed.');
    }
  }

  private cancelPendingBookingOnExit(): void {
    if (!this.booking || this.booking.status !== 'PENDING') return;
    this.cancelPendingBooking();
  }

  private cancelPendingBooking(onDone?: () => void): void {
    if (!this.booking || this.booking.status !== 'PENDING' || this.cancellationTriggered) {
      onDone?.();
      return;
    }

    this.cancellationTriggered = true;
    this.bookingService.cancelBooking(this.booking.bookingId).subscribe({
      next: cancelledBooking => {
        this.booking = cancelledBooking;
        onDone?.();
      },
      error: () => {
        onDone?.();
      }
    });
  }

  private closeRazorpayCheckout(): void {
    if (!this.razorpayInstance) return;

    this.closingRazorpayProgrammatically = true;
    this.razorpayInstance.close();
    this.razorpayInstance = null;
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
    if (!this.booking?.flightId) return;

    const seatIds = this.getSeatIdsForBooking(this.booking);
    if (!seatIds.length) {
      this.seat = null;
      this.selectedSeats = [];
      return;
    }

    this.seatService.getSeatMap(this.booking.flightId).subscribe({
      next: seats => {
        this.selectedSeats = seats.filter(seat => seatIds.includes(seat.seatId));
        this.seat = this.selectedSeats[0] || null;
      },
      error: () => {
        this.seat = null;
        this.selectedSeats = [];
      }
    });
  }

  private loadPassengers(): void {
    if (!this.booking?.bookingId) return;

    this.passengerService.getPassengersByBooking(this.booking.bookingId).subscribe({
      next: passengers => {
        this.passengers = passengers;
        this.passenger = passengers[0] || null;
      },
      error: () => {
        this.passengers = [];
        this.passenger = null;
      }
    });
  }

  private loadFareSummary(): void {
    if (!this.booking) {
      this.fareSummary = null;
      return;
    }

    const payload: BookingRequest = {
      userId: this.booking.userId || this.auth.getUserIdValue(),
      flightId: this.booking.flightId,
      seatIds: this.getSeatIdsForBooking(this.booking),
      tripType: this.booking.tripType,
      mealPreference: this.booking.mealPreference,
      luggageKg: this.booking.luggageKg,
      contactEmail: this.booking.contactEmail,
      contactPhone: this.booking.contactPhone,
    };

    if (!payload.flightId || !payload.seatIds.length) {
      this.fareSummary = null;
      return;
    }

    this.bookingService.calculateFare(payload).subscribe({
      next: fareSummary => {
        this.fareSummary = this.normalizeFareSummary(fareSummary);
      },
      error: () => {
        this.fareSummary = null;
      }
    });
  }

  private resolveCheckoutAmount(paymentResponse: PaymentInitiateResponse): number {
    const amount = Number(paymentResponse.amount || 0);
    return Math.round(amount * 100);
  }

  private clearStoredDrafts(): void {
    if (!this.booking) return;

    if (this.returnToBooking) {
      const draftKey = `booking-form:${this.returnToBooking.flightId}:${this.returnToBooking.seatIds.join(',')}`;
      sessionStorage.removeItem(draftKey);

      if (this.returnToBooking.seatIds.length === 1) {
        sessionStorage.removeItem(`booking-form:${this.returnToBooking.flightId}:${this.returnToBooking.seatIds[0]}`);
      }
    }
  }

  private readNavigationState(): {
    booking: Booking | null;
    autoStart: boolean;
    returnToBooking: ReturnToBookingContext | null;
    selectedPaymentMode: PaymentMode;
  } {
    const state = this.router.getCurrentNavigation()?.extras.state || history.state || {};
    const rawReturnToBooking = state['returnToBooking'] as
      | { flightId?: string; seatIds?: string[]; seatId?: string }
      | undefined;
    const normalizedReturnToBooking = rawReturnToBooking?.flightId
      ? {
          flightId: rawReturnToBooking.flightId,
          seatIds: Array.isArray(rawReturnToBooking.seatIds) && rawReturnToBooking.seatIds.length
            ? rawReturnToBooking.seatIds
            : rawReturnToBooking.seatId
              ? [rawReturnToBooking.seatId]
              : [],
        }
      : null;

    return {
      booking: (state['booking'] as Booking | undefined) || null,
      autoStart: Boolean(state['autoStart']),
      returnToBooking: normalizedReturnToBooking,
      selectedPaymentMode: (state['selectedPaymentMode'] as PaymentMode | undefined) || 'UPI',
    };
  }

  private maybeAutoStartPayment(): void {
    if (this.autoStart && !this.ticketReady && !this.checkoutTriggered && this.booking?.status === 'PENDING') {
      queueMicrotask(() => this.payNow());
    }
  }

  getSeatNumberForPassenger(passenger: Passenger, index: number): string {
    const matchingSeat = this.selectedSeats.find(seat => seat.seatId === passenger.seatId);
    return matchingSeat?.seatNumber || this.selectedSeats[index]?.seatNumber || passenger.seatId || '--';
  }

  private formatDate(value?: string, options?: Intl.DateTimeFormatOptions): string {
    if (!value) return '--';

    return new Intl.DateTimeFormat('en-IN', options || {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private formatTime(value?: string): string {
    if (!value) return '--';

    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(value));
  }

  private normalizeFareSummary(fareSummary: Partial<FareSummaryResponse> & { luggageCharge?: number } | null | undefined): FareSummaryResponse {
    return {
      seatIds: fareSummary?.seatIds || [],
      baseFare: Number(fareSummary?.baseFare || 0),
      taxes: Number(fareSummary?.taxes || 0),
      baggageCharge: Number(fareSummary?.baggageCharge ?? fareSummary?.luggageCharge ?? 0),
      mealCharge: Number(fareSummary?.mealCharge || 0),
      totalFare: Number(fareSummary?.totalFare || 0),
      totalPassengers: Number(fareSummary?.totalPassengers || this.booking?.totalPassengers || this.passengerCount || 0),
    };
  }

  private getSeatIdsForBooking(booking: Booking | null): string[] {
    if (!booking) return [];

    const seatIds = Array.isArray(booking.seatIds) ? booking.seatIds.filter(Boolean) : [];
    if (seatIds.length) return seatIds;

    const fallbackSeatId = String((booking as Booking & { seatId?: string }).seatId || '').trim();
    return fallbackSeatId ? [fallbackSeatId] : [];
  }

  private getPrimarySeatId(booking: Booking | null): string {
    return this.getSeatIdsForBooking(booking)[0] || '';
  }
}
