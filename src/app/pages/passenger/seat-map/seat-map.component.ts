import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  selectedSeat: Seat | null = null;
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
    this.seatService.getSeatMap(this.flightId).subscribe({
      next: data => { this.seats = data.map(seat => this.normalizeSeat(seat)); this.buildGrid(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get seatMapTitle(): string {
    return this.flight?.flightNumber || this.flightId;
  }

  get seatMapSubtitle(): string {
    if (!this.flight) return 'Choose an available seat for this flight.';
    return `${this.flight.originAirportCode} to ${this.flight.destinationAirportCode}`;
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
    this.selectedSeat = seat;
    this.toast.info(`Seat ${seat.seatNumber} (${seat.seatClass}) selected`);
  }

  getSeatVisualClass(seat: Seat | null): string {
    if (!seat) return 'seat-shell seat-empty';

    const classes = ['seat-shell'];
    if (this.selectedSeat?.seatId === seat.seatId) {
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
    return `${this.getSeatPosition(seat)}  ${seat.seatClass}  ${seat.status}`;
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
    if (!this.selectedSeat) { this.toast.warning('Please select a seat to continue.'); return; }

    if (!this.auth.isLoggedIn()) {
      const returnUrl = this.router.createUrlTree(['/passenger/booking'], {
        queryParams: { flightId: this.flightId, seatId: this.selectedSeat.seatId }
      }).toString();

      this.toast.info('Please sign in or create an account to book this seat.');
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    this.router.navigate(['/passenger/booking'], {
      queryParams: { flightId: this.flightId, seatId: this.selectedSeat.seatId }
    });
  }

  get bookingReturnUrl(): string {
    if (!this.selectedSeat) return '/passenger/flights';

    return this.router.createUrlTree(['/passenger/booking'], {
      queryParams: { flightId: this.flightId, seatId: this.selectedSeat.seatId }
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
