import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BookingService } from '../../../core/services/booking.service';
import { FlightService } from '../../../core/services/flight.service';
import { SeatService } from '../../../core/services/seat.service';
import { PassengerService } from '../../../core/services/passenger.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Booking,
  BookingRequest,
  FareSummaryResponse,
  Flight,
  PassengerBulkRequest,
  PassengerRequest,
  Seat
} from '../../../models';

type PassengerDraft = {
  seatId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  passportNumber: string;
  nationality: string;
};

type BookingFormDraft = {
  tripType: string;
  mealPreference: string;
  luggageKg: number;
  contactEmail: string;
  contactPhone: string;
  passengers: PassengerDraft[];
};

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  form: FormGroup;
  loading = false;
  loadingDetails = true;
  loadingFare = false;
  flightId = '';
  seatIds: string[] = [];
  flight: Flight | null = null;
  selectedSeats: Seat[] = [];
  fareSummary: FareSummaryResponse | null = null;
  showFareDetails = false;
  retryBooking: Booking | null = null;
  autoRestoreFare = false;
  passengerCardExpanded: boolean[] = [];

  mealOptions = ['STANDARD', 'VEGETARIAN', 'VEGAN', 'HALAL', 'KOSHER', 'GLUTEN_FREE'];
  tripTypes = ['ONE_WAY', 'ROUND_TRIP'];
  genders = ['MALE', 'FEMALE', 'OTHER'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private flightService: FlightService,
    private seatService: SeatService,
    private passengerService: PassengerService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      tripType: ['ONE_WAY', Validators.required],
      mealPreference: ['STANDARD'],
      luggageKg: [15, [Validators.required, Validators.min(0), Validators.max(50)]],
      contactEmail: [this.auth.getEmail(), [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{7,15}$/)]],
      passengers: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.flightId = String(params['flightId'] || '').trim();
      this.seatIds = this.parseSeatIds(params);
      this.retryBooking = this.readRetryBookingFromState();
      this.syncPassengerForms();
      this.restoreBookingDraft();
      this.loadDetails();

      if (history.state?.paymentFailed) {
        this.toast.warning('Payment failed. Please review your details and try again.');
      }
    });

    this.form.valueChanges.subscribe(() => {
      this.fareSummary = null;
      this.showFareDetails = false;
      this.storeBookingDraft();
    });
  }

  get passengerArray(): FormArray {
    return this.form.get('passengers') as FormArray;
  }

  get passengerGroups(): FormGroup[] {
    return this.passengerArray.controls as FormGroup[];
  }

  get selectedSeatCount(): number {
    return this.seatIds.length;
  }

  get selectedSeatSummary(): string {
    const labels = this.selectedSeats.length
      ? this.selectedSeats.map(seat => seat.seatNumber)
      : this.seatIds;

    return labels.join(', ');
  }

  calculateFare(): void {
    if (this.form.get('tripType')?.invalid || this.form.get('luggageKg')?.invalid
      || this.form.get('contactEmail')?.invalid || this.form.get('contactPhone')?.invalid) {
      this.form.get('tripType')?.markAsTouched();
      this.form.get('luggageKg')?.markAsTouched();
      this.form.get('contactEmail')?.markAsTouched();
      this.form.get('contactPhone')?.markAsTouched();
      return;
    }

    if (!this.flight || !this.seatIds.length) {
      this.toast.warning('Flight or seat details are still loading.');
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
      this.expandInvalidPassengerCards();
      return;
    }

    if (!this.flight || !this.fareSummary || !this.seatIds.length) {
      this.toast.warning('Calculate fare before continuing to payment.');
      return;
    }

    this.storeBookingDraft();

    if (this.retryBooking?.bookingId && this.retryBooking.status === 'PENDING') {
      this.router.navigate(['/passenger/payment', this.retryBooking.bookingId], {
        state: {
          booking: this.retryBooking,
          autoStart: true,
          selectedPaymentMode: 'UPI',
          returnToBooking: {
            flightId: this.flightId,
            seatIds: this.seatIds,
          },
        }
      });
      return;
    }

    this.loading = true;
    this.bookingService.createBooking(this.buildBookingPayload()).subscribe({
      next: booking => {
        const passengerPayload: PassengerBulkRequest = {
          bookingId: booking.bookingId,
          passengers: this.buildPassengerPayloads(),
        };

        this.passengerService.createPassengers(passengerPayload).subscribe({
          next: () => {
            this.loading = false;
            this.router.navigate(['/passenger/payment', booking.bookingId], {
              state: {
                booking,
                autoStart: true,
                selectedPaymentMode: 'UPI',
                returnToBooking: {
                  flightId: this.flightId,
                  seatIds: this.seatIds,
                },
              }
            });
          },
          error: () => {
            this.bookingService.cancelBooking(booking.bookingId).subscribe({ error: () => {} });
            this.loading = false;
            this.toast.error('We could not save passenger details for this booking. Please try again.');
          }
        });
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getSeatLabel(index: number): string {
    return this.selectedSeats[index]?.seatNumber || this.seatIds[index] || `Seat ${index + 1}`;
  }

  isPassengerCardExpanded(index: number): boolean {
    return this.passengerCardExpanded[index] !== false;
  }

  togglePassengerCard(index: number): void {
    this.passengerCardExpanded[index] = !this.isPassengerCardExpanded(index);
  }

  getPassengerCardTitle(index: number): string {
    const group = this.passengerGroups[index];
    if (!group) return `Passenger ${index + 1}`;

    const firstName = String(group.get('firstName')?.value || '').trim();
    const lastName = String(group.get('lastName')?.value || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    return fullName || `Passenger ${index + 1}`;
  }

  getPassengerCardStatus(index: number): string {
    const missingRequiredFields = this.getPassengerMissingRequiredFields(index);

    if (missingRequiredFields === 0) {
      return 'Required details complete';
    }

    return `${missingRequiredFields} required field${missingRequiredFields > 1 ? 's' : ''} left`;
  }

  getPassengerCardPreview(index: number): string {
    const group = this.passengerGroups[index];
    if (!group) return 'Fill the passenger details';

    const nationality = String(group.get('nationality')?.value || '').trim();
    const passportNumber = this.normalizeOptionalPassport(group.get('passportNumber')?.value);
    const previewParts = [
      nationality ? `Nationality: ${nationality}` : '',
      passportNumber ? `Passport: ${passportNumber}` : 'Passport: Optional',
    ].filter(Boolean);

    return previewParts.join(' | ');
  }

  private loadDetails(): void {
    if (!this.flightId || !this.seatIds.length) {
      this.loadingDetails = false;
      return;
    }

    this.loadingDetails = true;
    forkJoin({
      flight: this.flightService.getFlightById(this.flightId),
      seats: this.seatService.getSeatMap(this.flightId),
    }).subscribe({
      next: ({ flight, seats }) => {
        this.flight = flight;
        this.selectedSeats = this.seatIds
          .map(seatId => seats.find(seat => String(seat.seatId) === seatId) || null)
          .filter((seat): seat is Seat => Boolean(seat));

        if (!this.selectedSeats.length) {
          this.toast.warning('Selected seats could not be restored. Please choose seats again.');
        }

        this.loadingDetails = false;

        if (this.autoRestoreFare && this.form.valid) {
          this.autoRestoreFare = false;
          this.calculateFare();
        }
      },
      error: () => {
        this.loadingDetails = false;
      }
    });
  }

  private buildBookingPayload(): BookingRequest {
    const value = this.form.getRawValue();

    return {
      userId: this.auth.getUserIdValue(),
      flightId: this.flightId,
      seatIds: this.seatIds,
      tripType: value.tripType,
      mealPreference: value.mealPreference,
      luggageKg: Number(value.luggageKg || 0),
      contactEmail: String(value.contactEmail || '').trim(),
      contactPhone: String(value.contactPhone || '').trim(),
    };
  }

  private buildPassengerPayloads(): PassengerRequest[] {
    return this.passengerGroups.map((group, index) => {
      const value = group.getRawValue();

      return {
        seatId: this.seatIds[index],
        firstName: String(value.firstName || '').trim(),
        lastName: String(value.lastName || '').trim(),
        dateOfBirth: value.dateOfBirth,
        gender: value.gender,
        passportNumber: this.normalizeOptionalPassport(value.passportNumber),
        nationality: String(value.nationality || '').trim(),
      };
    });
  }

  private buildBookingFormDraft(): BookingFormDraft {
    const value = this.form.getRawValue();

    return {
      tripType: value.tripType,
      mealPreference: value.mealPreference,
      luggageKg: Number(value.luggageKg || 0),
      contactEmail: String(value.contactEmail || '').trim(),
      contactPhone: String(value.contactPhone || '').trim(),
      passengers: this.passengerGroups.map((group, index) => {
        const passenger = group.getRawValue();

        return {
          seatId: this.seatIds[index],
          firstName: String(passenger.firstName || '').trim(),
          lastName: String(passenger.lastName || '').trim(),
          dateOfBirth: passenger.dateOfBirth,
          gender: passenger.gender,
          passportNumber: String(passenger.passportNumber || '').trim(),
          nationality: String(passenger.nationality || '').trim(),
        };
      }),
    };
  }

  private storeBookingDraft(): void {
    if (!this.flightId || !this.seatIds.length) return;
    sessionStorage.setItem(this.getBookingDraftKey(), JSON.stringify(this.buildBookingFormDraft()));
  }

  private restoreBookingDraft(): void {
    if (!this.flightId || !this.seatIds.length) return;

    const rawDraft = sessionStorage.getItem(this.getBookingDraftKey());
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as Partial<BookingFormDraft>;
      this.form.patchValue({
        tripType: draft.tripType,
        mealPreference: draft.mealPreference,
        luggageKg: draft.luggageKg,
        contactEmail: draft.contactEmail,
        contactPhone: draft.contactPhone,
      }, { emitEvent: false });
      this.syncPassengerForms(draft.passengers || []);
      this.autoRestoreFare = true;
    } catch {
      sessionStorage.removeItem(this.getBookingDraftKey());
    }
  }

  private syncPassengerForms(passengerDrafts: Partial<PassengerDraft>[] = []): void {
    const passengerBySeatId = new Map<string, Partial<PassengerDraft>>();
    passengerDrafts.forEach((draft, index) => {
      const seatId = String(draft.seatId || this.seatIds[index] || '').trim();
      if (seatId) {
        passengerBySeatId.set(seatId, draft);
      }
    });

    const groups = this.seatIds.map(seatId => this.createPassengerGroup(passengerBySeatId.get(seatId)));
    this.form.setControl('passengers', this.fb.array(groups));
    this.passengerCardExpanded = this.seatIds.map((_, index) => this.passengerCardExpanded[index] ?? true);
  }

  private createPassengerGroup(draft?: Partial<PassengerDraft>): FormGroup {
    return this.fb.group({
      firstName: [draft?.firstName || '', [Validators.required, Validators.minLength(2)]],
      lastName: [draft?.lastName || '', [Validators.required, Validators.minLength(2)]],
      dateOfBirth: [draft?.dateOfBirth || '', Validators.required],
      gender: [draft?.gender || 'MALE', Validators.required],
      passportNumber: [draft?.passportNumber || ''],
      nationality: [draft?.nationality || '', Validators.required],
    });
  }

  private expandInvalidPassengerCards(): void {
    this.passengerGroups.forEach((group, index) => {
      if (group.invalid) {
        this.passengerCardExpanded[index] = true;
      }
    });
  }

  private getPassengerMissingRequiredFields(index: number): number {
    const group = this.passengerGroups[index];
    if (!group) return 0;

    return ['firstName', 'lastName', 'dateOfBirth', 'gender', 'nationality']
      .filter(controlName => group.get(controlName)?.invalid)
      .length;
  }

  private normalizeOptionalPassport(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private getBookingDraftKey(): string {
    return `booking-form:${this.flightId}:${this.seatIds.join(',')}`;
  }

  private parseSeatIds(params: Params): string[] {
    const rawSeatIds = params['seatIds'];
    const values = Array.isArray(rawSeatIds) ? rawSeatIds : rawSeatIds ? [rawSeatIds] : [];
    const parsed = values
      .flatMap(value => String(value).split(','))
      .map(value => value.trim())
      .filter(Boolean);

    if (!parsed.length) {
      const fallbackSeatId = String(params['seatId'] || '').trim();
      if (fallbackSeatId) {
        parsed.push(fallbackSeatId);
      }
    }

    return Array.from(new Set(parsed));
  }

  private readRetryBookingFromState(): Booking | null {
    const booking = (this.router.getCurrentNavigation()?.extras.state?.['retryBooking']
      || history.state?.retryBooking) as Booking | undefined;

    return booking?.bookingId ? booking : null;
  }
}
