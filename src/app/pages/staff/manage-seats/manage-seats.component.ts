import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { FlightService } from '../../../core/services/flight.service';
import { SeatService } from '../../../core/services/seat.service';
import { ToastService } from '../../../core/services/toast.service';
import { BulkSeatRequest, Flight, Seat, SeatClass, SeatRequest, SeatStatus } from '../../../models';

type SeatLookupMode = 'map' | 'available' | 'availableByClass' | null;
type SeatMapRow = { label: string; left: (Seat | null)[]; right: (Seat | null)[]; seatClass: SeatClass | null };

@Component({
  selector: 'app-manage-seats',
  templateUrl: './manage-seats.component.html',
  styleUrls: ['./manage-seats.component.css']
})
export class ManageSeatsComponent implements OnInit {
  private readonly columnPattern = /^[A-Za-z]$/;
  private readonly greaterThanOne: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    return Number.isFinite(value) && value > 1 ? null : { greaterThanOne: true };
  };
  private readonly seatPositionValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const isWindow = Boolean(control.get('isWindow')?.value);
    const isAisle = Boolean(control.get('isAisle')?.value);
    return isWindow && isAisle ? { conflictingSeatPosition: true } : null;
  };

  bulkForm: FormGroup;
  singleForm: FormGroup;
  lookupForm: FormGroup;

  flights: Flight[] = [];
  flightsLoading = true;
  selectedFlight: Flight | null = null;

  loading = false;
  lookupLoading = false;
  deletingSeats = false;
  mode: 'bulk' | 'single' = 'bulk';
  currentLookupMode: SeatLookupMode = null;

  seatClasses: SeatClass[] = ['ECONOMY', 'BUSINESS', 'FIRST'];
  availabilitySeatClasses: Array<'ALL' | SeatClass> = ['ALL', 'ECONOMY', 'BUSINESS', 'FIRST'];
  availableColumns = ['A', 'B', 'C', 'D', 'E', 'F'];
  selectedColumns: string[] = [];

  seatResults: Seat[] = [];
  seatMapRows: SeatMapRow[] = [];
  leftSeatColumns: string[] = [];
  rightSeatColumns: string[] = [];
  lookupSearched = false;
  lookupSummary = '';
  deleteFlightId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private flightService: FlightService,
    private seatService: SeatService,
    private toast: ToastService
  ) {
    this.bulkForm = this.fb.group({
      seatClass: ['ECONOMY', Validators.required],
      fromRow: ['', [Validators.required, Validators.min(1)]],
      toRow: ['', [Validators.required, Validators.min(1)]],
      priceMultiplier: [1.1, [Validators.required, this.greaterThanOne]],
      extraLegroom: [false],
    });

    this.singleForm = this.fb.group({
      rowNumber: ['', [Validators.required, Validators.min(1)]],
      columnLetter: ['', [Validators.required, Validators.pattern(this.columnPattern)]],
      seatClass: ['ECONOMY', Validators.required],
      isWindow: [false],
      isAisle: [false],
      hasExtraLegroom: [false],
      priceMultiplier: [1.1, [Validators.required, this.greaterThanOne]],
    }, { validators: this.seatPositionValidator });

    this.lookupForm = this.fb.group({
      seatClass: ['ALL'],
    });
  }

  ngOnInit(): void {
    this.loadFlights();
  }

  get hasSelectedFlight(): boolean {
    return Boolean(this.selectedFlight);
  }

  get selectedFlightDisplay(): string {
    if (!this.selectedFlight) return 'No flight selected';
    return `${this.selectedFlight.flightNumber}  ${this.selectedFlight.originAirportCode} to ${this.selectedFlight.destinationAirportCode}`;
  }

  get singleSeatPreview(): string {
    const rowNumber = this.singleForm.get('rowNumber')?.value;
    const columnLetter = String(this.singleForm.get('columnLetter')?.value || '').trim().toUpperCase();
    return rowNumber && columnLetter ? `${rowNumber}${columnLetter}` : 'None';
  }

  loadFlights(): void {
    this.flightsLoading = true;
    const airlineId = this.auth.getAirlineId();
    if (!airlineId) {
      this.flights = [];
      this.flightsLoading = false;
      return;
    }

    this.flightService.getFlightsByAirline(airlineId).subscribe({
      next: flights => {
        this.flights = flights;
        this.flightsLoading = false;
      },
      error: () => { this.flightsLoading = false; }
    });
  }

  selectFlight(flight: Flight): void {
    this.selectedFlight = flight;
    this.lookupSearched = false;
    this.currentLookupMode = null;
    this.lookupSummary = '';
    this.seatResults = [];
    this.seatMapRows = [];
    this.leftSeatColumns = [];
    this.rightSeatColumns = [];
  }

  isSelectedFlight(flight: Flight): boolean {
    return this.selectedFlight?.flightId === flight.flightId;
  }

  toggleColumn(col: string): void {
    const index = this.selectedColumns.indexOf(col);
    if (index >= 0) this.selectedColumns.splice(index, 1);
    else this.selectedColumns.push(col);
  }

  onBulkSubmit(): void {
    if (!this.ensureFlightSelected()) return;
    if (this.bulkForm.invalid || this.selectedColumns.length === 0) {
      this.bulkForm.markAllAsTouched();
      if (!this.selectedColumns.length) this.toast.warning('Select at least one column.');
      return;
    }

    this.loading = true;
    this.seatService.createBulkSeats(this.buildBulkPayload()).subscribe({
      next: seats => {
        this.toast.success(`${seats.length} seats created for ${this.selectedFlight?.flightNumber}.`);
        this.loading = false;
        this.bulkForm.reset({ seatClass: 'ECONOMY', priceMultiplier: 1.1, extraLegroom: false });
        this.selectedColumns = [];
      },
      error: () => { this.loading = false; }
    });
  }

  onSingleSubmit(): void {
    if (!this.ensureFlightSelected()) return;
    if (this.singleForm.invalid) {
      this.singleForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.seatService.createSeat(this.buildSinglePayload()).subscribe({
      next: seat => {
        this.toast.success(`Seat ${seat.seatNumber} created for ${this.selectedFlight?.flightNumber}.`);
        this.loading = false;
        this.singleForm.reset({
          seatClass: 'ECONOMY',
          isWindow: false,
          isAisle: false,
          hasExtraLegroom: false,
          priceMultiplier: 1.1
        });
      },
      error: () => { this.loading = false; }
    });
  }

  onWindowSeatChange(): void {
    if (this.singleForm.get('isWindow')?.value) {
      this.singleForm.patchValue({ isAisle: false }, { emitEvent: false });
      this.singleForm.updateValueAndValidity({ emitEvent: false });
    }
  }

  onAisleSeatChange(): void {
    if (this.singleForm.get('isAisle')?.value) {
      this.singleForm.patchValue({ isWindow: false }, { emitEvent: false });
      this.singleForm.updateValueAndValidity({ emitEvent: false });
    }
  }

  loadSeatMap(): void {
    this.runLookup('map');
  }

  loadAvailableSeats(): void {
    const seatClass = this.lookupForm.get('seatClass')?.value as 'ALL' | SeatClass;
    this.runLookup(seatClass === 'ALL' ? 'available' : 'availableByClass');
  }

  openDeleteSeatsConfirm(): void {
    if (!this.ensureFlightSelected()) return;
    this.deleteFlightId = this.selectedFlight?.flightId || null;
  }

  closeDeleteSeatsConfirm(): void {
    if (this.deletingSeats) return;
    this.deleteFlightId = null;
  }

  confirmDeleteSeats(): void {
    if (!this.selectedFlight || !this.deleteFlightId) return;

    this.deletingSeats = true;
    this.seatService.deleteSeatsForFlight(this.deleteFlightId).subscribe({
      next: message => {
        this.seatResults = [];
        this.seatMapRows = [];
        this.leftSeatColumns = [];
        this.rightSeatColumns = [];
        this.lookupSearched = true;
        this.currentLookupMode = 'map';
        this.lookupSummary = `Seat inventory cleared for ${this.selectedFlight?.flightNumber}.`;
        this.toast.success(message || 'Seats deleted successfully for flight');
        this.deletingSeats = false;
        this.deleteFlightId = null;
      },
      error: () => { this.deletingSeats = false; }
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      ON_TIME: 'badge-success',
      DELAYED: 'badge-warning',
      CANCELLED: 'badge-danger',
      DEPARTED: 'badge-info',
      ARRIVED: 'badge-cyan',
      AVAILABLE: 'badge-success',
      HELD: 'badge-warning',
      CONFIRMED: 'badge-danger',
      BLOCKED: 'badge-default',
    };
    return classes[status] || 'badge-default';
  }

  getSeatPosition(seat: Seat): string {
    const rowNumber = seat.rowNumber ?? this.extractRowNumber(seat);
    const columnLetter = seat.columnLetter || this.extractColumnLetter(seat);
    if (rowNumber && columnLetter) return `${rowNumber}${columnLetter}`;
    return seat.seatNumber || 'Seat';
  }

  getSeatSide(seat: Seat): string {
    const side: string[] = [];
    if (seat.isWindow) side.push('Window');
    if (seat.isAisle) side.push('Aisle');
    return side.join(' / ') || 'Standard';
  }

  shouldShowSeatClassSeparator(index: number): boolean {
    if (index === 0) return true;

    const currentClass = this.seatMapRows[index]?.seatClass;
    const previousClass = this.seatMapRows[index - 1]?.seatClass;
    return currentClass !== previousClass;
  }

  getSeatClassSectionLabel(seatClass: SeatClass | null): string {
    if (!seatClass) return 'Cabin Section';
    return `${seatClass.charAt(0)}${seatClass.slice(1).toLowerCase()} Class`;
  }

  hasSeatExtraLegroom(seat: Seat): boolean {
    return Boolean(seat.hasExtraLegroom ?? seat.extraLegroom);
  }

  getMetricCount(status: SeatStatus): number {
    return this.seatResults.filter(seat => seat.status === status).length;
  }

  getSeatVisualClass(seat: Seat | null): string {
    if (!seat) return 'seat-shell seat-empty';

    const base = ['seat-shell'];
    switch (seat.status) {
      case 'AVAILABLE':
        base.push('seat-available');
        break;
      case 'HELD':
        base.push('seat-held');
        break;
      case 'CONFIRMED':
        base.push('seat-confirmed');
        break;
      default:
        base.push('seat-blocked');
        break;
    }

    if (seat.isWindow) base.push('seat-window');
    if (seat.isAisle) base.push('seat-aisle');
    if (this.hasSeatExtraLegroom(seat)) base.push('seat-extra');
    return base.join(' ');
  }

  getSeatMapLabel(seat: Seat | null): string {
    return seat ? (seat.columnLetter || this.extractColumnLetter(seat)) : '';
  }

  getSeatMapTitle(seat: Seat | null): string {
    if (!seat) return '';
    return `${this.getSeatPosition(seat)}  ${seat.seatClass}  ${seat.status}`;
  }

  private ensureFlightSelected(): boolean {
    if (this.selectedFlight) return true;
    this.toast.warning('Select a flight first.');
    return false;
  }

  private buildBulkPayload(): BulkSeatRequest {
    const value = this.bulkForm.getRawValue();
    return {
      flightId: this.selectedFlight!.flightId,
      seatClass: value.seatClass,
      fromRow: Number(value.fromRow),
      toRow: Number(value.toRow),
      seatColumns: this.availableColumns.filter(col => this.selectedColumns.includes(col)).join(''),
      priceMultiplier: Number(value.priceMultiplier),
      extraLegroom: Boolean(value.extraLegroom),
    };
  }

  private buildSinglePayload(): SeatRequest {
    const value = this.singleForm.getRawValue();
    const rowNumber = Number(value.rowNumber);
    const columnLetter = String(value.columnLetter).trim().toUpperCase();

    return {
      flightId: this.selectedFlight!.flightId,
      seatClass: value.seatClass,
      rowNumber,
      columnLetter,
      seatNumber: `${rowNumber}${columnLetter}`,
      isWindow: Boolean(value.isWindow),
      isAisle: Boolean(value.isAisle),
      hasExtraLegroom: Boolean(value.hasExtraLegroom),
      priceMultiplier: Number(value.priceMultiplier),
    };
  }

  private runLookup(mode: Exclude<SeatLookupMode, null>): void {
    if (!this.ensureFlightSelected()) return;

    const flight = this.selectedFlight!;
    const seatClass = this.lookupForm.get('seatClass')?.value as 'ALL' | SeatClass;
    let request$: Observable<Seat[]>;
    let summary = '';

    if (mode === 'map') {
      request$ = this.seatService.getSeatMap(flight.flightId);
      summary = `Cabin seat map for ${flight.flightNumber}`;
    } else if (mode === 'availableByClass') {
      request$ = this.seatService.getAvailableSeatsByClass(flight.flightId, seatClass as SeatClass);
      summary = `Available ${seatClass.toLowerCase()} seats for ${flight.flightNumber}`;
    } else {
      request$ = this.seatService.getAvailableSeats(flight.flightId);
      summary = `All available seats for ${flight.flightNumber}`;
    }

    this.lookupLoading = true;
    this.lookupSearched = true;
    this.currentLookupMode = mode;
    this.lookupSummary = summary;

    request$.subscribe({
      next: seats => {
        this.seatResults = seats.map(seat => this.normalizeSeat(seat));
        if (mode === 'map') this.buildSeatMapLayout(this.seatResults);
        else this.clearSeatMapLayout();
        this.lookupLoading = false;
      },
      error: () => {
        this.seatResults = [];
        this.clearSeatMapLayout();
        this.lookupLoading = false;
      }
    });
  }

  private buildSeatMapLayout(seats: Seat[]): void {
    if (seats.length === 0) {
      this.clearSeatMapLayout();
      return;
    }

    const columns = Array.from(new Set(
      seats
        .map(seat => seat.columnLetter || this.extractColumnLetter(seat))
        .filter((column): column is string => Boolean(column))
    )).sort();
    const splitIndex = Math.ceil(columns.length / 2);
    this.leftSeatColumns = columns.slice(0, splitIndex);
    this.rightSeatColumns = columns.slice(splitIndex);

    const rows = Array.from(new Set(
      seats
        .map(seat => seat.rowNumber ?? this.extractRowNumber(seat))
        .filter((row): row is number => Number.isFinite(row))
    )).sort((a, b) => a - b);

    this.seatMapRows = rows.map(row => {
      const rowSeats = seats.filter(seat => (seat.rowNumber ?? this.extractRowNumber(seat)) === row);
      const seatByColumn = new Map(
        rowSeats
          .map(seat => [seat.columnLetter || this.extractColumnLetter(seat), seat] as const)
          .filter(([column]) => Boolean(column))
      );

      return {
        label: String(row),
        left: this.leftSeatColumns.map(column => seatByColumn.get(column) || null),
        right: this.rightSeatColumns.map(column => seatByColumn.get(column) || null),
        seatClass: rowSeats[0]?.seatClass || null,
      };
    });
  }

  private clearSeatMapLayout(): void {
    this.seatMapRows = [];
    this.leftSeatColumns = [];
    this.rightSeatColumns = [];
  }

  private normalizeSeat(seat: Seat): Seat {
    const seatNumber = seat.seatNumber || this.composeSeatNumber(seat);
    const columnLetter = seat.columnLetter?.toUpperCase() || this.extractColumnLetter({ ...seat, seatNumber }) || undefined;
    const rowNumber = seat.rowNumber ?? this.extractRowNumber({ ...seat, seatNumber });

    return {
      ...seat,
      seatNumber,
      columnLetter,
      rowNumber,
      extraLegroom: seat.extraLegroom ?? seat.hasExtraLegroom ?? false,
      hasExtraLegroom: seat.hasExtraLegroom ?? seat.extraLegroom ?? false,
    };
  }

  private extractRowNumber(seat: Partial<Seat>): number | undefined {
    if (typeof seat.rowNumber === 'number' && Number.isFinite(seat.rowNumber)) return seat.rowNumber;
    if (!seat.seatNumber) return undefined;

    const parsed = Number(String(seat.seatNumber).replace(/[A-Z]$/i, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private extractColumnLetter(seat: Partial<Seat>): string | undefined {
    if (seat.columnLetter) return String(seat.columnLetter).toUpperCase();
    if (!seat.seatNumber) return undefined;

    const match = String(seat.seatNumber).match(/[A-Z]$/i);
    return match ? match[0].toUpperCase() : undefined;
  }

  private composeSeatNumber(seat: Partial<Seat>): string {
    const rowNumber = this.extractRowNumber(seat);
    const columnLetter = this.extractColumnLetter(seat);
    if (rowNumber && columnLetter) return `${rowNumber}${columnLetter}`;
    return seat.seatNumber || '';
  }
}
