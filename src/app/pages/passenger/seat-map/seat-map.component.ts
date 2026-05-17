import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { SeatService } from '../../../core/services/seat.service';
import { FlightService } from '../../../core/services/flight.service';
import { Flight, Seat, SeatClass } from '../../../models';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

type SeatMapRow = { label: string; left: (Seat | null)[]; right: (Seat | null)[]; seatClass: SeatClass | null };

@Component({
  selector: 'app-seat-map',
  templateUrl: './seat-map.component.html',
  styleUrls: ['./seat-map.component.css']
})
export class SeatMapComponent implements OnInit {
  seats: Seat[] = [];
  flight: Flight | null = null;
  selectedSeats: Seat[] = [];
  loading = true;
  flightId!: string;
  leftSeatColumns: string[] = [];
  rightSeatColumns: string[] = [];

  rows: SeatMapRow[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private seatService: SeatService,
    private flightService: FlightService,
    private toast: ToastService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.flightId = this.route.snapshot.paramMap.get('flightId') || '';
    this.loadFlight();
    this.restoreSelectionFromQuery(this.route.snapshot.queryParams);

    this.seatService.getSeatMap(this.flightId).subscribe({
      next: data => {
        this.seats = data.map(seat => this.normalizeSeat(seat));
        this.buildGrid();
        this.reconcileSelectedSeats();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get seatMapTitle(): string {
    return this.flight?.flightNumber || this.flightId;
  }

  get seatMapSubtitle(): string {
    if (!this.flight) return 'Choose one or more available seats for this flight.';
    return `${this.flight.originAirportCode} to ${this.flight.destinationAirportCode}`;
  }

  get hasSelectedSeats(): boolean {
    return this.selectedSeats.length > 0;
  }

  get selectedSeatCount(): number {
    return this.selectedSeats.length;
  }

  get selectedSeatIds(): string[] {
    return this.selectedSeats.map(seat => seat.seatId);
  }

  get selectedSeatNumbers(): string[] {
    return this.selectedSeats.map(seat => seat.seatNumber);
  }

  get selectedSeatQuery(): string {
    return this.selectedSeatIds.join(',');
  }

  buildGrid(): void {
    if (this.seats.length === 0) {
      this.rows = [];
      this.leftSeatColumns = [];
      this.rightSeatColumns = [];
      return;
    }

    const columns = Array.from(new Set(
      this.seats
        .map(seat => seat.columnLetter || this.extractColumnLetter(seat))
        .filter((column): column is string => Boolean(column))
    )).sort();
    const splitIndex = Math.ceil(columns.length / 2);
    this.leftSeatColumns = columns.slice(0, splitIndex);
    this.rightSeatColumns = columns.slice(splitIndex);

    const rowNumbers = Array.from(new Set(
      this.seats
        .map(seat => seat.rowNumber ?? this.extractRowNumber(seat))
        .filter((row): row is number => Number.isFinite(row))
    )).sort((a, b) => a - b);

    this.rows = rowNumbers.map(rowNumber => {
      const rowSeats = this.seats.filter(seat => (seat.rowNumber ?? this.extractRowNumber(seat)) === rowNumber);
      const seatByColumn = new Map(
        rowSeats
          .map(seat => [seat.columnLetter || this.extractColumnLetter(seat), seat] as const)
          .filter(([column]) => Boolean(column))
      );

      return {
        label: String(rowNumber),
        left: this.leftSeatColumns.map(column => seatByColumn.get(column) || null),
        right: this.rightSeatColumns.map(column => seatByColumn.get(column) || null),
        seatClass: rowSeats[0]?.seatClass || null,
      };
    });
  }

  selectSeat(seat: Seat): void {
    if (seat.status !== 'AVAILABLE') return;

    const existingIndex = this.selectedSeats.findIndex(selected => selected.seatId === seat.seatId);
    if (existingIndex >= 0) {
      this.selectedSeats = this.selectedSeats.filter(selected => selected.seatId !== seat.seatId);
      return;
    }

    this.selectedSeats = [...this.selectedSeats, seat];
  }

  clearSelection(): void {
    this.selectedSeats = [];
  }

  isSeatSelected(seat: Seat | null): boolean {
    if (!seat) return false;
    return this.selectedSeats.some(selected => selected.seatId === seat.seatId);
  }

  getSeatVisualClass(seat: Seat | null): string {
    if (!seat) return 'seat-shell seat-empty';

    const classes = ['seat-shell'];
    if (this.isSeatSelected(seat)) {
      classes.push('seat-selected');
    } else {
      switch (seat.status) {
        case 'AVAILABLE':
          classes.push('seat-available');
          break;
        case 'HELD':
          classes.push('seat-held');
          break;
        case 'CONFIRMED':
          classes.push('seat-confirmed');
          break;
        default:
          classes.push('seat-blocked');
          break;
      }
    }

    if (seat.isWindow) classes.push('seat-window');
    if (seat.isAisle) classes.push('seat-aisle');
    if (this.hasExtraLegroom(seat)) classes.push('seat-extra');
    return classes.join(' ');
  }

  getSeatMapLabel(seat: Seat | null): string {
    return seat ? (seat.columnLetter || this.extractColumnLetter(seat)) : '';
  }

  getSeatMapTitle(seat: Seat | null): string {
    if (!seat) return '';

    const statusLabel = this.isSeatSelected(seat) ? 'SELECTED' : seat.status;
    return `${this.getSeatPosition(seat)}  ${seat.seatClass}  ${statusLabel}`;
  }

  shouldShowSeatClassSeparator(index: number): boolean {
    if (index === 0) return true;

    const currentClass = this.rows[index]?.seatClass;
    const previousClass = this.rows[index - 1]?.seatClass;
    return currentClass !== previousClass;
  }

  getSeatClassSectionLabel(seatClass: SeatClass | null): string {
    if (!seatClass) return 'Cabin Section';
    return `${seatClass.charAt(0)}${seatClass.slice(1).toLowerCase()} Class`;
  }

  getSeatPosition(seat: Seat): string {
    const rowNumber = seat.rowNumber ?? this.extractRowNumber(seat);
    const columnLetter = seat.columnLetter || this.extractColumnLetter(seat);
    if (rowNumber && columnLetter) return `${rowNumber}${columnLetter}`;
    return seat.seatNumber || 'Seat';
  }

  hasExtraLegroom(seat: Seat): boolean {
    return Boolean(seat.extraLegroom ?? seat.hasExtraLegroom);
  }

  continue(): void {
    if (!this.selectedSeats.length) {
      this.toast.warning('Please select at least one seat to continue.');
      return;
    }

    const seatIds = this.selectedSeatQuery;

    if (!this.auth.isLoggedIn()) {
      const returnUrl = this.router.createUrlTree(['/passenger/booking'], {
        queryParams: { flightId: this.flightId, seatIds }
      }).toString();

      this.toast.info('Please sign in or create an account to book these seats.');
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    this.router.navigate(['/passenger/booking'], {
      queryParams: { flightId: this.flightId, seatIds }
    });
  }

  get bookingReturnUrl(): string {
    if (!this.selectedSeats.length) return '/passenger/flights';

    return this.router.createUrlTree(['/passenger/booking'], {
      queryParams: { flightId: this.flightId, seatIds: this.selectedSeatQuery }
    }).toString();
  }

  private loadFlight(): void {
    if (!this.flightId) return;

    this.flightService.getFlightById(this.flightId).subscribe({
      next: flight => {
        this.flight = flight;
      }
    });
  }

  private restoreSelectionFromQuery(params: Params): void {
    const seatIds = this.parseSeatIds(params);
    if (!seatIds.length) return;

    this.selectedSeats = seatIds.map(seatId => ({
      seatId,
      flightId: this.flightId,
      seatNumber: '',
      seatClass: 'ECONOMY',
      status: 'AVAILABLE',
      priceMultiplier: 1,
    }));
  }

  private reconcileSelectedSeats(): void {
    if (!this.selectedSeats.length) return;

    const selectedIds = this.selectedSeats.map(seat => seat.seatId);
    this.selectedSeats = selectedIds
      .map(seatId => this.seats.find(seat => seat.seatId === seatId))
      .filter((seat): seat is Seat => Boolean(seat));
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
