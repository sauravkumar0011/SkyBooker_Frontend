import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { FlightService } from '../../../core/services/flight.service';
import { SeatService } from '../../../core/services/seat.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Booking, BookingRequest, FareSummaryResponse, Flight, PassengerRequest, Seat } from '../../../models';

type PassengerDraft = Omit<PassengerRequest, 'bookingId'>;

type BookingFormDraft = {
  tripType: string;
  mealPreference: string;
  luggageKg: number;
  contactEmail: string;
  contactPhone: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  passportNumber: string;
  nationality: string;
};

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit, OnDestroy {
  private readonly taxRate = 0.18;

  form: FormGroup;
  loading = false;
  loadingDetails = true;
  loadingFare = false;
  flightId = '';
  seatId = '';
  flight: Flight | null = null;
  selectedSeat: Seat | null = null;
  fareSummary: FareSummaryResponse | null = null;
  showFareDetails = false;
  retryBooking: Booking | null = null;
  autoRestoreFare = false;
  holdingSeat = false;
  holdReference = '';

  mealOptions = ['STANDARD', 'VEGETARIAN', 'VEGAN', 'HALAL', 'KOSHER', 'GLUTEN_FREE'];
  tripTypes = ['ONE_WAY', 'ROUND_TRIP'];
  genders = ['MALE', 'FEMALE', 'OTHER'];
  private heldSeatId = '';
  private proceedingToPayment = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private flightService: FlightService,
    private seatService: SeatService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      tripType: ['ONE_WAY', Validators.required],
      mealPreference: ['STANDARD'],
      luggageKg: [15, [Validators.required, Validators.min(0), Validators.max(50)]],
      contactEmail: [this.auth.getEmail(), [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      dateOfBirth: ['', Validators.required],
      gender: ['MALE', Validators.required],
      passportNumber: ['', Validators.required],
      nationality: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.cleanupSeatHold();
      this.flightId = String(params['flightId'] || '').trim();
      this.seatId = String(params['seatId'] || '').trim();
      this.holdReference = this.getOrCreateHoldReference();
      this.retryBooking = this.readRetryBookingFromState();
      this.restoreBookingDraft();
      this.holdSelectedSeat();
      this.loadDetails();

      if (history.state?.paymentFailed) {
        this.toast.warning('Payment failed. Review your travel preferences and try again.');
      }
    });

    this.form.valueChanges.subscribe(() => {
      this.fareSummary = null;
      this.showFareDetails = false;
      this.storeBookingDraft();
    });
  }

  ngOnDestroy(): void {
    if (this.proceedingToPayment) return;
    this.cleanupSeatHold();
  }

  get selectedSeatLabel(): string {
    return this.selectedSeat?.seatNumber || 'Selected seat';
  }

  calculateFare(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.flight) {
      this.toast.warning('Flight details are still loading.');
      return;
    }

    this.loadingFare = true;
    this.bookingService.calculateFare(this.buildBookingPayload()).subscribe({
      next: fareSummary => {
        this.fareSummary = fareSummary;
        this.showFareDetails = false;
        this.loadingFare = false;
      },
      error: () => {
        this.fareSummary = null;
        this.loadingFare = false;
      }
    });
  }

  toggleFareDetails(): void {
    if (!this.fareSummary) return;
    this.showFareDetails = !this.showFareDetails;
  }

  onContinue(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.flight || !this.fareSummary) {
      this.toast.warning('Calculate fare before continuing to payment.');
      return;
    }

    this.storeBookingDraft();

    if (this.retryBooking?.bookingId && this.retryBooking.status === 'PENDING') {
      this.storePassengerDraft(this.retryBooking.bookingId);
      this.persistBookingHoldReference(this.retryBooking.bookingId);
      this.proceedingToPayment = true;
      this.router.navigate(['/passenger/payment', this.retryBooking.bookingId], {
        state: {
          booking: this.retryBooking,
          autoStart: true,
          selectedPaymentMode: 'UPI',
          returnToBooking: {
            flightId: this.flightId,
            seatId: this.seatId,
          },
          holdReference: this.holdReference,
        }
      });
      return;
    }

    this.loading = true;
    this.bookingService.createBooking(this.buildBookingPayload()).subscribe({
      next: booking => {
        this.storePassengerDraft(booking.bookingId);
        this.persistBookingHoldReference(booking.bookingId);
        this.loading = false;
        this.proceedingToPayment = true;
        this.router.navigate(['/passenger/payment', booking.bookingId], {
          state: {
            booking,
            autoStart: true,
            selectedPaymentMode: 'UPI',
            returnToBooking: {
              flightId: this.flightId,
              seatId: this.seatId,
            },
            holdReference: this.holdReference,
          }
        });
      },
      error: () => {
        this.loading = false;
        this.proceedingToPayment = false;
      }
    });
  }

  private loadDetails(): void {
    if (!this.flightId) {
      this.loadingDetails = false;
      return;
    }

    this.loadingDetails = true;
    this.flightService.getFlightById(this.flightId).subscribe({
      next: flight => {
        this.flight = flight;
        this.loadingDetails = false;

        if (this.autoRestoreFare && this.form.valid) {
          this.autoRestoreFare = false;
          this.calculateFare();
        }
      },
      error: () => { this.loadingDetails = false; }
    });

    this.seatService.getSeatMap(this.flightId).subscribe({
      next: seats => {
        this.selectedSeat = seats.find(seat => String(seat.seatId) === this.seatId) || null;
      }
    });
  }

  private holdSelectedSeat(): void {
    if (!this.seatId || !this.holdReference || this.heldSeatId === this.seatId) return;

    this.holdingSeat = true;
    this.seatService.holdSeat(this.seatId, this.holdReference).subscribe({
      next: () => {
        this.heldSeatId = this.seatId;
        this.holdingSeat = false;
      },
      error: () => {
        this.clearStoredHoldReference();
        this.holdReference = '';
        this.holdingSeat = false;
        this.toast.warning('This seat could not be reserved. Please choose another seat.');
        this.router.navigate(['/passenger/seats', this.flightId]);
      }
    });
  }

  private buildBookingPayload(): BookingRequest {
    const value = this.form.getRawValue();
    const baseFare = Number(this.flight?.basePrice || 0);

    return {
      userId: this.auth.getUserIdValue(),
      flightId: this.flightId,
      seatId: this.seatId,
      tripType: value.tripType,
      baseFare,
      taxes: this.calculateTaxes(baseFare),
      mealPreference: value.mealPreference,
      luggageKg: Number(value.luggageKg || 0),
      contactEmail: String(value.contactEmail || '').trim(),
      contactPhone: String(value.contactPhone || '').trim(),
      holdReference: this.holdReference || undefined,
    };
  }

  private buildPassengerDraft(): PassengerDraft {
    const value = this.form.getRawValue();

    return {
      seatId: this.seatId,
      firstName: String(value.firstName || '').trim(),
      lastName: String(value.lastName || '').trim(),
      dateOfBirth: value.dateOfBirth,
      gender: value.gender,
      passportNumber: String(value.passportNumber || '').trim(),
      nationality: String(value.nationality || '').trim(),
    };
  }

  private buildBookingFormDraft(): BookingFormDraft {
    const value = this.form.getRawValue();

    return {
      tripType: value.tripType,
      mealPreference: value.mealPreference,
      luggageKg: Number(value.luggageKg || 0),
      contactEmail: String(value.contactEmail || '').trim(),
      contactPhone: String(value.contactPhone || '').trim(),
      firstName: String(value.firstName || '').trim(),
      lastName: String(value.lastName || '').trim(),
      dateOfBirth: value.dateOfBirth,
      gender: value.gender,
      passportNumber: String(value.passportNumber || '').trim(),
      nationality: String(value.nationality || '').trim(),
    };
  }

  private storePassengerDraft(bookingId: string): void {
    sessionStorage.setItem(`pending-passenger:${bookingId}`, JSON.stringify(this.buildPassengerDraft()));
  }

  private storeBookingDraft(): void {
    if (!this.flightId || !this.seatId) return;
    sessionStorage.setItem(this.getBookingDraftKey(), JSON.stringify(this.buildBookingFormDraft()));
  }

  private restoreBookingDraft(): void {
    if (!this.flightId || !this.seatId) return;

    const rawDraft = sessionStorage.getItem(this.getBookingDraftKey());
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as Partial<BookingFormDraft>;
      this.form.patchValue(draft, { emitEvent: false });
      this.autoRestoreFare = true;
    } catch {
      sessionStorage.removeItem(this.getBookingDraftKey());
    }
  }

  private getBookingDraftKey(): string {
    return `booking-form:${this.flightId}:${this.seatId}`;
  }

  private readRetryBookingFromState(): Booking | null {
    const booking = (this.router.getCurrentNavigation()?.extras.state?.['retryBooking']
      || history.state?.retryBooking) as Booking | undefined;

    return booking?.bookingId ? booking : null;
  }

  private calculateTaxes(baseFare: number): number {
    return Number((baseFare * this.taxRate).toFixed(2));
  }

  private cleanupSeatHold(): void {
    if (!this.heldSeatId || !this.holdReference) return;

    const seatId = this.heldSeatId;
    const holdReference = this.holdReference;
    this.heldSeatId = '';
    this.holdReference = '';
    this.clearStoredHoldReference();
    this.seatService.releaseSeat(seatId, holdReference).subscribe({ error: () => {} });
  }

  private getOrCreateHoldReference(): string {
    if (!this.flightId || !this.seatId) return '';

    const savedReference = sessionStorage.getItem(this.getSeatHoldKey());
    if (savedReference) return savedReference;

    const holdReference = this.createHoldReference();
    sessionStorage.setItem(this.getSeatHoldKey(), holdReference);
    return holdReference;
  }

  private persistBookingHoldReference(bookingId: string): void {
    if (!bookingId || !this.holdReference) return;
    sessionStorage.setItem(this.getBookingHoldKey(bookingId), this.holdReference);
  }

  private clearStoredHoldReference(): void {
    if (this.flightId && this.seatId) {
      sessionStorage.removeItem(this.getSeatHoldKey());
    }

    if (this.retryBooking?.bookingId) {
      sessionStorage.removeItem(this.getBookingHoldKey(this.retryBooking.bookingId));
    }
  }

  private getSeatHoldKey(): string {
    return `seat-hold:${this.flightId}:${this.seatId}`;
  }

  private getBookingHoldKey(bookingId: string): string {
    return `seat-hold-booking:${bookingId}`;
  }

  private createHoldReference(): string {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `hold-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
